import { Sprout, LogOut, SlidersHorizontal, UserRound, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { simpleMode, setSimpleMode } = useAppSettings();
  const { user, canAccessAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const glassButton = "hidden items-center gap-2 rounded-full border border-white/50 bg-white/20 dark:bg-white/10 px-4 py-1.5 text-sm font-bold text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-white/30 dark:hover:bg-white/20 md:flex transition backdrop-blur-md drop-shadow-sm";
  const glassIconButton = "rounded-full border border-white/50 bg-white/20 dark:bg-white/10 p-2 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-white/30 dark:hover:bg-white/20 transition backdrop-blur-md";

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/40 dark:border-white/20 bg-white/10 dark:bg-black/20 backdrop-blur-3xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all duration-300">
      <div className="container mx-auto h-full flex items-center justify-between px-4 lg:px-8">
        <div className="flex cursor-pointer items-center space-x-2" onClick={() => navigate('/')}>
          <div className="bg-gradient-to-br from-[#4eb69c]/90 to-[#235e4f]/90 text-white p-1.5 rounded-full border border-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_2px_8px_rgba(35,94,79,0.5)]">
            <Sprout size={24} className="drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-[1.2rem] font-black tracking-tight text-[#111] dark:text-white drop-shadow-md">{t('app_title')}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3">
          <NotificationCenter />
          <button
            onClick={() => navigate('/profile')}
            className={glassButton}
          >
            <UserRound size={16} />
            Profile
          </button>
          {canAccessAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="hidden items-center gap-2 rounded-full border border-[#4eb69c]/50 bg-[#4eb69c]/20 px-4 py-1.5 text-sm font-bold text-[#113a30] dark:text-[#4eb69c] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-[#4eb69c]/30 md:flex transition backdrop-blur-md drop-shadow-sm"
            >
              <ShieldCheck size={16} />
              Admin
            </button>
          )}
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className={glassButton}
            title="Simple Mode"
          >
            <SlidersHorizontal size={16} />
            {simpleMode ? 'Simple' : 'Smart'}
          </button>
          
          <button
            onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
            className="rounded-full border border-white/50 bg-white/20 dark:bg-white/10 px-3 py-1.5 text-sm font-black text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-white/30 dark:hover:bg-white/20 transition backdrop-blur-md drop-shadow-sm"
          >
            {language === 'en' ? 'TE' : 'EN'}
          </button>

          <button
            onClick={toggleTheme}
            className="rounded-full border border-white/50 bg-white/20 dark:bg-white/10 p-2 text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-white/30 dark:hover:bg-white/20 transition backdrop-blur-md"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => void handleLogout()}
            className="rounded-full border border-red-400/50 bg-red-500/20 p-2 text-red-900 dark:text-red-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-red-500/40 transition backdrop-blur-md"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
