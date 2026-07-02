import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ALERTS_STREAM_URL, BACKEND_ORIGIN } from '../config/backend';
import { api } from '../services/api';
import { createAlert, readAlerts } from '../utils/alertEngine';
import { getNotificationToolLabel, pushBrowserNotification, resolveNotificationTool } from '../utils/browserNotifications';
import type { NotificationLevel, NotificationMetadata, NotificationType } from '../utils/notificationClassifier';
import { getNotificationTargetPath } from '../utils/notificationClassifier';
import { useAuth } from './AuthContext';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  level: NotificationLevel;
  title: string;
  message: string;
  source?: string;
  metadata?: NotificationMetadata;
  read: boolean;
  createdAt: string;
};

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const NOTIFIED_IDS_KEY = 'notifiedAlertIds';

function getNotifiedIds() {
  try {
    const raw = localStorage.getItem(NOTIFIED_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveNotifiedIds(ids: string[]) {
  localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(ids.slice(0, 300)));
}

function browserNotify(alert: NotificationItem) {
  void pushBrowserNotification({
    type: alert.type,
    level: alert.level,
    title: alert.title,
    message: alert.message,
    createdAt: alert.createdAt,
    path: getNotificationTargetPath(alert),
    source: alert.source,
    metadata: alert.metadata,
  });
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const notifiedIdsRef = useRef<string[]>(getNotifiedIds());

  const syncFromFallback = () => {
    const localAlerts = readAlerts().slice(0, 80).map((item) => ({
      id: item.id,
      type: item.type,
      level: item.level,
      title: `${getNotificationToolLabel(resolveNotificationTool({
        type: item.type,
        level: item.level,
        title: '',
        message: item.message,
        source: 'local-fallback',
        metadata: {},
      }))} Update`,
      message: item.message,
      source: 'local-fallback',
      metadata: {},
      read: false,
      createdAt: item.createdAt,
    }));
    setNotifications(localAlerts);
  };

  const refreshNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      // Trigger one scheduler cycle so lifecycle/weather reminders keep flowing.
      await api.triggerAlertScheduleTick();
    } catch {
      // Optional call, continue loading existing alerts.
    }

    try {
      const response = await api.getAlerts();
      const incoming: NotificationItem[] = response.alerts.map((item) => ({
        id: item.id,
        type: item.type,
        level: item.level,
        title: item.title,
        message: item.message,
        source: item.source,
        metadata: item.metadata,
        read: item.read,
        createdAt: item.createdAt,
      }));

      setNotifications(incoming);

      const newCritical = incoming.filter(
        (item) => !item.read && item.level !== 'low' && !notifiedIdsRef.current.includes(item.id),
      );

      if (newCritical.length) {
        newCritical.slice(0, 2).forEach((item) => {
          browserNotify(item);
          createAlert({ type: item.type, level: item.level, message: item.message });
        });

        notifiedIdsRef.current = [...newCritical.map((item) => item.id), ...notifiedIdsRef.current].slice(0, 300);
        saveNotifiedIds(notifiedIdsRef.current);
      }
    } catch {
      // API unavailable in offline deployments; keep local alerts visible.
      syncFromFallback();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return undefined;
    }

    void refreshNotifications();
    const id = window.setInterval(() => {
      void refreshNotifications();
    }, 90 * 1000);

    return () => window.clearInterval(id);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let socket: Socket | null = null;
    try {
      socket = io(BACKEND_ORIGIN || '/', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socket.on('notification', () => {
        void refreshNotifications();
      });
    } catch {
      socket = null;
    }

    const stream = new EventSource(`${ALERTS_STREAM_URL}?token=${encodeURIComponent(token)}`);

    const handleAlert = () => {
      void refreshNotifications();
    };

    stream.addEventListener('alert', handleAlert);
    stream.onerror = () => {
      // Polling remains active as a fallback when the event stream drops.
    };

    return () => {
      stream.removeEventListener('alert', handleAlert);
      stream.close();
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, isAuthenticated]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    try {
      await api.markAlertRead(id);
    } catch {
      // Keep optimistic read state in low-network environments.
    }
  };

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, markAsRead, refreshNotifications }),
    [notifications, unreadCount, loading],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return context;
}
