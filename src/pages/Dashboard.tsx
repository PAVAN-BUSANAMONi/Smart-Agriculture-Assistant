import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudRain,
  Bug,
  Lightbulb,
  BotMessageSquare,
  ArrowRight,
  Activity,
  MapPin,
  Maximize
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { VoiceQueryInput } from '../components/VoiceQueryInput';
import { readAlerts } from '../utils/alertEngine';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { GlowCard } from '../components/ui/GlowCard';
import { Skeleton } from '../components/ui/SkeletonLoader';
import { motion } from 'framer-motion';

export function Dashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const [weatherSnap, setWeatherSnap] = useState<{ tempC: number; rainChance24h: number; desc: string } | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

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
          rainChance24h: weather.forecast.rainChance24h,
          desc: weather.current.condition
        });
      } catch {
        setWeatherSnap(null);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    void loadWeatherSnapshot();
  }, []);

  const handleVoiceQuery = (query: string) => {
    const lower = query.toLowerCase();
    if (lower.includes('weather') || query.includes('వాతావరణ')) return navigate('/weather');
    if (lower.includes('disease') || query.includes('తెగులు')) return navigate('/disease-detect');
    if (lower.includes('price') || query.includes('ధర')) return navigate('/market-prices');
    navigate('/crop-recommend');
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Welcome Banner */}
      <div className="mb-8 rounded-[24px] bg-gradient-to-br from-primary-500/90 to-primary-700/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(var(--color-primary-600),0.4)] backdrop-blur-md border border-white/30 text-white p-8 shadow-lg relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-500/20 backdrop-blur-md border border-primary-500/30 text-primary-900 dark:text-primary-3000 blur-3xl opacity-50"></div>
        
        <div className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-200 mb-2">Smart Agriculture Workspace</p>
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight mb-4">
            {language === 'te' ? `నమస్కారం, ${user?.name || 'రైతు'}` : `Welcome back, ${user?.name || 'Farmer'}`}
          </h1>
          <p className="max-w-2xl text-primary-100 text-lg">
            {language === 'te'
              ? 'మీ డ్యాష్‌బోర్డ్ సిద్ధంగా ఉంది. ఇక్కడ మీ పొలం గురించిన ముఖ్యాంశాలు చూడండి.'
              : 'Here is what is happening on your farm today. Stay updated with live weather, alerts, and AI insights.'}
          </p>
        </div>
      </div>

      {/* Voice Assistant */}
      <div className="mb-8">
        <VoiceQueryInput onQuery={handleVoiceQuery} />
      </div>

      {/* Top Widgets Row */}
      <motion.div 
        className="mb-8 grid gap-6 md:grid-cols-3"
        initial="initial"
        animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
      >
        
        {/* Weather Widget */}
        <motion.div 
          variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
          onClick={() => navigate('/weather')}
          className="glass-card p-6 flex flex-col justify-between cursor-pointer group min-h-[160px] scale-hover"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-900 dark:text-blue-300 text-blue-600 p-2.5 rounded-xl shadow-sm">
              <CloudRain size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Current Weather</p>
            {isLoadingWeather ? (
              <Skeleton variant="text" width="75%" height="32px" />
            ) : weatherSnap ? (
              <div>
                <div className="text-3xl font-display font-bold text-gray-900 dark:text-white drop-shadow-sm">{weatherSnap.tempC}°C</div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{weatherSnap.desc} • {weatherSnap.rainChance24h}% Rain Chance</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Location required</p>
            )}
          </div>
        </motion.div>

        {/* Alerts Widget */}
        <motion.div 
          variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
          className="glass-card p-6 flex flex-col justify-between min-h-[160px] scale-hover"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl shadow-sm ${alertCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-[#4eb69c]/20 backdrop-blur-md border border-[#4eb69c]/30 text-[#111] dark:text-[#4eb69c] text-[#4eb69c]'}`}>
              <Activity size={24} />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Active Alerts</p>
            <div className="text-3xl font-display font-bold text-gray-900 dark:text-white drop-shadow-sm">{alertCount}</div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{alertCount > 0 ? 'Requires attention' : 'All systems normal'}</p>
          </div>
        </motion.div>

        {/* Farm Profile Widget */}
        <motion.div 
          variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
          onClick={() => navigate('/profile')}
          className="glass-card p-6 flex flex-col justify-between cursor-pointer group min-h-[160px] scale-hover"
        >
           <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl shadow-sm">
              <MapPin size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Farm Profile</p>
            <div className="text-xl font-display font-bold text-gray-900 dark:text-white drop-shadow-sm truncate">
              {profile.location || 'Location Not Set'}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 flex items-center gap-1">
              <Maximize size={14} />
              {profile.landSize ? `${profile.landSize} acres` : 'Size Not Set'}
            </p>
          </div>
        </motion.div>

      </motion.div>

      {/* AI Assistant Banner */}
      <div 
        onClick={() => navigate('/ai-assistant')}
        className="mb-8 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-teal-400/30"
      >
        <div className="flex items-center justify-between p-6 md:p-8">
          <div className="flex items-center gap-6">
            <div className="hidden rounded-2xl bg-white/20 p-4 backdrop-blur-md shadow-sm border border-white/20 md:block">
              <BotMessageSquare size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-white mb-2">Ask AI Farming Assistant</h2>
              <p className="text-teal-50">Get real-time insights, disease analysis, and step-by-step guidance.</p>
            </div>
          </div>
          <div className="rounded-full bg-white p-3 text-teal-600 shadow-sm">
            <ArrowRight size={24} />
          </div>
        </div>
      </div>

      {/* Quick Tools Grid */}
      <div>
        <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm mb-4">Quick Tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { id: 1, title: t('disease_detection'), icon: <Bug size={24}/>, path: '/disease-detect', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100' },
            { id: 2, title: t('farming_tips'), icon: <Lightbulb size={24}/>, path: '/farming-tips', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
            { id: 3, title: t('govt_schemes'), icon: <Activity size={24}/>, path: '/govt-schemes', color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100' },
          ].map(tool => (
            <GlowCard 
              key={tool.id} 
              className="cursor-pointer"
            >
            <div
              onClick={() => navigate(tool.path)}
              className="flex items-center p-4 group"
            >
              <div className={`p-3 rounded-xl border ${tool.bg} ${tool.color} mr-4 transition-transform group-hover:scale-110 shadow-sm`}>
                {tool.icon}
              </div>
              <div className="flex-1 font-semibold text-gray-900 dark:text-white drop-shadow-sm">{tool.title}</div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </div>
  );
}
