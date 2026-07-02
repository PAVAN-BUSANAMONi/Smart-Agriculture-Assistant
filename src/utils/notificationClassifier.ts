export type NotificationType = 'weather' | 'disease' | 'crop' | 'lifecycle' | 'market' | 'system';
export type NotificationLevel = 'low' | 'medium' | 'high';
export type NotificationMetadata = Record<string, unknown>;

export type NotificationClassifierInput = {
  type: NotificationType;
  level: NotificationLevel;
  title?: string;
  message: string;
  source?: string;
  metadata?: NotificationMetadata;
};

export type NotificationVisualKind =
  | 'weather'
  | 'crop'
  | 'soil'
  | 'market'
  | 'pest'
  | 'disease'
  | 'system';

const SOIL_UPDATE_PATTERN = /\b(soil update|soil report|soil health|soil probe|npk|nitrogen levels?|phosphorus levels?|potassium levels?)\b/i;
const SOIL_HINT_PATTERN = /\b(soil|npk|nitrogen|phosphorus|potassium|fertility|top-dressing|micronutrient)\b/i;
const WEATHER_PATTERN = /\b(rain|storm|irrigation|heat|temperature|forecast|wind|humidity|weather)\b/i;
const MARKET_PATTERN = /\b(market|mandi|price|buyer|procurement|demand|trend)\b/i;
const PEST_PATTERN = /\b(pest|aphid|borer|worm|hopper|weevil|beetle|insect|armyworm|thrips|scouting)\b/i;
const CROP_PATTERN = /\b(crop|sowing|harvest|nutrient|field|stage|growth|recommendation)\b/i;

const SYSTEM_SOURCE_MARKERS = ['admin_', 'admin-', 'farmer-', 'profile', 'system', 'web-app'];
const WEATHER_SOURCE_MARKERS = ['weather'];
const MARKET_SOURCE_MARKERS = ['market', 'mandi'];
const DISEASE_SOURCE_MARKERS = ['disease'];
const LIFECYCLE_SOURCE_MARKERS = ['lifecycle'];
const PERSONALIZED_SOURCE_MARKERS = ['personalized'];

function normalizeText(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function hasSourceMarker(source: string, markers: string[]) {
  return markers.some((marker) => source.includes(marker));
}

function isExplicitSoilUpdate(title: string, message: string, source: string) {
  return (
    SOIL_UPDATE_PATTERN.test(title)
    || SOIL_UPDATE_PATTERN.test(message)
    || source.includes('soil')
  );
}

export function getNotificationVisualKind(input: NotificationClassifierInput): NotificationVisualKind {
  const source = normalizeText(input.source);
  const title = normalizeText(input.title);
  const message = normalizeText(input.message);
  const text = `${title} ${message}`.trim();
  const isAiAssistant = source.includes('ai-assistant');

  if ((input.type === 'system' && !isAiAssistant) || hasSourceMarker(source, SYSTEM_SOURCE_MARKERS)) {
    return 'system';
  }

  if (input.type === 'weather' || hasSourceMarker(source, WEATHER_SOURCE_MARKERS)) {
    return 'weather';
  }

  if (input.type === 'market' || hasSourceMarker(source, MARKET_SOURCE_MARKERS)) {
    return 'market';
  }

  if (input.type === 'disease' || hasSourceMarker(source, DISEASE_SOURCE_MARKERS)) {
    return input.level === 'high' || PEST_PATTERN.test(text) ? 'pest' : 'disease';
  }

  if (isExplicitSoilUpdate(title, message, source)) {
    return 'soil';
  }

  if (input.type === 'lifecycle' || hasSourceMarker(source, LIFECYCLE_SOURCE_MARKERS)) {
    return PEST_PATTERN.test(text) ? 'pest' : 'crop';
  }

  if (input.type === 'crop' || hasSourceMarker(source, PERSONALIZED_SOURCE_MARKERS)) {
    return 'crop';
  }

  if (MARKET_PATTERN.test(text)) {
    return 'market';
  }

  if (WEATHER_PATTERN.test(text)) {
    return 'weather';
  }

  if (PEST_PATTERN.test(text)) {
    return input.level === 'high' ? 'pest' : 'disease';
  }

  if (SOIL_HINT_PATTERN.test(text) || CROP_PATTERN.test(text)) {
    return 'crop';
  }

  return 'system';
}

export function getNotificationTargetPath(input: NotificationClassifierInput) {
  const kind = getNotificationVisualKind(input);

  if (kind === 'weather') return '/weather';
  if (kind === 'market') return '/market-prices';
  if (kind === 'soil') return '/fertilizer-calc';
  if (kind === 'pest' || kind === 'disease') return '/disease-detect';
  if (kind === 'crop') return '/crop-recommend';
  return '/dashboard';
}
