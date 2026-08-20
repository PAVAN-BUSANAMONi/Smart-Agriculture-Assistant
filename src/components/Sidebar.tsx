import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Sprout,
  CloudRain,
  Bug,
  Lightbulb,
  Calculator,
  TrendingUp,
  Landmark,
  LineChart,
  BotMessageSquare,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { canAccessAdmin, isFeatureEnabled } = useAuth();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useAppSettings();

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

  const handleNav = (path: string) => {
    navigate(path);
    // On small screens, close after selection
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* 🟢 FLOATING GLIDER TAB (Visible when sidebar is closed on Desktop & Mobile) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed left-0 top-32 sm:top-36 z-40"
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              title="Open Dashboard Tools & Menu"
              aria-label="Open Dashboard Tools"
              className="group flex items-center gap-2 pl-2 pr-3.5 py-2.5 rounded-r-2xl bg-[#04121b]/85 hover:bg-[#072435]/95 text-white border-y border-r border-white/25 shadow-[4px_8px_24px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-white/90"
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-xl bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                <LayoutGrid size={15} />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300 drop-shadow-sm flex items-center gap-1">
                  Tools <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="text-[9px] text-white/60 font-medium">Glider Menu</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 DESKTOP COLLAPSIBLE SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="hidden md:flex flex-col bg-[#04121b]/45 backdrop-blur-[28px] saturate(115%) border-r border-white/12 shadow-[4px_0_24px_rgba(0,0,0,0.25)] h-[calc(100vh-64px)] sticky top-[64px] overflow-hidden select-none shrink-0"
      >
        <div className="w-[280px] flex flex-col h-full">
          {/* Header with Close / Collapse Glider */}
          <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <LayoutGrid size={15} />
              </span>
              <span className="text-xs font-bold text-white tracking-wide uppercase">Farm Workspace</span>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/20 transition-all active:scale-90"
              title="Collapse Menu"
              aria-label="Collapse Menu"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <nav className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto" aria-label="Main Navigation">
            {/* Dashboard Link */}
            <button
              type="button"
              onClick={() => handleNav('/')}
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
            <div className="pt-4 pb-1">
              <p className="px-3 text-[10px] font-semibold text-white/50 uppercase tracking-widest">
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
                  onClick={() => handleNav(item.path)}
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
        </div>
      </motion.aside>

      {/* 🟢 MOBILE SLIDE-OVER DRAWER (Glides over whole screen on demand) */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-[300px] max-w-[85vw] bg-[#04121b]/95 backdrop-blur-3xl border-r border-white/20 p-4 shadow-[12px_0_40px_rgba(0,0,0,0.7)] flex flex-col h-full z-10"
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/12">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                    <Sprout size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Smart Agriculture</h2>
                    <p className="text-[10px] text-white/60">Farm Tools & Options</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/80 transition-all active:scale-90"
                  aria-label="Close Menu"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Mobile Navigation List */}
              <nav className="flex-1 overflow-y-auto space-y-1.5 py-2" aria-label="Mobile Drawer Navigation">
                <button
                  type="button"
                  onClick={() => handleNav('/')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${getItemClass(
                    isDashboardActive
                  )}`}
                >
                  <span className={`pl-1 ${isDashboardActive ? 'text-emerald-300' : 'text-white/80'}`}>
                    <Sprout size={18} />
                  </span>
                  <span className="text-[14px]">Dashboard</span>
                </button>

                <div className="pt-4 pb-1">
                  <p className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Tools & Utilities
                  </p>
                </div>

                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNav(item.path)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all ${getItemClass(
                        isActive
                      )}`}
                    >
                      <span className={`pl-1 ${isActive ? 'text-emerald-300' : 'text-white/80'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate text-[14px]">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Bottom Quick Dismiss Pill */}
              <div className="pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white/80 font-medium flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={14} /> Close Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
