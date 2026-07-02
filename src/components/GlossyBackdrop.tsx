import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function GlossyBackdrop() {
  const { user } = useAuth();
  const location = useLocation();
  
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/owner';
  
  // Auth pages manage their own backgrounds, so we skip rendering here
  if (isAuthPage) return null; 

  const isAdmin = user?.role === 'admin';
  const bgImage = isAdmin ? '/admin-bg.jpg.png' : '/farmer-bg.jpg.png';

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-900">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      {/* Dark mode overlay to ensure readability */}
      <div className="absolute inset-0 bg-white/20 dark:bg-black/50 transition-colors duration-500" />
    </div>
  );
}
