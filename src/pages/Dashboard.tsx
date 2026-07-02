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
      <div className="mb-8 rounded-[24px] bg-primary-600 p-8 shadow-lg relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-500 blur-3xl opacity-50"></div>
        
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
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        
        {/* Weather Widget */}
        <div 
          onClick={() => navigate('/weather')}
          className="glass-card p-6 flex flex-col justify-between cursor-pointer group min-h-[160px]"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shadow-sm">
              <CloudRain size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Current Weather</p>
            {isLoadingWeather ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            ) : weatherSnap ? (
              <div>
                <div className="text-3xl font-display font-bold text-gray-900">{weatherSnap.tempC}°C</div>
                <p className="text-sm text-gray-600 mt-1">{weatherSnap.desc} • {weatherSnap.rainChance24h}% Rain Chance</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Location required</p>
            )}
          </div>
        </div>

        {/* Alerts Widget */}
        <div className="glass-card p-6 flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2.5 rounded-xl shadow-sm ${alertCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
              <Activity size={24} />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Active Alerts</p>
            <div className="text-3xl font-display font-bold text-gray-900">{alertCount}</div>
            <p className="text-sm text-gray-600 mt-1">{alertCount > 0 ? 'Requires attention' : 'All systems normal'}</p>
          </div>
        </div>

        {/* Farm Profile Widget */}
        <div 
          onClick={() => navigate('/profile')}
          className="glass-card p-6 flex flex-col justify-between cursor-pointer group min-h-[160px]"
        >
           <div className="flex justify-between items-start mb-4">
            <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl shadow-sm">
              <MapPin size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Farm Profile</p>
            <div className="text-xl font-display font-bold text-gray-900 truncate">
              {profile.location || 'Location Not Set'}
            </div>
            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
              <Maximize size={14} />
              {profile.landSize ? `${profile.landSize} acres` : 'Size Not Set'}
            </p>
          </div>
        </div>

      </div>

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
        <h2 className="text-xl font-bold font-display text-gray-900 mb-4">Quick Tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { id: 1, title: t('disease_detection'), icon: <Bug size={24}/>, path: '/disease-detect', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100' },
            { id: 2, title: t('farming_tips'), icon: <Lightbulb size={24}/>, path: '/farming-tips', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
            { id: 3, title: t('govt_schemes'), icon: <Activity size={24}/>, path: '/govt-schemes', color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100' },
          ].map(tool => (
            <div 
              key={tool.id} 
              onClick={() => navigate(tool.path)}
              className="glass-card flex items-center p-4 cursor-pointer group"
            >
              <div className={`p-3 rounded-xl border ${tool.bg} ${tool.color} mr-4 transition-transform group-hover:scale-110 shadow-sm`}>
                {tool.icon}
              </div>
              <div className="flex-1 font-semibold text-gray-800">{tool.title}</div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
