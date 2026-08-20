import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  LocateFixed,
  Thermometer,
  Wind,
  BotMessageSquare,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api, WeatherDecisionResponse } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { createAlert, shouldTriggerAlert } from '../utils/alertEngine';
import { pushBrowserNotification } from '../utils/browserNotifications';

type CachedWeather = WeatherDecisionResponse;
type WeatherCoordinates = {
  latitude: number;
  longitude: number;
};

const CACHE_KEY = 'weatherDecisionCacheV2';
const WEATHER_COORDS_CACHE_KEY = 'weatherCoordsCacheV1';
const DEFAULT_WEATHER_COORDS: WeatherCoordinates = {
  latitude: 17.385,
  longitude: 78.4867,
};

const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Dense Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Violent Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

function getProfileCrop(): string {
  try {
    const raw = localStorage.getItem('farmerProfile');
    if (!raw) return '';
    const profile = JSON.parse(raw) as { crops?: string };
    if (!profile.crops) return '';
    return profile.crops.split(',')[0]?.trim() || '';
  } catch {
    return '';
  }
}

function readCachedCoordinates(): WeatherCoordinates | null {
  try {
    const raw = localStorage.getItem(WEATHER_COORDS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<WeatherCoordinates>;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') {
      return null;
    }

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
  } catch {
    return null;
  }
}

function saveCachedCoordinates(coords: WeatherCoordinates) {
  localStorage.setItem(WEATHER_COORDS_CACHE_KEY, JSON.stringify(coords));
}

async function resolveWeatherCoordinates() {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    const cached = readCachedCoordinates();
    if (cached) {
      return {
        coords: cached,
        warning: 'Live location is unavailable on this device. Using your last saved weather location.',
      };
    }

    return {
      coords: DEFAULT_WEATHER_COORDS,
      warning: 'Live location is unavailable on this device. Using the default weather region.',
    };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 600000,
      });
    });

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    saveCachedCoordinates(coords);

    return { coords, warning: '' };
  } catch {
    const cached = readCachedCoordinates();
    if (cached) {
      return {
        coords: cached,
        warning: 'Live location access is blocked. Using your last saved weather location.',
      };
    }

    return {
      coords: DEFAULT_WEATHER_COORDS,
      warning: window.isSecureContext
        ? 'Live location access is blocked. Using the default weather region.'
        : 'This network URL is not secure for geolocation. Using the default weather region instead.',
    };
  }
}

function buildLocalDecision(args: {
  city: string;
  latitude: number;
  longitude: number;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKmph: number;
  weatherCode: number;
  rainChance24h: number;
  rainMm24h: number;
  rainMm7d: number;
  maxTemp: number;
  minTemp: number;
  crop: string;
}): WeatherDecisionResponse {
  const alerts: WeatherDecisionResponse['decisions']['alerts'] = [];
  const actions: string[] = [];

  let irrigationRecommendation: WeatherDecisionResponse['decisions']['irrigationRecommendation'] = {
    status: 'normal',
    message: 'Maintain your regular irrigation schedule. Verify field moisture before each cycle.',
  };

  if (args.rainChance24h >= 70 || args.rainMm24h >= 12) {
    irrigationRecommendation = {
      status: 'hold',
      message: 'Hold irrigation today. Rain chance is high and waterlogging risk is elevated.',
    };
    alerts.push({
      type: 'weather',
      level: 'high',
      title: 'High Rain Advisory',
      message: 'Avoid irrigation and open drainage channels in low-lying plots.',
    });
    actions.push('Skip irrigation for the next 24 hours.');
    actions.push('Clear drainage channels to prevent root-zone waterlogging.');
  } else if (args.rainChance24h <= 25 && args.tempC >= 33) {
    irrigationRecommendation = {
      status: 'increase',
      message: 'Low rain forecast with warm weather. Shift to split irrigation in cool hours.',
    };
    actions.push('Use early-morning and evening irrigation to reduce evaporation losses.');
  }

  let heatAlert: WeatherDecisionResponse['decisions']['heatAlert'] = null;
  if (args.tempC >= 38 || args.feelsLikeC >= 40) {
    heatAlert = {
      severity: args.tempC >= 41 ? 'high' : 'medium',
      message: 'Heat stress risk for crop canopy and root-zone moisture.',
      protectionTips: [
        'Apply organic mulch to reduce water loss.',
        'Avoid foliar spray during noon hours.',
        'Use short cooling irrigation in the morning where possible.',
      ],
    };
    alerts.push({
      type: 'weather',
      level: heatAlert.severity,
      title: 'Heat Stress Advisory',
      message: heatAlert.message,
    });
    actions.push('Protect crop from heat stress with mulch and cool-hour irrigation.');
  }

  let sowingWindow: WeatherDecisionResponse['decisions']['sowingWindow'] = {
    status: 'watch',
    message: 'Wait and monitor 3-day weather before new sowing.',
    bestDays: [],
  };

  if (args.rainChance24h >= 45 && args.rainChance24h <= 70 && args.tempC >= 22 && args.tempC <= 34) {
    sowingWindow = {
      status: 'good',
      message: 'Sowing window is favorable for the coming 2-4 days.',
      bestDays: ['Day 2', 'Day 3', 'Day 4'],
    };
  } else if (args.rainChance24h > 80 || args.tempC > 39) {
    sowingWindow = {
      status: 'poor',
      message: 'Avoid fresh sowing now due to weather stress.',
      bestDays: [],
    };
    actions.push('Postpone sowing and re-check forecast after 48 hours.');
  }

  if (args.crop.toLowerCase().includes('rice')) {
    actions.push('Rice fields: maintain inlet-outlet channels for rainwater control.');
  }
  if (args.crop.toLowerCase().includes('cotton')) {
    actions.push('Cotton: avoid spray if wind speed remains above 25 km/h.');
  }
  if (!args.crop) {
    actions.push('Set your primary crop in profile for crop-specific weather advisories.');
  }

  if (!actions.length) {
    actions.push('No major risk today. Continue your planned field operations.');
  }

  return {
    city: args.city,
    latitude: args.latitude,
    longitude: args.longitude,
    current: {
      tempC: args.tempC,
      feelsLikeC: args.feelsLikeC,
      humidity: args.humidity,
      windKmph: args.windKmph,
      weatherCode: args.weatherCode,
      weatherLabel: WEATHER_CODE_MAP[args.weatherCode] || 'Weather',
    },
    forecast: {
      rainChance24h: args.rainChance24h,
      rainMm24h: args.rainMm24h,
      rainMm7d: args.rainMm7d,
      maxTemp: args.maxTemp,
      minTemp: args.minTemp,
    },
    decisions: {
      irrigationRecommendation,
      heatAlert,
      sowingWindow,
      todayActions: [...new Set(actions)].slice(0, 8),
      alerts,
    },
    fetchedAt: new Date().toISOString(),
    source: 'direct-fallback',
  };
}

async function getLocationName(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    );
    if (!response.ok) return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    const data = await response.json();
    const address = data?.address || {};
    return (
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
    );
  } catch {
    return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  }
}

async function fallbackWeatherDecision(latitude: number, longitude: number, crop: string) {
  const city = await getLocationName(latitude, longitude);
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=precipitation_probability,precipitation&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
  const response = await fetch(weatherUrl);

  if (!response.ok) {
    throw new Error('Unable to fetch fallback weather data.');
  }

  const payload = await response.json();
  const current = payload.current;
  const hourlyTimes: string[] = payload.hourly?.time || [];
  const hourlyChance: number[] = payload.hourly?.precipitation_probability || [];
  const hourlyMm: number[] = payload.hourly?.precipitation || [];
  const nowIndex = Math.max(0, hourlyTimes.indexOf(current?.time));
  const chance24 = hourlyChance.slice(nowIndex, nowIndex + 24);
  const mm24 = hourlyMm.slice(nowIndex, nowIndex + 24);

  return buildLocalDecision({
    city,
    latitude,
    longitude,
    tempC: Math.round(Number(current.temperature_2m || 0)),
    feelsLikeC: Math.round(Number(current.apparent_temperature || 0)),
    humidity: Math.round(Number(current.relative_humidity_2m || 0)),
    windKmph: Math.round(Number(current.wind_speed_10m || 0)),
    weatherCode: Number(current.weather_code || 0),
    rainChance24h: Math.round(chance24.length ? Math.max(...chance24) : 0),
    rainMm24h: Math.round(mm24.reduce((sum, item) => sum + Number(item || 0), 0) * 10) / 10,
    rainMm7d: Math.round(hourlyMm.slice(0, 24 * 7).reduce((sum, item) => sum + Number(item || 0), 0) * 10) / 10,
    maxTemp: Math.round(Number(payload.daily?.temperature_2m_max?.[0] || current.temperature_2m || 0)),
    minTemp: Math.round(Number(payload.daily?.temperature_2m_min?.[0] || current.temperature_2m || 0)),
    crop,
  });
}

export function Weather() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<WeatherDecisionResponse | null>(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiAdviceLoading, setAiAdviceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [detailedView, setDetailedView] = useState(false);
  const [webhookInput, setWebhookInput] = useState(localStorage.getItem('managerWebhookUrl') || '');
  const lastNotificationRef = useRef('');

  const crop = useMemo(() => getProfileCrop(), []);

  const requestAiAdvice = async (decision: WeatherDecisionResponse) => {
    setAiAdviceLoading(true);
    try {
      const response = await api.askAi({
        query: 'Give concise farming actions for the next 24 hours using current weather conditions.',
        lat: decision.latitude,
        lng: decision.longitude,
        crop: crop || undefined,
      });
      setAiAdvice(response.answer);
    } catch {
      setAiAdvice('');
    } finally {
      setAiAdviceLoading(false);
    }
  };

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const forwardToManager = async (message: string) => {
      const managerWebhookUrl = localStorage.getItem('managerWebhookUrl');
      if (!managerWebhookUrl) return;

      try {
        await fetch(managerWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'weather',
            title: 'Smart Agriculture Alert',
            body: message,
            time: new Date().toISOString(),
          }),
        });
      } catch {
        // Best-effort forwarding for low-connectivity deployments.
      }
    };

    const syncAndNotifyAlerts = async (decision: WeatherDecisionResponse) => {
      const alertText = decision.decisions.alerts.map((item) => `${item.title}: ${item.message}`).join(' | ');
      if (!alertText) return;

      const signature = `${decision.city}-${alertText}`;
      if (lastNotificationRef.current === signature) return;
      lastNotificationRef.current = signature;

      const aggregateLevel = decision.decisions.alerts.some((item) => item.level === 'high')
        ? 'high'
        : decision.decisions.alerts.some((item) => item.level === 'medium')
        ? 'medium'
        : 'low';
      const signatureKey = `weather-${decision.city}-${aggregateLevel}-${Math.round(decision.forecast.rainChance24h / 10)}-${Math.round(
        decision.current.tempC / 2,
      )}`;

      if (shouldTriggerAlert(signatureKey, aggregateLevel)) {
        pushBrowserNotification(
          language === 'te' ? 'ఈరోజు వ్యవసాయ అలర్ట్' : 'Today Farming Alert',
          `${decision.city}: ${alertText}`,
        );
      }

      decision.decisions.alerts.forEach((item) => {
        const itemSignature = `weather-${decision.city}-${item.title}-${Math.round(decision.forecast.rainChance24h / 10)}-${Math.round(
          decision.current.tempC / 2,
        )}`;
        if (shouldTriggerAlert(itemSignature, item.level)) {
          createAlert({
            type: 'weather',
            level: item.level,
            message: `${decision.city}: ${item.message}`,
          });
        }
      });

      await Promise.allSettled([
        ...decision.decisions.alerts.map((item) => {
          const fingerprint = `weather-${decision.city}-${item.title}-${Math.round(decision.forecast.rainChance24h / 10)}-${Math.round(
            decision.current.tempC / 2,
          )}`;
          return api.ingestAlert({
            type: 'weather',
            level: item.level,
            title: item.title,
            message: `${decision.city}: ${item.message}`,
            source: 'web-farmer-weather',
            metadata: {
              rainChance24h: decision.forecast.rainChance24h,
              tempC: decision.current.tempC,
              crop,
              fingerprint,
            },
          });
        }),
        forwardToManager(`${decision.city}: ${alertText}`),
      ]);
    };

    const load = async () => {
      setLoading(true);
      setNotice('');
      setError('');

      try {
        const { coords, warning } = await resolveWeatherCoordinates();
        const { latitude, longitude } = coords;
        let result: WeatherDecisionResponse;
        let nextNotice = warning;

        try {
          result = await api.getWeatherDecision(latitude, longitude, crop);
        } catch {
          result = await fallbackWeatherDecision(latitude, longitude, crop);
          nextNotice = [nextNotice, 'Backend unavailable. Using direct weather fallback.'].filter(Boolean).join(' ');
          setError(language === 'te' ? 'బ్యాక్‌ఎండ్ అందుబాటులో లేదు. ప్రత్యక్ష వాతావరణ డేటాతో కొనసాగిస్తోంది.' : 'Backend unavailable. Using direct weather fallback.');
        }

        setData(result);
        setError('');
        if (nextNotice) {
          setNotice(nextNotice);
        }
        void requestAiAdvice(result);
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
        await syncAndNotifyAlerts(result);
      } catch {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedDecision = JSON.parse(cached) as CachedWeather;
          setData(cachedDecision);
          setError(language === 'te' ? 'ఆఫ్‌లైన్ మోడ్: చివరిసారి సేవ్ అయిన డేటా చూపిస్తున్నారు.' : 'Offline mode: showing last synced weather decision.');
        } else {
          setError(t('weather_load_error'));
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [crop, language, t]);

  if (loading) {
    return (
      <div
        className="relative -m-4 md:-m-6 lg:-m-8 p-6 md:p-10 min-h-[calc(100vh-4rem)] flex items-center justify-center text-white rounded-2xl overflow-hidden font-sans"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(4,16,24,0.28) 0%, rgba(4,16,24,0.14) 50%, rgba(4,16,24,0.04) 100%), radial-gradient(ellipse at 30% 40%, rgba(6,26,35,0.30) 0%, rgba(4,15,22,0.72) 100%), url('/assets/storm-background.jpg')`,
          backgroundPosition: 'center 25%',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
        }}
      >
        <div className="aurora-glass-medium p-8 rounded-[26px] flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-8 h-8 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
          <p className="text-white/90 text-sm font-medium tracking-wide">{t('analyzing')}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="relative -m-4 md:-m-6 lg:-m-8 p-6 md:p-10 min-h-[calc(100vh-4rem)] flex items-center justify-center text-white rounded-2xl overflow-hidden font-sans"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(4,16,24,0.28) 0%, rgba(4,16,24,0.14) 50%, rgba(4,16,24,0.04) 100%), radial-gradient(ellipse at 30% 40%, rgba(6,26,35,0.30) 0%, rgba(4,15,22,0.72) 100%), url('/assets/storm-background.jpg')`,
          backgroundPosition: 'center 25%',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
        }}
      >
        <div className="aurora-glass-medium p-8 rounded-[26px] text-center max-w-md space-y-3">
          <AlertCircle size={32} className="mx-auto text-rose-300" />
          <h3 className="text-lg font-semibold text-white">Weather Data Unavailable</h3>
          <p className="text-sm text-white/75">{error || t('weather_load_error')}</p>
        </div>
      </div>
    );
  }

  const weatherLabel = data.current.weatherLabel || WEATHER_CODE_MAP[data.current.weatherCode] || 'Weather';

  return (
    <div
      className="relative -m-4 md:-m-6 lg:-m-8 p-4 md:p-8 lg:p-10 min-h-[calc(100vh-4rem)] bg-no-repeat bg-cover text-white rounded-2xl overflow-hidden font-sans"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(4,16,24,0.28) 0%, rgba(4,16,24,0.14) 50%, rgba(4,16,24,0.04) 100%), radial-gradient(ellipse at 30% 40%, rgba(6,26,35,0.30) 0%, rgba(4,15,22,0.72) 100%), url('/assets/storm-background.jpg')`,
        backgroundPosition: 'center 25%',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      <div className="relative z-10 mx-auto max-w-6xl space-y-8 animate-fade-in">
        {/* ═══ Header Action Row ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <div className="aurora-glass-pill mb-1.5">
              <span>Agri-Weather Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight">
              {t('weather_forecast')}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setDetailedView((prev) => !prev)}
            className="aurora-glass-button text-xs sm:text-sm font-medium"
          >
            <Layers size={15} />
            <span>
              {detailedView
                ? language === 'te'
                  ? 'సరళ దృశ్యం'
                  : 'Simple View'
                : language === 'te'
                ? 'వివర దృశ్యం'
                : 'Detailed View'}
            </span>
          </button>
        </div>

        {/* ═══ Status Banners (Offline / Notice / Error) ═══ */}
        {isOffline && (
          <div className="aurora-card p-4 flex items-center gap-3 border-amber-300/30 bg-amber-400/15 text-amber-100 text-sm">
            <AlertCircle size={18} className="shrink-0 text-amber-300" />
            <span>
              {language === 'te'
                ? 'ఆఫ్‌లైన్ మోడ్ అందుబాటులో ఉంది. చివరిసారి సింక్ అయిన డేటా ఉపయోగించబడుతుంది.'
                : 'Offline mode enabled. Last synced advisory is used in low-network areas.'}
            </span>
          </div>
        )}

        {notice && (
          <div className="aurora-card p-4 flex items-center gap-3 border-teal-300/30 bg-teal-400/15 text-teal-100 text-sm">
            <Activity size={18} className="shrink-0 text-teal-300" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="aurora-card p-4 flex items-center gap-3 border-amber-300/30 bg-amber-400/15 text-amber-100 text-sm">
            <AlertTriangle size={18} className="shrink-0 text-amber-300" />
            <span>{error}</span>
          </div>
        )}

        {/* ═══ Main Weather Hero & Action Plan Grid ═══ */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          {/* Main Current Weather Glass Card (Strongest glass tier) */}
          <div className="lg:col-span-6 flex">
            <div className="aurora-glass-strong w-full p-7 md:p-8 flex flex-col justify-between relative overflow-hidden">
              <div>
                {/* Location header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white/85 text-[15px] font-medium tracking-wide">
                    <MapPin size={16} className="text-emerald-300 shrink-0" />
                    <span className="truncate max-w-[240px]">
                      {data.city} ({data.latitude.toFixed(2)}, {data.longitude.toFixed(2)})
                    </span>
                  </div>
                  <span className="text-xs text-white/50 tracking-tight">
                    {new Date(data.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Condition label */}
                <p className="text-lg text-white/80 font-medium tracking-normal mb-1">{weatherLabel}</p>

                {/* Big Temperature */}
                <div className="my-3 flex items-baseline font-medium tracking-tight text-white drop-shadow-md leading-none">
                  <span className="text-6xl sm:text-7xl lg:text-[84px] tracking-tighter">{data.current.tempC}</span>
                  <span className="text-4xl sm:text-5xl font-light ml-1 opacity-90">°</span>
                  <span className="text-3xl sm:text-4xl font-light ml-1.5 opacity-75">C</span>
                </div>

                <p className="text-xs sm:text-sm text-white/70">
                  {t('feels_like')}: {data.current.feelsLikeC}°C &bull; Min: {data.forecast.minTemp}°C / Max: {data.forecast.maxTemp}°C
                </p>
              </div>

              {/* 4 Weather Metrics Bar */}
              <div className="mt-8 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="aurora-glass-light p-2.5 rounded-xl flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-[12px] text-white/65">
                    <Thermometer size={13} className="text-amber-200 opacity-80" />
                    <span>{t('humidity')}</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white/95">{data.current.humidity}%</span>
                </div>

                <div className="aurora-glass-light p-2.5 rounded-xl flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-[12px] text-white/65">
                    <Wind size={13} className="text-cyan-200 opacity-80" />
                    <span>{t('wind_speed')}</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white/95">{data.current.windKmph} km/h</span>
                </div>

                <div className="aurora-glass-light p-2.5 rounded-xl flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-[12px] text-white/65">
                    <CloudRain size={13} className="text-sky-200 opacity-80" />
                    <span>{t('rain_chance')}</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white/95">{data.forecast.rainChance24h}%</span>
                </div>

                <div className="aurora-glass-light p-2.5 rounded-xl flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-[12px] text-white/65">
                    <Droplets size={13} className="text-blue-200 opacity-80" />
                    <span>Rain (24h)</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white/95">{data.forecast.rainMm24h} mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Checklist / What To Do Today (Medium glass tier) */}
          <div className="lg:col-span-6 flex">
            <div className="aurora-glass-medium w-full p-7 md:p-8 flex flex-col justify-between rounded-[26px]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                    <CheckCircle2 size={18} />
                  </div>
                  <h2 className="text-xl font-semibold text-white/95 tracking-tight">
                    {language === 'te' ? 'ఈ రోజు ఏమి చేయాలి?' : 'What to do today'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-white/70 mb-5">
                  {language === 'te'
                    ? 'ఇది ప్రత్యక్ష వాతావరణ డేటా ఆధారంగా రూపొందించిన చర్యల జాబితా.'
                    : 'Action checklist generated from real-time weather and farm context.'}
                </p>

                <ul className="space-y-3 text-sm text-white/88">
                  {data.decisions.todayActions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 3 Agricultural Decision Cards ═══ */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Irrigation Card */}
          <div className="aurora-glass-medium p-6 rounded-[24px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="aurora-label">Irrigation</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    data.decisions.irrigationRecommendation.status === 'hold'
                      ? 'aurora-badge-danger'
                      : data.decisions.irrigationRecommendation.status === 'increase'
                      ? 'aurora-badge-warning'
                      : 'aurora-badge-success'
                  }`}
                >
                  {data.decisions.irrigationRecommendation.status}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white/95 mb-2">
                {language === 'te' ? 'పారుదల సూచన' : 'Irrigation Recommendation'}
              </h3>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                {data.decisions.irrigationRecommendation.message}
              </p>
            </div>
          </div>

          {/* Heat Protection Card */}
          <div className="aurora-glass-medium p-6 rounded-[24px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="aurora-label">Thermal Index</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    data.decisions.heatAlert ? 'aurora-badge-warning' : 'aurora-badge-info'
                  }`}
                >
                  {data.decisions.heatAlert ? data.decisions.heatAlert.severity : 'Normal'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white/95 mb-2">
                {language === 'te' ? 'ఉష్ణోగ్రత రక్షణ అలర్ట్' : 'Heat Protection Alert'}
              </h3>
              {data.decisions.heatAlert ? (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-white/85 font-medium">{data.decisions.heatAlert.message}</p>
                  <ul className="space-y-1.5 text-xs text-white/70">
                    {data.decisions.heatAlert.protectionTips.map((tip, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-white/75">
                  {language === 'te' ? 'ఈరోజు తీవ్రమైన వేడి ప్రమాదం లేదు.' : 'No severe heat stress risk today.'}
                </p>
              )}
            </div>
          </div>

          {/* Sowing Window Card */}
          <div className="aurora-glass-medium p-6 rounded-[24px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="aurora-label">Planting Window</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    data.decisions.sowingWindow.status === 'good'
                      ? 'aurora-badge-success'
                      : data.decisions.sowingWindow.status === 'watch'
                      ? 'aurora-badge-warning'
                      : 'aurora-badge-danger'
                  }`}
                >
                  {data.decisions.sowingWindow.status}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white/95 mb-2">
                {language === 'te' ? 'విత్తనాల విత్తే సమయం' : 'Sowing Window Prediction'}
              </h3>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                {data.decisions.sowingWindow.message}
              </p>
              {data.decisions.sowingWindow.bestDays.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-white/60 mr-1">
                    {language === 'te' ? 'సరైన రోజులు:' : 'Suggested days:'}
                  </span>
                  {data.decisions.sowingWindow.bestDays.map((day, idx) => (
                    <span key={idx} className="aurora-glass-pill text-[11px] text-emerald-200">
                      {day}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Generated Alerts (if active) ═══ */}
        {data.decisions.alerts.length > 0 && (
          <div className="aurora-glass-medium p-6 rounded-[24px] border-rose-400/30">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-rose-200">
              <AlertTriangle size={18} className="text-rose-300" />
              <span>{language === 'te' ? 'సృష్టించిన అలర్ట్లు' : 'Generated Weather Alerts'}</span>
            </h3>
            <ul className="space-y-2 text-sm">
              {data.decisions.alerts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-white/90">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                  <span>
                    <strong className="text-rose-200 font-semibold">{item.title}:</strong> {item.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ═══ AI Weather Advisory Banner ═══ */}
        <div className="aurora-glass-medium p-6 md:p-7 rounded-[26px]">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-2xl bg-teal-400/20 text-teal-200 border border-teal-300/30">
              <BotMessageSquare size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white/95">
                {language === 'te' ? 'AI వాతావరణ సూచన' : 'AI Weather-Aware Agricultural Advisory'}
              </h3>
              <p className="text-xs text-white/60">Dynamic field insights tailored to current microclimate</p>
            </div>
          </div>

          {aiAdviceLoading ? (
            <div className="flex items-center gap-2.5 text-teal-200 py-2">
              <div className="w-4 h-4 rounded-full border-2 border-teal-300 border-t-transparent animate-spin" />
              <p className="text-sm font-medium">
                {language === 'te' ? 'AI సూచన సిద్ధమవుతుంది...' : 'Generating agricultural recommendation...'}
              </p>
            </div>
          ) : aiAdvice ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85 font-normal">{aiAdvice}</p>
          ) : (
            <p className="text-sm text-white/70">
              {language === 'te'
                ? 'AI సూచన లభించలేదు. సిస్టమ్ వాతావరణ నియమాలనే ఉపయోగిస్తోంది.'
                : 'AI suggestion unavailable right now. Weather decision rules are still active.'}
            </p>
          )}
        </div>

        {/* ═══ Detailed Forecast Context (when toggled) ═══ */}
        {detailedView && (
          <div className="aurora-glass-medium p-6 md:p-7 rounded-[26px] space-y-4">
            <h3 className="text-base font-semibold text-white/95">
              {language === 'te' ? 'వివరమైన అంచనా' : 'Detailed Forecast Context'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="aurora-glass-light p-3.5 rounded-xl">
                <p className="text-xs text-white/55 mb-0.5">24h Rain Prob.</p>
                <p className="text-base font-semibold text-white/95">{data.forecast.rainChance24h}%</p>
              </div>
              <div className="aurora-glass-light p-3.5 rounded-xl">
                <p className="text-xs text-white/55 mb-0.5">24h Expected Rainfall</p>
                <p className="text-base font-semibold text-white/95">{data.forecast.rainMm24h} mm</p>
              </div>
              <div className="aurora-glass-light p-3.5 rounded-xl">
                <p className="text-xs text-white/55 mb-0.5">7-Day Rainfall Outlook</p>
                <p className="text-base font-semibold text-white/95">{data.forecast.rainMm7d} mm</p>
              </div>
              <div className="aurora-glass-light p-3.5 rounded-xl">
                <p className="text-xs text-white/55 mb-0.5">Daily Temp Range</p>
                <p className="text-base font-semibold text-white/95">
                  {data.forecast.minTemp}°C to {data.forecast.maxTemp}°C
                </p>
              </div>
              <div className="aurora-glass-light p-3.5 rounded-xl">
                <p className="text-xs text-white/55 mb-0.5">Data Source</p>
                <p className="text-base font-semibold text-white/95">{data.source}</p>
              </div>
              <div className="aurora-glass-light p-3.5 rounded-xl">
                <p className="text-xs text-white/55 mb-0.5">Primary Crop</p>
                <p className="text-base font-semibold text-white/95">
                  {crop || (language === 'te' ? 'సెట్ కాలేదు' : 'Not set')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Manager Webhook Alert Setup ═══ */}
        <div className="aurora-glass-medium p-6 md:p-7 rounded-[26px]">
          <h3 className="text-base font-semibold text-white/95 mb-1">{t('manager_alert_setup')}</h3>
          <p className="text-xs sm:text-sm text-white/65 mb-4">{t('manager_alert_setup_hint')}</p>
          <div className="flex flex-col gap-3 sm:flex-row max-w-2xl">
            <input
              value={webhookInput}
              onChange={(event) => setWebhookInput(event.target.value)}
              placeholder="https://your-webhook-url"
              className="aurora-glass-input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => localStorage.setItem('managerWebhookUrl', webhookInput.trim())}
              className="aurora-glass-button-primary whitespace-nowrap text-xs sm:text-sm"
            >
              {t('save_webhook')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

