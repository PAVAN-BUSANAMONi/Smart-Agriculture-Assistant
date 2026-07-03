import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CloudRain, Droplets, LocateFixed, Thermometer, Wind, BotMessageSquare } from 'lucide-react';
import { api, WeatherDecisionResponse } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { createAlert, shouldTriggerAlert } from '../utils/alertEngine';
import { pushBrowserNotification } from '../utils/browserNotifications';
import { RippleButton } from '../components/ui/RippleButton';

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
    return <div className="p-8 text-center">{t('analyzing')}</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-red-600">{error || t('weather_load_error')}</div>;
  }

  const weatherLabel = data.current.weatherLabel || WEATHER_CODE_MAP[data.current.weatherCode] || 'Weather';
  const irrigationClass =
    data.decisions.irrigationRecommendation.status === 'hold'
      ? 'border-red-200 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-900 dark:text-red-300 text-red-800'
      : data.decisions.irrigationRecommendation.status === 'increase'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">{t('weather_forecast')}</h1>
        <RippleButton
          type="button"
          onClick={() => setDetailedView((prev) => !prev)}
          variant="secondary" className="text-sm px-4 py-2"
        >
          {detailedView
            ? language === 'te'
              ? 'సరళ దృశ్యం'
              : 'Simple View'
            : language === 'te'
            ? 'వివర దృశ్యం'
            : 'Detailed View'}
        </RippleButton>
      </div>

      {isOffline && (
        <div className="glass-card border-blue-200 bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-900 dark:text-blue-300/80 p-4 text-sm text-blue-800">
          {language === 'te'
            ? 'ఆఫ్‌లైన్ మోడ్ అందుబాటులో ఉంది. చివరిసారి సింక్ అయిన డేటా ఉపయోగించబడుతుంది.'
            : 'Offline mode enabled. Last synced advisory is used in low-network areas.'}
        </div>
      )}

      {notice && <div className="glass-card border-blue-200 bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-900 dark:text-blue-300/80 p-4 text-sm text-blue-800">{notice}</div>}
      {error && <div className="glass-card border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">{error}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white border-blue-400/30">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400 blur-3xl opacity-30"></div>
          <div className="mb-6 flex items-center gap-2 text-blue-100 relative z-10">
            <LocateFixed size={18} />
            <span className="text-sm font-medium">
              {data.city} ({data.latitude.toFixed(2)}, {data.longitude.toFixed(2)})
            </span>
          </div>
          <p className="text-xl opacity-90 font-medium relative z-10">{weatherLabel}</p>
          <h2 className="mb-2 text-6xl font-bold font-display tracking-tighter relative z-10">{data.current.tempC}°C</h2>
          <p className="text-sm text-blue-100 relative z-10">
            {t('feels_like')}: {data.current.feelsLikeC}°C | {t('last_updated')}: {new Date(data.fetchedAt).toLocaleTimeString()}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-sm relative z-10">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 border border-white/10">
              <Thermometer className="mb-1 text-blue-200" size={20} />
              <div className="text-blue-100">{t('humidity')}</div>
              <div className="font-semibold text-lg">{data.current.humidity}%</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 border border-white/10">
              <Wind className="mb-1 text-blue-200" size={20} />
              <div className="text-blue-100">{t('wind_speed')}</div>
              <div className="font-semibold text-lg">{data.current.windKmph} km/h</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 border border-white/10">
              <CloudRain className="mb-1 text-blue-200" size={20} />
              <div className="text-blue-100">{t('rain_chance')}</div>
              <div className="font-semibold text-lg">{data.forecast.rainChance24h}%</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 border border-white/10">
              <Droplets className="mb-1 text-blue-200" size={20} />
              <div className="text-blue-100">Rain (24h)</div>
              <div className="font-semibold text-lg">{data.forecast.rainMm24h} mm</div>
            </div>
          </div>
        </div>

        <div className="glass-panel border-emerald-200/50 bg-emerald-50/40 p-8">
          <h2 className="mb-2 text-2xl font-bold font-display text-emerald-900">
            {language === 'te' ? 'ఈ రోజు ఏమి చేయాలి?' : 'What to do today'}
          </h2>
          <p className="mb-6 text-sm text-emerald-700">
            {language === 'te'
              ? 'ఇది ప్రత్యక్ష వాతావరణ డేటా ఆధారంగా రూపొందించిన చర్యల జాబితా.'
              : 'Action checklist generated from real-time weather and farm context.'}
          </p>
          <ul className="space-y-3 text-emerald-900 font-medium">
            {data.decisions.todayActions.map((item) => (
              <li key={item} className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0"></div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className={`glass-card p-6 ${irrigationClass}`}>
          <h3 className="mb-2 font-bold font-display text-lg">{language === 'te' ? 'పారుదల సూచన' : 'Irrigation Recommendation'}</h3>
          <p className="text-sm opacity-90">{data.decisions.irrigationRecommendation.message}</p>
        </div>

        <div className="glass-card border-orange-200/50 bg-orange-50/50 p-6 text-orange-900">
          <h3 className="mb-2 font-bold font-display text-lg">{language === 'te' ? 'ఉష్ణోగ్రత రక్షణ అలర్ట్' : 'Heat Protection Alert'}</h3>
          {data.decisions.heatAlert ? (
            <>
              <p className="text-sm font-medium">{data.decisions.heatAlert.message}</p>
              <ul className="mt-3 space-y-2 text-sm opacity-90">
                {data.decisions.heatAlert.protectionTips.map((tip) => (
                  <li key={tip} className="flex gap-2"><div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0"></div>{tip}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm opacity-90">{language === 'te' ? 'ఈరోజు తీవ్రమైన వేడి ప్రమాదం లేదు.' : 'No severe heat stress risk today.'}</p>
          )}
        </div>

        <div className="glass-card border-indigo-200/50 bg-indigo-50/50 p-6 text-indigo-900">
          <h3 className="mb-2 font-bold font-display text-lg">{language === 'te' ? 'విత్తనాల విత్తే సమయం' : 'Sowing Window Prediction'}</h3>
          <p className="text-sm font-medium">{data.decisions.sowingWindow.message}</p>
          {data.decisions.sowingWindow.bestDays.length > 0 && (
            <div className="mt-4 inline-flex rounded-lg bg-indigo-100/50 px-3 py-1.5 text-xs font-bold text-indigo-800">
              {language === 'te' ? 'సరైన రోజులు:' : 'Suggested days:'} {data.decisions.sowingWindow.bestDays.join(', ')}
            </div>
          )}
        </div>
      </div>

      {data.decisions.alerts.length > 0 && (
        <div className="glass-card border-red-200/60 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-900 dark:text-red-300/60 p-6 text-red-900">
          <h3 className="mb-3 flex items-center gap-2 font-bold font-display text-lg">
            <AlertTriangle size={20} className="text-red-600" />
            {language === 'te' ? 'సృష్టించిన అలర్ట్లు' : 'Generated Alerts'}
          </h3>
          <ul className="space-y-2 text-sm font-medium">
            {data.decisions.alerts.map((item) => (
              <li key={`${item.title}-${item.message}`} className="flex gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-900 dark:text-red-3000 shrink-0"></div>
                  <span><strong className="text-red-800">{item.title}:</strong> {item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass-panel border-emerald-200/40 bg-emerald-50/30 p-6 text-[#21452a]">
        <h3 className="mb-3 font-bold font-display text-lg flex items-center gap-2">
          <BotMessageSquare size={20} className="text-emerald-600" />
          {language === 'te' ? 'AI వాతావరణ సూచన' : 'AI weather-aware suggestion'}
        </h3>
        {aiAdviceLoading ? (
          <div className="flex gap-2 items-center text-emerald-600">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            <p className="text-sm font-medium">{language === 'te' ? 'AI సూచన సిద్ధమవుతుంది...' : 'Preparing AI suggestion...'}</p>
          </div>
        ) : aiAdvice ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{aiAdvice}</p>
        ) : (
          <p className="text-sm opacity-80">
            {language === 'te'
              ? 'AI సూచన లభించలేదు. సిస్టమ్ వాతావరణ నియమాలనే ఉపయోగిస్తోంది.'
              : 'AI suggestion unavailable right now. Weather decision rules are still active.'}
          </p>
        )}
      </div>

      {detailedView && (
        <div className="glass-card p-6 border-gray-200">
          <h3 className="mb-4 font-bold font-display text-lg text-gray-900 dark:text-white drop-shadow-sm">{language === 'te' ? 'వివరమైన అంచనా' : 'Detailed Forecast Context'}</h3>
          <div className="grid gap-4 text-sm text-gray-700 dark:text-gray-300 font-medium md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">24h Rain Prob.</p>
                <p className="text-gray-900 dark:text-white drop-shadow-sm">{data.forecast.rainChance24h}%</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">24h Expected Rainfall</p>
                <p className="text-gray-900 dark:text-white drop-shadow-sm">{data.forecast.rainMm24h} mm</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">7-Day Rainfall Outlook</p>
                <p className="text-gray-900 dark:text-white drop-shadow-sm">{data.forecast.rainMm7d} mm</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Daily Temp Range</p>
                <p className="text-gray-900 dark:text-white drop-shadow-sm">{data.forecast.minTemp}°C to {data.forecast.maxTemp}°C</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Data Source</p>
                <p className="text-gray-900 dark:text-white drop-shadow-sm">{data.source}</p>
            </div>
            <div className="bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Primary Crop</p>
                <p className="text-gray-900 dark:text-white drop-shadow-sm">{crop || (language === 'te' ? 'సెట్ కాలేదు' : 'Not set')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-6 border-gray-200">
        <h3 className="mb-2 font-bold font-display text-lg text-gray-900 dark:text-white drop-shadow-sm">{t('manager_alert_setup')}</h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('manager_alert_setup_hint')}</p>
        <div className="flex flex-col gap-3 md:flex-row max-w-2xl">
          <input
            value={webhookInput}
            onChange={(event) => setWebhookInput(event.target.value)}
            placeholder="https://your-webhook-url"
            className="glass-input flex-1"
          />
          <RippleButton
            type="button"
            onClick={() => localStorage.setItem('managerWebhookUrl', webhookInput.trim())}
            variant="primary" className="whitespace-nowrap"
          >
            {t('save_webhook')}
          </RippleButton>
        </div>
      </div>
    </div>
  );
}
