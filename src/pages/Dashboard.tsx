import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudRain,
  Cloud,
  Sun,
  Bug,
  Lightbulb,
  BotMessageSquare,
  ArrowRight,
  Activity,
  MapPin,
  Maximize,
  Wind,
  Droplets,
  Bell,
  User as UserIcon,
  Mic,
  MicOff
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { readAlerts } from '../utils/alertEngine';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Skeleton } from '../components/ui/SkeletonLoader';
import { motion } from 'framer-motion';

/* ─── Phase 7 animation helpers ─── */

// Reduced-motion media query hook
function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefersReduced;
}

// Staggered entrance variants
const sectionVariants: any = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 0.61, 0.36, 1] },
  }),
  immediate: { opacity: 1, y: 0 },
};

/* ─── Glass surface style presets (depth hierarchy) ─── */

// Strongest glass — main weather card
const glassStrong = {
  default: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.258) 24%, rgba(255,255,255,0.252) 78%, rgba(255,255,255,0.232) 100%)',
    backdropFilter: 'blur(26px) saturate(118%)',
    WebkitBackdropFilter: 'blur(26px) saturate(118%)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.40), 0 20px 40px -15px rgba(0,0,0,0.35)',
  },
  hover: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.31) 24%, rgba(255,255,255,0.30) 78%, rgba(255,255,255,0.28) 100%)',
    backdropFilter: 'blur(26px) saturate(118%)',
    WebkitBackdropFilter: 'blur(26px) saturate(118%)',
    border: '1px solid rgba(255,255,255,0.25)',
    boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.50), 0 24px 48px -12px rgba(0,0,0,0.40)',
  },
};

// Medium glass — secondary panels (forecast, alerts, profile)
const glassMedium = {
  background: 'rgba(255, 255, 255, 0.11)',
  backdropFilter: 'blur(22px) saturate(115%)',
  WebkitBackdropFilter: 'blur(22px) saturate(115%)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)',
};

// Light glass — small controls (voice pill, quick tools)
const glassLight = {
  background: 'rgba(255, 255, 255, 0.09)',
  backdropFilter: 'blur(20px) saturate(112%)',
  WebkitBackdropFilter: 'blur(20px) saturate(112%)',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.20)',
};


export function Dashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [weatherSnap, setWeatherSnap] = useState<{
    tempC: number;
    feelsLikeC?: number;
    humidity?: number;
    windKmph?: number;
    rainChance24h: number;
    desc: string;
    locationName?: string;
  } | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [isWeatherCardHovered, setIsWeatherCardHovered] = useState(false);
  const [voiceQueryText, setVoiceQueryText] = useState('');
  const [isListening, setIsListening] = useState(false);

  const profileRaw = localStorage.getItem('farmerProfile');
  let profile: { location?: string; landSize?: string; crops?: string } = {};
  try {
    profile = profileRaw ? (JSON.parse(profileRaw) as { location?: string; landSize?: string; crops?: string }) : {};
  } catch {
    profile = {};
  }

  const alerts = readAlerts();
  const alertCount = Math.max(alerts.length, unreadCount);

  useEffect(() => {
    const loadWeatherSnapshot = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 9000,
            maximumAge: 600000,
          });
        });

        const weather = await api.getWeatherDecision(position.coords.latitude, position.coords.longitude);
        setWeatherSnap({
          tempC: weather.current.tempC,
          feelsLikeC: weather.current.feelsLikeC,
          humidity: weather.current.humidity,
          windKmph: weather.current.windKmph,
          rainChance24h: weather.forecast.rainChance24h,
          desc: weather.current.condition || 'Storm with Heavy Rain',
          locationName: profile.location || 'Local Farm'
        });
      } catch {
        setWeatherSnap(null);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    void loadWeatherSnapshot();
  }, [profile.location]);

  const recognitionCtor = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const windowRef = window as unknown as { webkitSpeechRecognition?: any; SpeechRecognition?: any };
    return windowRef.SpeechRecognition || windowRef.webkitSpeechRecognition || null;
  }, []);

  const startVoiceRecognition = () => {
    if (!recognitionCtor) return;
    try {
      const recognition = new recognitionCtor();
      recognition.lang = language === 'te' ? 'te-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      setIsListening(true);

      recognition.onresult = (event: any) => {
        const text = event.results[0]?.[0]?.transcript || '';
        setVoiceQueryText(text);
        handleVoiceQuery(text);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleVoiceQuery = (query: string) => {
    const lower = query.toLowerCase();
    if (lower.includes('weather') || query.includes('వాతావరణ')) return navigate('/weather');
    if (lower.includes('disease') || query.includes('తెగులు')) return navigate('/disease-detect');
    if (lower.includes('price') || query.includes('ధర')) return navigate('/market-prices');
    navigate('/crop-recommend');
  };

  // Convenience: pick animation variant
  const anim = (delay: number) =>
    prefersReducedMotion ? 'immediate' : 'visible';

  return (
    <div
      className="relative -m-4 md:-m-6 lg:-m-8 p-4 md:p-8 lg:p-10 min-h-[calc(100vh-4rem)] bg-no-repeat bg-cover text-white rounded-2xl overflow-hidden font-sans"
      style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(4,16,24,0.28) 0%, rgba(4,16,24,0.14) 50%, rgba(4,16,24,0.04) 100%),
          radial-gradient(ellipse at 30% 40%, rgba(6,26,35,0.30) 0%, rgba(4,15,22,0.72) 100%),
          url('/assets/storm-background.jpg')
        `,
        backgroundPosition: 'center 25%',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      {/* Phase 7: CSS-only specular sheen + reduced-motion + focus styles */}
      <style>{`
        @keyframes glassSheen {
          0%   { transform: translateX(-120%) skewX(-14deg); }
          100% { transform: translateX(320%)  skewX(-14deg); }
        }
        .glass-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          background: linear-gradient(
            100deg,
            transparent 0%,
            rgba(255,255,255,0.14) 45%,
            rgba(255,255,255,0.17) 50%,
            rgba(255,255,255,0.14) 55%,
            transparent 100%
          );
          width: 35%;
          animation: glassSheen 1.15s cubic-bezier(.22,.61,.36,1) 2.55s 1 forwards;
          transform: translateX(-120%) skewX(-14deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .glass-sheen::after {
            animation: none !important;
            display: none;
          }
          .motion-safe-transition {
            transition: none !important;
          }
        }
        /* Keyboard focus ring for interactive glass elements */
        .glass-focusable:focus-visible {
          outline: 2px solid rgba(255,255,255,0.95);
          outline-offset: 2px;
        }
      `}</style>

      <div className="relative z-10 mx-auto max-w-6xl space-y-8">

        {/* ═══ 1. TOP HEADER — entrance delay: 0s ═══ */}
        <motion.div
          variants={sectionVariants}
          initial={prefersReducedMotion ? 'immediate' : 'hidden'}
          animate={prefersReducedMotion ? 'immediate' : 'visible'}
          custom={0}
          className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10"
        >
          <div>
            <p className="text-base text-white/75 font-normal tracking-wide">
              {language === 'te' ? 'స్వాగతం' : 'Welcome'}
            </p>
            <h1 className="text-xl md:text-[22px] font-semibold text-white/[0.97] tracking-tight">
              {user?.name || 'Farmer'}
            </h1>
          </div>

          {/* Compact Glass Action Toolbar */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/weather')}
              className="glass-focusable flex items-center justify-center h-10 w-10 rounded-full bg-white/[0.10] hover:bg-white/[0.20] backdrop-blur-xl border border-white/18 text-white shadow-sm motion-safe-transition transition-all duration-200 hover:-translate-y-0.5"
              title="Weather View"
            >
              <CloudRain size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/notifications-debug')}
              className="glass-focusable relative flex items-center justify-center h-10 w-10 rounded-full bg-white/[0.10] hover:bg-white/[0.20] backdrop-blur-xl border border-white/18 text-white shadow-sm motion-safe-transition transition-all duration-200 hover:-translate-y-0.5"
              title="Alerts"
            >
              <Bell size={18} />
              {alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="glass-focusable flex items-center justify-center h-10 w-10 rounded-full bg-white/[0.10] hover:bg-white/[0.20] backdrop-blur-xl border border-white/18 text-white shadow-sm motion-safe-transition transition-all duration-200 hover:-translate-y-0.5"
              title="Profile"
            >
              <UserIcon size={18} />
            </button>
          </div>
        </motion.div>

        {/* ═══ 2. AURORA HERO (Left Headline + Right Glass Card) — entrance delay: 0.08s ═══ */}
        <motion.div
          variants={sectionVariants}
          initial={prefersReducedMotion ? 'immediate' : 'hidden'}
          animate={prefersReducedMotion ? 'immediate' : 'visible'}
          custom={0.08}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4"
        >
          {/* Left Column: Weather Forecast & Strom with Heavy Rain */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-medium uppercase tracking-wider text-white/90 shadow-sm" style={glassLight}>
              <span>Weather Forecast</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-medium leading-[1.06] tracking-tight text-white drop-shadow-lg">
                Strom
              </h2>
              <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-medium leading-[1.06] tracking-tight text-white drop-shadow-lg">
                with Heavy Rain
              </h2>
            </div>

            <p className="text-[15px] leading-[24px] text-white/78 max-w-[480px] font-normal pt-2 drop-shadow-sm">
              {weatherSnap ? (
                <>
                  {weatherSnap.desc ? `${weatherSnap.desc}. ` : ''}Rain probability is {weatherSnap.rainChance24h}%. Wind expected at {weatherSnap.windKmph || 19} km/h with high humidity in active agricultural zones.
                </>
              ) : (
                'Partly cloudy with occasional rain showers. High wind and rain advisories in effect for local farmlands. Check drainage channels and field moisture before irrigation.'
              )}
            </p>
          </div>

          {/* Right Column: Main Premium Liquid-Glass Weather Card — STRONGEST glass */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <motion.div
              onClick={() => navigate('/weather')}
              onMouseEnter={() => setIsWeatherCardHovered(true)}
              onMouseLeave={() => setIsWeatherCardHovered(false)}
              whileHover={prefersReducedMotion ? {} : { y: -2 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass-focusable glass-sheen w-full max-w-[380px] rounded-[26px] p-7 md:p-8 text-white shadow-2xl cursor-pointer motion-safe-transition transition-all duration-300 group relative overflow-hidden"
              style={isWeatherCardHovered ? glassStrong.hover : glassStrong.default}
              tabIndex={0}
              role="button"
              aria-label="View detailed weather"
            >
              {/* Internal Glass Specular Highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

              {/* Location Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-white/88 text-[15px] font-medium tracking-wide">
                  <MapPin size={16} className="text-white/85 shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {profile.location || weatherSnap?.locationName || 'Central Region'}
                  </span>
                </div>
                <ArrowRight size={17} className="text-white/35 group-hover:text-white/90 group-hover:translate-x-1 motion-safe-transition transition-all duration-200" />
              </div>

              {/* Temperature Readout */}
              <div className="my-2">
                {isLoadingWeather ? (
                  <Skeleton variant="text" width="65%" height="86px" />
                ) : (
                  <div className="flex items-baseline font-medium tracking-tight text-white drop-shadow-md leading-none">
                    <span className="text-6xl sm:text-7xl lg:text-[88px] tracking-tighter">
                      {weatherSnap ? weatherSnap.tempC : 33}
                    </span>
                    <span className="text-4xl sm:text-5xl lg:text-[54px] font-light ml-1 opacity-90">°</span>
                    <span className="text-3xl sm:text-4xl lg:text-[46px] font-light ml-2 opacity-75">C</span>
                  </div>
                )}
                <p className="text-[16px] text-white/80 font-medium mt-3 tracking-normal">
                  {weatherSnap?.desc || 'Partly Cloudy'}
                </p>
              </div>

              {/* Weather Metrics Bar */}
              <div className="mt-7 pt-5 border-t border-white/18 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1 text-[13px] text-white/65 font-normal">
                    <Wind size={13} className="opacity-75" />
                    <span>Wind</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white/95 tracking-tight">
                    {weatherSnap?.windKmph ?? 15} km/h
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5 border-x border-white/12">
                  <div className="flex items-center gap-1 text-[13px] text-white/65 font-normal">
                    <CloudRain size={13} className="opacity-75" />
                    <span>Rain</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white/95 tracking-tight">
                    {weatherSnap?.rainChance24h ?? 40}%
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1 text-[13px] text-white/65 font-normal">
                    <Droplets size={13} className="opacity-75" />
                    <span>Humidity</span>
                  </div>
                  <span className="text-[15px] font-semibold text-white/95 tracking-tight">
                    {weatherSnap?.humidity ?? 76}%
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ═══ 3. FORECAST STRIP + TEMPERATURE WAVE — entrance delay: 0.18s ═══ */}
        {/* Reference: forecast floats on the storm background — no enclosed card */}
        <motion.div
          variants={sectionVariants}
          initial={prefersReducedMotion ? 'immediate' : 'hidden'}
          animate={prefersReducedMotion ? 'immediate' : 'visible'}
          custom={0.18}
          className="p-2 sm:p-4 md:p-6 space-y-3 sm:space-y-4 relative overflow-hidden"
        >
          {/* Subtle separator from hero — no card border in reference */}

          {/* Temperature & Weather Icons Row */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 text-center items-end px-2 sm:px-6">
            {[
              { temp: weatherSnap ? Math.round(weatherSnap.tempC - 2) : 11, icon: Cloud, label: 'Sunday', active: false },
              { temp: weatherSnap ? Math.round(weatherSnap.tempC) : 13, icon: Cloud, label: 'Monday', active: false },
              { temp: weatherSnap ? Math.round(weatherSnap.tempC + 1) : 14, icon: Cloud, label: 'Tuesday', active: false },
              { temp: weatherSnap ? Math.round(weatherSnap.tempC - 3) : 10, icon: CloudRain, label: 'Wednesday', active: true },
              { temp: weatherSnap ? Math.round(weatherSnap.tempC + 6) : 19, icon: Sun, label: 'Thursday', active: false },
              { temp: weatherSnap ? Math.round(weatherSnap.tempC - 1) : 12, icon: Cloud, label: 'Friday', active: false },
            ].map((pt, idx) => {
              const Icon = pt.icon;
              return (
                <div key={idx} className="flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center justify-center gap-1 text-white drop-shadow-sm">
                    <span className="text-lg sm:text-2xl md:text-[32px] font-light tracking-tight">
                      {pt.temp}°
                    </span>
                    <Icon size={14} className="opacity-70 sm:w-4 sm:h-4" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG Smooth Temperature Wave Curve — polished */}
          <div className="relative w-full overflow-hidden py-1">
            <svg
              viewBox="0 0 835 230"
              preserveAspectRatio="none"
              className="w-full h-24 sm:h-32 md:h-40 overflow-visible"
            >
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
                  <stop offset="55%" stopColor="rgba(255, 255, 255, 0.06)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.00)" />
                </linearGradient>
                <linearGradient id="curveLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.30)" />
                  <stop offset="30%" stopColor="rgba(255, 255, 255, 0.90)" />
                  <stop offset="55%" stopColor="rgba(255, 255, 255, 0.95)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.30)" />
                </linearGradient>
                {/* Ghost secondary line gradient */}
                <linearGradient id="curveSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.08)" />
                  <stop offset="50%" stopColor="rgba(255, 255, 255, 0.15)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
                </linearGradient>
              </defs>

              {/* Filled area below curve */}
              <path
                d="M 0,165 C 60,165 110,135 180,135 C 250,135 290,110 360,110 C 430,110 470,175 540,175 C 610,175 650,45 720,45 C 780,45 810,140 835,140 L 835,230 L 0,230 Z"
                fill="url(#waveGradient)"
              />

              {/* Subtle secondary/ghost line — slightly offset */}
              <path
                d="M 0,170 C 60,170 110,140 180,140 C 250,140 290,116 360,116 C 430,116 470,180 540,180 C 610,180 650,52 720,52 C 780,52 810,145 835,145"
                fill="none"
                stroke="url(#curveSecondary)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Primary Curve Stroke — crisp white */}
              <path
                d="M 0,165 C 60,165 110,135 180,135 C 250,135 290,110 360,110 C 430,110 470,175 540,175 C 610,175 650,45 720,45 C 780,45 810,140 835,140"
                fill="none"
                stroke="url(#curveLineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Days Label Row */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 text-center px-2 sm:px-6 pt-1">
            {[
              { label: 'Sunday', active: false },
              { label: 'Monday', active: false },
              { label: 'Tuesday', active: false },
              { label: 'Wednesday', active: true },
              { label: 'Thursday', active: false },
              { label: 'Friday', active: false },
            ].map((day, idx) => (
              <div
                key={idx}
                className={`text-xs sm:text-sm tracking-wide ${
                  day.active
                    ? 'text-white font-semibold'
                    : 'text-white/55 font-normal'
                }`}
              >
                <span className="hidden sm:inline">{day.label}</span>
                <span className="sm:hidden">{day.label.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══ 4. VOICE ASSISTANT GLASS PILL — entrance delay: 0.26s ═══ */}
        <motion.div
          variants={sectionVariants}
          initial={prefersReducedMotion ? 'immediate' : 'hidden'}
          animate={prefersReducedMotion ? 'immediate' : 'visible'}
          custom={0.26}
          className="w-full rounded-full p-2 sm:p-2.5 shadow-lg motion-safe-transition transition-all duration-300"
          style={glassLight}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (voiceQueryText.trim()) handleVoiceQuery(voiceQueryText);
            }}
            className="flex items-center gap-2.5 px-2"
          >
            <button
              type="button"
              onClick={startVoiceRecognition}
              disabled={!recognitionCtor}
              className={`glass-focusable flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full motion-safe-transition transition-all duration-200 shrink-0 ${
                isListening
                  ? 'bg-rose-500/80 text-white animate-pulse shadow-lg ring-2 ring-rose-300'
                  : 'bg-white/12 hover:bg-white/22 text-white border border-white/20'
              }`}
              title={isListening ? 'Listening...' : 'Voice Search'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              value={voiceQueryText}
              onChange={(e) => setVoiceQueryText(e.target.value)}
              placeholder={
                language === 'te'
                  ? 'మీ వ్యవసాయ ప్రశ్నను అడగండి లేదా మాట్లాడండి...'
                  : 'Ask your farming question or speak...'
              }
              className="w-full bg-transparent text-white placeholder-white/50 text-sm sm:text-base font-normal outline-none focus:placeholder-white/70"
            />

            <button
              type="submit"
              className="glass-focusable px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/12 hover:bg-white/22 active:scale-95 text-white font-medium text-xs sm:text-sm border border-white/20 backdrop-blur-md shadow-sm motion-safe-transition transition-all duration-200 shrink-0"
            >
              {language === 'te' ? 'అడుగు' : 'Ask'}
            </button>
          </form>
        </motion.div>

        {/* ═══ 5. ALERTS + FARM PROFILE — entrance delay: 0.34s ═══ */}
        <motion.div
          variants={sectionVariants}
          initial={prefersReducedMotion ? 'immediate' : 'hidden'}
          animate={prefersReducedMotion ? 'immediate' : 'visible'}
          custom={0.34}
          className="grid gap-6 md:grid-cols-2"
        >
          {/* Alerts Widget */}
          <motion.div
            whileHover={prefersReducedMotion ? {} : { y: -1 }}
            transition={{ duration: 0.25 }}
            onClick={() => navigate('/notifications-debug')}
            className="glass-focusable glass-sheen rounded-[24px] p-6 flex flex-col justify-between min-h-[140px] cursor-pointer motion-safe-transition transition-all duration-300 shadow-xl group relative overflow-hidden"
            style={glassMedium}
            tabIndex={0}
            role="button"
            aria-label="View active alerts"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2.5 rounded-xl shadow-sm backdrop-blur-md border ${alertCount > 0 ? 'bg-amber-400/20 border-amber-300/25 text-amber-200' : 'bg-emerald-400/20 border-emerald-300/25 text-emerald-200'}`}>
                <Activity size={22} />
              </div>
              <ArrowRight size={18} className="text-white/35 group-hover:text-white/90 group-hover:translate-x-1 motion-safe-transition transition-all" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-white/68 mb-1">Active Alerts</p>
              <div className="text-2xl font-bold text-white/95 drop-shadow-sm">{alertCount}</div>
              <p className="text-xs text-white/65 mt-0.5">{alertCount > 0 ? 'Requires farm attention' : 'All crop systems normal'}</p>
            </div>
          </motion.div>

          {/* Farm Profile Widget */}
          <motion.div
            whileHover={prefersReducedMotion ? {} : { y: -1 }}
            transition={{ duration: 0.25 }}
            onClick={() => navigate('/profile')}
            className="glass-focusable glass-sheen rounded-[24px] p-6 flex flex-col justify-between cursor-pointer group min-h-[140px] motion-safe-transition transition-all duration-300 shadow-xl relative overflow-hidden"
            style={glassMedium}
            tabIndex={0}
            role="button"
            aria-label="View farm profile"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="flex justify-between items-start mb-3">
              <div className="bg-teal-400/15 backdrop-blur-md border border-teal-300/25 text-teal-200 p-2.5 rounded-xl shadow-sm">
                <MapPin size={22} />
              </div>
              <ArrowRight size={18} className="text-white/35 group-hover:text-white/90 group-hover:translate-x-1 motion-safe-transition transition-all" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-white/68 mb-1">Farm Profile</p>
              <div className="text-xl font-bold text-white/95 drop-shadow-sm truncate">
                {profile.location || 'Location Not Set'}
              </div>
              <p className="text-xs text-white/65 mt-0.5 flex items-center gap-1">
                <Maximize size={13} />
                {profile.landSize ? `${profile.landSize} acres registered` : 'Plot size not configured'}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* ═══ 6. AI FARMING ASSISTANT BANNER — entrance delay: 0.42s ═══ */}
        <motion.div
          variants={sectionVariants}
          initial={prefersReducedMotion ? 'immediate' : 'hidden'}
          animate={prefersReducedMotion ? 'immediate' : 'visible'}
          custom={0.42}
          onClick={() => navigate('/ai-assistant')}
          whileHover={prefersReducedMotion ? {} : { y: -1 }}
          transition={{ duration: 0.25 }}
          className="glass-focusable glass-sheen cursor-pointer overflow-hidden rounded-[26px] p-6 md:p-7 shadow-2xl motion-safe-transition transition-all duration-300 group relative"
          style={{
            /* Reduced teal — now consistent white-glass with extremely subtle cool tint */
            background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.11) 100%)',
            backdropFilter: 'blur(24px) saturate(116%)',
            WebkitBackdropFilter: 'blur(24px) saturate(116%)',
            border: '1px solid rgba(255,255,255,0.20)',
            boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.30)',
          }}
          tabIndex={0}
          role="button"
          aria-label="Open AI farming assistant"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="hidden rounded-2xl bg-teal-400/15 p-3.5 backdrop-blur-md border border-teal-300/25 text-teal-200 shadow-sm md:block">
                <BotMessageSquare size={34} className="text-teal-200" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-white/[0.97] mb-1 tracking-tight">Ask AI Farming Assistant</h2>
                <p className="text-white/75 text-sm md:text-[15px] font-normal">Get real-time insights, crop disease analysis, and step-by-step guidance.</p>
              </div>
            </div>
            <div className="rounded-full bg-white/15 group-hover:bg-white/25 backdrop-blur-md border border-white/22 p-3 text-white shadow-sm motion-safe-transition transition-colors">
              <ArrowRight size={20} className="group-hover:translate-x-0.5 motion-safe-transition transition-transform" />
            </div>
          </div>
        </motion.div>

        {/* ═══ 7. QUICK TOOLS GRID — entrance delay: 0.50s ═══ */}
        <motion.div
          variants={sectionVariants}
          initial={prefersReducedMotion ? 'immediate' : 'hidden'}
          animate={prefersReducedMotion ? 'immediate' : 'visible'}
          custom={0.50}
          className="pt-2"
        >
          <h2 className="text-lg font-semibold text-white/90 drop-shadow-sm mb-4 tracking-tight">Quick Tools</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: 1,
                title: t('disease_detection'),
                desc: 'AI-powered crop pathology & diagnosis',
                icon: <Bug size={22}/>,
                path: '/disease-detect',
                color: 'text-rose-200',
                bg: 'bg-rose-400/15 border-rose-300/25'
              },
              {
                id: 2,
                title: t('farming_tips'),
                desc: 'Seasonal advisories & nutrient management',
                icon: <Lightbulb size={22}/>,
                path: '/farming-tips',
                color: 'text-amber-200',
                bg: 'bg-amber-400/15 border-amber-300/25'
              },
              {
                id: 3,
                title: t('govt_schemes'),
                desc: 'Subsidies, PM-KISAN & crop insurance',
                icon: <Activity size={22}/>,
                path: '/govt-schemes',
                color: 'text-cyan-200',
                bg: 'bg-cyan-400/15 border-cyan-300/25'
              },
            ].map(tool => (
              <motion.div
                key={tool.id}
                onClick={() => navigate(tool.path)}
                whileHover={prefersReducedMotion ? {} : { y: -1 }}
                transition={{ duration: 0.25 }}
                className="glass-focusable rounded-[22px] p-5 flex items-center group cursor-pointer motion-safe-transition transition-all duration-300 shadow-lg relative overflow-hidden"
                style={glassLight}
                tabIndex={0}
                role="button"
                aria-label={typeof tool.title === 'string' ? tool.title : undefined}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className={`p-3 rounded-xl border ${tool.bg} ${tool.color} mr-4 motion-safe-transition transition-transform group-hover:scale-105 shadow-sm backdrop-blur-md shrink-0`}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white/95 text-[15px] truncate">{tool.title}</div>
                  <p className="text-xs text-white/62 font-normal truncate mt-0.5">{tool.desc}</p>
                </div>
                <ArrowRight size={16} className="text-white/35 group-hover:text-white/90 group-hover:translate-x-1 motion-safe-transition transition-all ml-2 shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
