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
    <div className="md:hidden fixed bottom-6 left-4 right-4 rounded-[30px] bg-white/10 dark:bg-black/20 backdrop-blur-3xl border border-white/40 dark:border-white/10 flex justify-around items-center h-[72px] z-50 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.6)]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/dashboard');
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${isActive ? 'text-[#111] dark:text-white translate-y-[-2px] drop-shadow-md' : 'text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 drop-shadow-sm'}`}
          >
            <div className={isActive ? 'bg-gradient-to-br from-[#4eb69c]/80 to-[#235e4f]/80 text-white p-2 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_8px_rgba(35,94,79,0.3)]' : 'p-2'}>
                {item.icon}
            </div>
            <span className="text-[10px] font-black">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
