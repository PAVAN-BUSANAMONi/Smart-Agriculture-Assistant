import {
  getNotificationVisualKind,
  type NotificationClassifierInput,
  type NotificationLevel as BrowserNotificationLevel,
  type NotificationType as BrowserNotificationType,
  type NotificationVisualKind,
} from './notificationClassifier';

export type NotificationToolKey =
  | 'weatherWise'
  | 'cropTrak'
  | 'soilProbeMax'
  | 'marketMate'
  | 'pestAlert'
  | 'cropDoctor'
  | 'farmDesk';

type NotificationInput = {
  type: BrowserNotificationType;
  level: BrowserNotificationLevel;
  title?: string;
  message: string;
  createdAt?: string;
  path?: string;
  tag?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

type NotificationPayload = {
  title: string;
  body: string;
  tool: NotificationToolKey;
  options: NotificationOptions;
};

export const APP_DISPLAY_NAME = 'AgriField Tools';
export const APP_SHORT_NAME = 'FieldKit';
export const NOTIFICATION_ICON = '/images/agri-tools-mark.svg';

const TOOL_DETAILS: Record<NotificationToolKey, { label: string; headline: string; icon: string }> = {
  weatherWise: {
    label: 'WeatherWise',
    headline: 'WATER ALERT',
    icon: '/images/notifications/weather-wise.svg',
  },
  cropTrak: {
    label: 'CropTrak',
    headline: 'Crop reminder',
    icon: '/images/notifications/crop-trak.svg',
  },
  soilProbeMax: {
    label: 'SoilProbe Max',
    headline: 'SOIL UPDATE',
    icon: '/images/notifications/soil-probe-max.svg',
  },
  marketMate: {
    label: 'MarketMate',
    headline: 'MARKET INSIGHT',
    icon: '/images/notifications/market-mate.svg',
  },
  pestAlert: {
    label: 'PestAlert',
    headline: 'URGENT',
    icon: '/images/notifications/pest-alert.svg',
  },
  cropDoctor: {
    label: 'Crop Doctor',
    headline: 'Disease detection',
    icon: '/images/notifications/crop-doctor.svg',
  },
  farmDesk: {
    label: 'Farm Desk',
    headline: 'System notice',
    icon: '/images/notifications/farm-desk.svg',
  },
};

const VISUAL_KIND_TO_TOOL: Record<NotificationVisualKind, NotificationToolKey> = {
  weather: 'weatherWise',
  disease: 'cropDoctor',
  pest: 'pestAlert',
  crop: 'cropTrak',
  soil: 'soilProbeMax',
  market: 'marketMate',
  system: 'farmDesk',
};

const LEVEL_LABELS: Record<NotificationVisualKind, Record<BrowserNotificationLevel, string>> = {
  weather: {
    low: 'Weather note',
    medium: 'Weather advisory',
    high: 'High weather alert',
  },
  crop: {
    low: 'Crop note',
    medium: 'Crop reminder',
    high: 'Priority crop reminder',
  },
  soil: {
    low: 'Soil note',
    medium: 'Soil update',
    high: 'Priority soil update',
  },
  market: {
    low: 'Market note',
    medium: 'Market insight',
    high: 'Priority market insight',
  },
  pest: {
    low: 'Pest watch',
    medium: 'Pest alert',
    high: 'Urgent pest alert',
  },
  disease: {
    low: 'Plant health note',
    medium: 'Disease alert',
    high: 'High disease alert',
  },
  system: {
    low: 'System note',
    medium: 'System update',
    high: 'Important system update',
  },
};

const WEATHER_TEXT_PATTERN = /\b(rain|storm|irrigation|heat|temperature|forecast|wind|humidity|weather)\b/i;
const DISEASE_TEXT_PATTERN = /\b(disease|pest|blight|mildew|fungus|infection|scouting|aphid|thrips)\b/i;
const MARKET_TEXT_PATTERN = /\b(market|price|mandi|buyer|procurement|demand|trend)\b/i;
const SOIL_TEXT_PATTERN = /\b(soil|npk|nitrogen|phosphorus|potassium|top-dressing)\b/i;
const CROP_TEXT_PATTERN = /\b(crop|sowing|harvest|nutrient|field|recommendation|stage|growth)\b/i;
const GENERIC_HEADLINE_PATTERN = /^(today farming alert|smart agriculture alert|notification|field alert)$/i;

function compactText(value?: string, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function resolveNotificationTool(input: Pick<NotificationInput, 'type' | 'level' | 'title' | 'message' | 'source' | 'metadata'>) {
  const kind = getNotificationVisualKind(input as NotificationClassifierInput);
  return VISUAL_KIND_TO_TOOL[kind];
}

function inferTypeFromText(title: string, message: string): BrowserNotificationType {
  const text = `${compactText(title)} ${compactText(message)}`.trim();

  if (WEATHER_TEXT_PATTERN.test(text)) return 'weather';
  if (MARKET_TEXT_PATTERN.test(text)) return 'market';
  if (DISEASE_TEXT_PATTERN.test(text)) return 'disease';
  if (SOIL_TEXT_PATTERN.test(text) || CROP_TEXT_PATTERN.test(text)) return 'crop';
  return 'system';
}

export function getNotificationToolLabel(tool: NotificationToolKey) {
  return TOOL_DETAILS[tool].label;
}

export function formatNotificationTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function formatBrowserNotification(input: NotificationInput): NotificationPayload {
  const kind = getNotificationVisualKind(input as NotificationClassifierInput);
  const tool = resolveNotificationTool(input);
  const toolMeta = TOOL_DETAILS[tool];
  const requestedHeadline = compactText(input.title);
  const headline = !requestedHeadline || GENERIC_HEADLINE_PATTERN.test(requestedHeadline)
    ? toolMeta.headline
    : requestedHeadline;
  const lead = LEVEL_LABELS[kind][input.level];
  const body = trimText(`${lead}. ${compactText(input.message)}`, 180);
  const title = trimText(`${toolMeta.label} | ${headline}`, 68);

  return {
    title,
    body,
    tool,
    options: {
      body,
      icon: toolMeta.icon || NOTIFICATION_ICON,
      badge: toolMeta.icon || NOTIFICATION_ICON,
      tag: input.tag || `agri-${tool}-${input.type}`,
      renotify: input.level === 'high',
      requireInteraction: input.level === 'high',
      timestamp: input.createdAt ? new Date(input.createdAt).getTime() : Date.now(),
      data: {
        path: input.path || '/dashboard',
        tool,
        kind,
      },
    },
  };
}

async function deliverNotification(input: NotificationInput) {
  const payload = formatBrowserNotification(input);

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(payload.title, payload.options);
      return true;
    }
  }

  const notification = new Notification(payload.title, payload.options);
  notification.onclick = () => {
    window.focus();
    if (payload.options.data?.path) {
      window.location.assign(String(payload.options.data.path));
    }
    notification.close();
  };
  return true;
}

function normalizeNotificationInput(
  input: NotificationInput | string,
  maybeMessage?: string,
): NotificationInput {
  if (typeof input === 'string') {
    const message = compactText(maybeMessage || input);
    return {
      type: inferTypeFromText(input, message),
      level: 'medium',
      title: input,
      message,
      path: '/dashboard',
      source: 'legacy-browser-notification',
    };
  }

  return input;
}

export async function pushBrowserNotification(input: NotificationInput | string, maybeMessage?: string) {
  if (!('Notification' in window)) {
    return false;
  }

  const normalized = normalizeNotificationInput(input, maybeMessage);

  if (Notification.permission === 'granted') {
    return deliverNotification(normalized);
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    return deliverNotification(normalized);
  }

  return false;
}
