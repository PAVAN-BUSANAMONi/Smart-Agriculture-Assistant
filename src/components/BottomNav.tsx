import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, CloudRain, BotMessageSquare, UserRound } from 'lucide-react';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Sprout size={20} />, label: 'Home', path: '/' },
    { icon: <CloudRain size={20} />, label: 'Weather', path: '/weather' },
    { icon: <BotMessageSquare size={20} />, label: 'AI', path: '/ai-assistant' },
    { icon: <UserRound size={20} />, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="md:hidden fixed bottom-4 left-3.5 right-3.5 rounded-[26px] bg-[#04121b]/80 backdrop-blur-[24px] saturate(120%) border border-white/20 flex justify-around items-center h-[66px] z-50 shadow-[0_12px_36px_rgba(0,0,0,0.50),inset_0_1px_1px_rgba(255,255,255,0.30)]"
    >
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard');
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2 ${
              isActive ? 'text-white font-semibold' : 'text-white/60 hover:text-white/90'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              className={`flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 border border-white/30 text-emerald-300 p-1.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.40)] backdrop-blur-md scale-105'
                  : 'p-1.5 text-white/70'
              }`}
            >
              {item.icon}
            </div>
            <span className={`text-[10px] tracking-tight ${isActive ? 'font-semibold text-white' : 'font-normal text-white/60'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

