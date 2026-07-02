import { Sprout, LogOut, SlidersHorizontal, UserRound, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { simpleMode, setSimpleMode } = useAppSettings();
  const { user, canAccessAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-gray-200/60 bg-white/80 backdrop-blur-md text-gray-800 shadow-sm transition-all duration-300">
      <div className="container mx-auto h-full flex items-center justify-between px-4 lg:px-8">
        <div className="flex cursor-pointer items-center space-x-2" onClick={() => navigate('/')}>
          <div className="bg-primary-50 text-primary-600 p-1.5 rounded-xl border border-primary-100 shadow-sm">
            <Sprout size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 font-display">{t('app_title')}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3">
          <NotificationCenter />
          <button
            onClick={() => navigate('/profile')}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 md:flex transition-colors shadow-sm"
          >
            <UserRound size={16} />
            Profile
          </button>
          {canAccessAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="hidden items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 md:flex transition-colors shadow-sm"
            >
              <ShieldCheck size={16} />
              Admin
            </button>
          )}
          <button
            onClick={() => setSimpleMode(!simpleMode)}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 md:flex transition-colors shadow-sm"
            title="Simple Mode"
          >
            <SlidersHorizontal size={16} />
            {simpleMode ? 'Simple' : 'Smart'}
          </button>
          <button
            onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
            className="rounded-xl bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors shadow-sm"
          >
            {language === 'en' ? 'TE' : 'EN'}
          </button>
          <button
            onClick={() => void handleLogout()}
            className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
