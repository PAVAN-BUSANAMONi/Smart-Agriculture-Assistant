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

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white/60 backdrop-blur-md border-r border-gray-200/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-[calc(100vh-64px)] sticky top-[64px] overflow-y-auto">
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        <button 
          onClick={() => navigate('/')} 
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${location.pathname === '/' || location.pathname === '/dashboard' ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm border border-primary-100' : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent'}`}
        >
          <Sprout size={20} className={location.pathname === '/' || location.pathname === '/dashboard' ? 'text-primary-600' : 'text-gray-400'} />
          Dashboard
        </button>
        <div className="pt-6 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools & Utilities</p>
        </div>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm border border-primary-100' : 'text-gray-600 hover:bg-white hover:shadow-sm border border-transparent'}`}
            >
              <span className={isActive ? 'text-primary-600' : 'text-gray-400'}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
