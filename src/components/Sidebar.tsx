import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Sprout, CloudRain, Bug, Lightbulb, Calculator, TrendingUp, Landmark, LineChart, BotMessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { canAccessAdmin, isFeatureEnabled } = useAuth();

  const navItems = [
    { icon: <Sprout size={20} />, label: t('crop_recommendation'), path: '/crop-recommend', featureKey: 'cropRecommendation' },
    { icon: <CloudRain size={20} />, label: t('weather_forecast'), path: '/weather', featureKey: 'weather' },
    { icon: <Bug size={20} />, label: t('disease_detection'), path: '/disease-detect', featureKey: 'diseaseDetection' },
    { icon: <BotMessageSquare size={20} />, label: 'AI Assistant', path: '/ai-assistant' },
    { icon: <TrendingUp size={20} />, label: t('market_prices'), path: '/market-prices', featureKey: 'marketPrices' },
    { icon: <LineChart size={20} />, label: 'Profit Estimator', path: '/profit-estimator', featureKey: 'profitEstimator' },
    { icon: <Calculator size={20} />, label: t('fertilizer_calc'), path: '/fertilizer-calc', featureKey: 'fertilizerCalculator' },
    { icon: <Landmark size={20} />, label: t('govt_schemes'), path: '/govt-schemes', featureKey: 'govtSchemes' },
    { icon: <Lightbulb size={20} />, label: t('farming_tips'), path: '/farming-tips' },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.featureKey && !isFeatureEnabled(item.featureKey) && !canAccessAdmin) return false;
    return true;
  });

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      return 'bg-white/40 dark:bg-white/20 text-[#111] dark:text-white font-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] border border-white/50 drop-shadow-md';
    }
    return 'text-gray-900 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border border-transparent hover:border-white/40 font-bold drop-shadow-sm';
  };

  const isDashboardActive = location.pathname === '/' || location.pathname === '/dashboard';

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white/10 dark:bg-black/20 backdrop-blur-3xl border-r border-white/30 dark:border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.1)] h-[calc(100vh-64px)] sticky top-[64px] overflow-y-auto">
      <nav className="flex-1 px-4 py-6 space-y-2">
        <button 
          onClick={() => navigate('/')} 
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all ${getButtonClass(isDashboardActive)}`}
        >
          <Sprout size={20} className={isDashboardActive ? 'text-[#2a6d5d] dark:text-[#4eb69c]' : 'text-gray-700 dark:text-gray-400'} />
          <span>Dashboard</span>
        </button>
        
        <div className="pt-6 pb-2">
          <p className="px-4 text-xs font-black text-gray-800 dark:text-gray-400 uppercase tracking-widest drop-shadow-sm">Tools & Utilities</p>
        </div>
        
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all ${getButtonClass(isActive)}`}
            >
              <span className={isActive ? 'text-[#2a6d5d] dark:text-[#4eb69c]' : 'text-gray-700 dark:text-gray-400'}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
