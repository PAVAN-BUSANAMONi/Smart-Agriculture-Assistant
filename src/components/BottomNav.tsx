import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, CloudRain, BotMessageSquare, UserRound } from 'lucide-react';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: <Sprout size={24} />, label: 'Home', path: '/' },
    { icon: <CloudRain size={24} />, label: 'Weather', path: '/weather' },
    { icon: <BotMessageSquare size={24} />, label: 'AI', path: '/ai-assistant' },
    { icon: <UserRound size={24} />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 flex justify-around items-center h-[72px] z-50 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard');
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${isActive ? 'text-primary-600 translate-y-[-2px]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <div className={isActive ? 'bg-primary-50 p-1.5 rounded-full' : 'p-1.5'}>
                {item.icon}
            </div>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
