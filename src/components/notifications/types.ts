import type {
  NotificationLevel,
  NotificationMetadata,
  NotificationType,
  NotificationVisualKind,
} from '../../utils/notificationClassifier';

export type { NotificationLevel, NotificationMetadata, NotificationType, NotificationVisualKind } from '../../utils/notificationClassifier';

export type NotificationCardItem = {
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

export type NotificationCardProps = {
  item: NotificationCardItem;
  onOpen?: () => void;
  onDismiss?: () => void;
  onRead?: () => void;
};
