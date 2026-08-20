import { Sprout, LogOut, SlidersHorizontal, UserRound, ShieldCheck, Moon, Sun, PanelLeft, PanelLeftClose, Menu } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { simpleMode, setSimpleMode, sidebarOpen, toggleSidebar } = useAppSettings();
  const { user, canAccessAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const glassPillButton =
    'hidden md:inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2';

  const glassIconButton =
    'inline-flex items-center justify-center rounded-full border border-white/18 bg-white/10 hover:bg-white/20 p-2 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2';

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/12 bg-[#04121b]/60 dark:bg-[#04121b]/80 backdrop-blur-[24px] saturate(115%) shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all duration-300">
      <div className="container mx-auto h-full flex items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Left Section: Menu Toggle + Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.30)] backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95"
            title={sidebarOpen ? 'Collapse Tools' : 'Open Tools & Navigation'}
            aria-label="Toggle Tools Menu"
          >
            {sidebarOpen ? (
              <PanelLeftClose size={18} className="text-emerald-300" />
            ) : (
              <PanelLeft size={18} className="text-white/80 hover:text-white" />
            )}
          </button>

          {/* Brand / Logo */}
          <div
            className="flex cursor-pointer items-center space-x-2.5 group"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
            aria-label="Go to Dashboard"
          >
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-white/15 group-hover:bg-white/25 border border-white/25 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.40)] backdrop-blur-md transition-all duration-200 group-hover:scale-105">
              <Sprout size={19} className="drop-shadow-sm text-emerald-300" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white/95 drop-shadow-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] sm:max-w-none">
                {t('app_title')}
              </h1>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <NotificationCenter />

          <button
            onClick={() => navigate('/profile')}
            className={glassPillButton}
            title="Profile"
            aria-label="Profile"
          >
            <UserRound size={14} className="opacity-80" />
            <span>Profile</span>
          </button>

          {canAccessAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-teal-300/30 bg-teal-400/15 hover:bg-teal-400/25 px-3.5 py-1.5 text-xs font-semibold text-teal-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2"
              title="Admin Panel"
              aria-label="Admin Panel"
            >
              <ShieldCheck size={14} className="text-teal-200" />
              <span>Admin</span>
            </button>
          )}

          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className={glassPillButton}
            title={simpleMode ? 'Switch to Smart Mode' : 'Switch to Simple Mode'}
            aria-label="Toggle Simple Mode"
          >
            <SlidersHorizontal size={14} className="opacity-80" />
            <span>{simpleMode ? 'Simple' : 'Smart'}</span>
          </button>

          <button
            onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
            className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/10 hover:bg-white/20 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2"
            title="Switch Language"
            aria-label="Switch Language"
          >
            {language === 'en' ? 'TE' : 'EN'}
          </button>

          <button
            onClick={toggleTheme}
            className={glassIconButton}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={() => void handleLogout()}
            className="inline-flex items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/15 hover:bg-rose-500/25 p-2 text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

