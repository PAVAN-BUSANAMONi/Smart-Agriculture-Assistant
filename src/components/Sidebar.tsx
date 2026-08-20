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
    { icon: <Sprout size={18} />, label: t('crop_recommendation'), path: '/crop-recommend', featureKey: 'cropRecommendation' },
    { icon: <CloudRain size={18} />, label: t('weather_forecast'), path: '/weather', featureKey: 'weather' },
    { icon: <Bug size={18} />, label: t('disease_detection'), path: '/disease-detect', featureKey: 'diseaseDetection' },
    { icon: <BotMessageSquare size={18} />, label: 'AI Assistant', path: '/ai-assistant' },
    { icon: <TrendingUp size={18} />, label: t('market_prices'), path: '/market-prices', featureKey: 'marketPrices' },
    { icon: <LineChart size={18} />, label: 'Profit Estimator', path: '/profit-estimator', featureKey: 'profitEstimator' },
    { icon: <Calculator size={18} />, label: t('fertilizer_calc'), path: '/fertilizer-calc', featureKey: 'fertilizerCalculator' },
    { icon: <Landmark size={18} />, label: t('govt_schemes'), path: '/govt-schemes', featureKey: 'govtSchemes' },
    { icon: <Lightbulb size={18} />, label: t('farming_tips'), path: '/farming-tips' },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.featureKey && !isFeatureEnabled(item.featureKey) && !canAccessAdmin) return false;
    return true;
  });

  const isDashboardActive = location.pathname === '/' || location.pathname === '/dashboard';

  const getItemClass = (isActive: boolean) => {
    if (isActive) {
      return 'relative bg-white/20 text-white font-semibold border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_16px_-4px_rgba(0,0,0,0.25)] backdrop-blur-xl';
    }
    return 'border border-transparent text-white/70 hover:text-white hover:bg-white/10 hover:border-white/15 font-medium hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200';
  };

  return (
    <aside className="hidden md:flex w-64 flex-col bg-[#04121b]/40 backdrop-blur-[24px] saturate(115%) border-r border-white/12 shadow-[4px_0_24px_rgba(0,0,0,0.20)] h-[calc(100vh-64px)] sticky top-[64px] overflow-y-auto">
      <nav className="flex-1 px-3.5 py-6 space-y-1.5" aria-label="Main Navigation">
        {/* Dashboard Link */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[18px] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2 ${getItemClass(
            isDashboardActive
          )}`}
          aria-current={isDashboardActive ? 'page' : undefined}
        >
          {isDashboardActive && (
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          )}
          <span className={`transition-colors pl-1 ${isDashboardActive ? 'text-emerald-300' : 'text-white/80'}`}>
            <Sprout size={18} />
          </span>
          <span className="text-[13.5px] tracking-tight">Dashboard</span>
        </button>

        {/* Section Divider / Header */}
        <div className="pt-5 pb-1.5">
          <p className="px-3 text-[10.5px] font-semibold text-white/50 uppercase tracking-widest">
            Tools & Utilities
          </p>
        </div>

        {/* Dynamic Tool Items */}
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[18px] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2 ${getItemClass(
                isActive
              )}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
              <span className={`transition-colors pl-1 ${isActive ? 'text-emerald-300' : 'text-white/80'}`}>
                {item.icon}
              </span>
              <span className="truncate text-[13.5px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

