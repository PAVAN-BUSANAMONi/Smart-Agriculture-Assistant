import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Lock, Mail, Moon, Phone, ShieldCheck, Sun, Tractor, UserRound } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type AuthMode = 'login' | 'register';
type AuthRole = 'farmer' | 'admin';

type FarmerForm = {
  name: string;
  phone: string;
  email: string;
};

type AdminForm = {
  name: string;
  email: string;
  password: string;
};

const INITIAL_FARMER_FORM: FarmerForm = {
  name: '',
  phone: '',
  email: '',
};

const INITIAL_ADMIN_FORM: AdminForm = {
  name: '',
  email: '',
  password: '',
};

function PillField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block relative">
      <span className="mb-[6px] block text-[0.8rem] font-bold uppercase tracking-wider text-gray-900 dark:text-white drop-shadow-sm">{label}</span>
      <div className="relative flex items-center gap-3 rounded-full bg-white/10 dark:bg-black/40 px-4 py-3 shadow-[inset_0_4px_8px_rgba(255,255,255,0.9),inset_0_-2px_5px_rgba(255,255,255,0.4),0_6px_15px_rgba(0,0,0,0.1)] border border-white/60 backdrop-blur-xl transition-all focus-within:ring-2 focus-within:ring-[#2a6d5d]/60 focus-within:bg-white/20 dark:bg-black/30 group">
        
        {/* Extreme Glossy Top Highlight for Input */}
        <div className="pointer-events-none absolute inset-x-2 top-[2px] h-[45%] rounded-t-full bg-gradient-to-b from-white/70 to-transparent opacity-80" />
        
        {/* Inner glow on focus */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-focus-within:opacity-100" />

        <span className="relative z-10 text-gray-900 dark:text-gray-200 drop-shadow-sm">{icon}</span>
        <div className="relative z-10 flex-1">
          {children}
        </div>
      </div>
    </label>
  );
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { acceptSession, canAccessAdmin, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [role, setRole] = useState<AuthRole>('farmer');
  const [farmerForm, setFarmerForm] = useState<FarmerForm>(INITIAL_FARMER_FORM);
  const [adminForm, setAdminForm] = useState<AdminForm>(INITIAL_ADMIN_FORM);
  const [otp, setOtp] = useState('');
  const [otpSessionToken, setOtpSessionToken] = useState('');
  const [otpRecipientEmail, setOtpRecipientEmail] = useState('');
  const [otpPurposeLabel, setOtpPurposeLabel] = useState<'login' | 'register'>('login');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const mode: AuthMode = location.pathname === '/register' ? 'register' : 'login';
  const inOtpStep = role === 'admin' && Boolean(otpSessionToken);
  const isFarmer = role === 'farmer';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(canAccessAdmin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [canAccessAdmin, isAuthenticated, navigate]);

  const resetOtpState = () => {
    setOtpSessionToken('');
    setOtp('');
    setOtpRecipientEmail('');
    setNotice('');
  };

  const handleModeSwitch = (nextMode: AuthMode) => {
    setError('');
    setNotice('');
    resetOtpState();
    navigate(nextMode === 'register' ? '/register' : '/login');
  };

  const handleRoleSwitch = (nextRole: AuthRole) => {
    setRole(nextRole);
    setError('');
    setNotice('');
    resetOtpState();
  };

  const handleFarmerSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const session =
        mode === 'register'
          ? await api.farmerRegister({ name: farmerForm.name, phone: farmerForm.phone, email: farmerForm.email || undefined })
          : await api.farmerLogin({ phone: farmerForm.phone });

      acceptSession(session);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminChallenge = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response =
        mode === 'register'
          ? await api.adminRegister({
              name: adminForm.name,
              email: adminForm.email,
              password: adminForm.password,
            })
          : await api.adminLogin({
              email: adminForm.email,
              password: adminForm.password,
            });

      setOtpPurposeLabel(mode);
      setOtpSessionToken(response.otpSessionToken);
      setOtpRecipientEmail(String(response.recipientEmail || ''));
      setOtp('');
      setNotice(response.message);

      if (!response.delivered) {
        const reason = response.deliveryError || 'OTP email delivery is delayed.';
        setError(`${reason} If OTP arrives, enter it below, or tap Resend OTP.`);
        return;
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send OTP right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const session = await api.verifyAdminOtp({
        otpSessionToken,
        otp,
      });

      acceptSession(session);
      navigate('/admin', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'OTP verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response = await api.resendAdminOtp({ otpSessionToken });
      setOtpSessionToken(response.otpSessionToken);
      setOtpRecipientEmail(String(response.recipientEmail || otpRecipientEmail));
      setNotice(response.message);
      if (!response.delivered) {
        const reason = response.deliveryError || 'OTP email delivery is delayed.';
        setError(`${reason} If OTP arrives, enter it below and tap Verify OTP.`);
        return;
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to resend OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const heading = inOtpStep
    ? `Verify ${otpPurposeLabel === 'register' ? 'Signup' : 'Login'}`
    : mode === 'register'
      ? 'Create account'
      : 'Login';
  const subtitle = inOtpStep
    ? otpRecipientEmail
      ? `Enter the 6-digit code sent to ${otpRecipientEmail} to finish ${otpPurposeLabel}.`
      : `Enter the 6-digit code sent to your admin mailbox to finish ${otpPurposeLabel}.`
    : isFarmer
      ? mode === 'register'
        ? 'Farmer signup with name and phone number.'
        : 'Phone-only login for farmers.'
      : mode === 'register'
        ? 'Admin signup with secure email OTP verification.'
        : 'Admin login with email, password, and OTP.';

  const primaryButtonLabel = inOtpStep
    ? 'Verify OTP'
    : isFarmer
      ? mode === 'register'
        ? 'Create farmer account'
        : 'Log in'
      : mode === 'register'
        ? 'Send signup OTP'
        : 'Send login OTP';

  const switchLine = inOtpStep
    ? null
    : mode === 'register'
      ? isFarmer
        ? 'Already registered?'
        : 'Already an admin?'
      : isFarmer
        ? "Don't have a farmer account?"
        : "Don't have an admin account?";

  const switchAction = inOtpStep ? null : mode === 'register' ? 'Login' : 'Register';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Background Images with Crossfade */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div 
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${isFarmer ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundImage: "url('/farmer-bg.jpg.png')" }}
        />
        <div 
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${!isFarmer ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundImage: "url('/admin-bg.jpg.png')" }}
        />
        <div className="absolute inset-0 bg-white/10 dark:bg-black/40 dark:bg-black/60 transition-colors duration-500" />
      </div>

      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="rounded-full bg-white/40 dark:bg-black/50 dark:bg-black/40 p-2 text-gray-900 dark:text-white dark:text-white/90 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white/60 dark:hover:bg-black/60 border border-white/20"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        
        {/* ADVANCED GLOSSY GLASSMORPHISM CARD */}
        <div className="relative w-full min-w-[340px] max-w-[420px] rounded-[42px] bg-white/20 dark:bg-black/30 bg-gradient-to-br from-white/40 via-white/5 to-transparent px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-1px_3px_rgba(255,255,255,0.4),0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-2xl sm:px-8 sm:py-10">
          
          <div className="relative z-10 flex flex-col items-center gap-5">
            
            {/* SWAPPED TO TOP: Role Toggle: Farmer / Admin */}
            {!inOtpStep && (
              <div className="flex w-max gap-3 mb-1">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('farmer')}
                  className={`relative inline-flex items-center gap-2 rounded-full px-6 py-2 text-[0.95rem] font-bold transition overflow-hidden border ${
                    isFarmer ? 'border-[#3c8e7a]/80 bg-gradient-to-b from-[#4eb69c]/30 to-[#2a6d5d]/20 text-[#1b5042] dark:text-[#a7f3d0] shadow-[inset_0_1px_3px_rgba(255,255,255,0.6)] drop-shadow-md' : 'border-white/30 bg-white/10 dark:bg-black/40 text-gray-900 dark:text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] hover:bg-white/30'
                  }`}
                >
                  {isFarmer && <div className="pointer-events-none absolute inset-x-1 top-[2px] h-[45%] rounded-full bg-gradient-to-b from-white/40 to-transparent" />}
                  <Tractor size={18} className="relative z-10" />
                  <span className="relative z-10">Farmer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('admin')}
                  className={`relative inline-flex items-center gap-2 rounded-full px-6 py-2 text-[0.95rem] font-bold transition overflow-hidden border ${
                    !isFarmer ? 'border-[#3c8e7a]/80 bg-gradient-to-b from-[#4eb69c]/30 to-[#2a6d5d]/20 text-[#1b5042] dark:text-[#a7f3d0] shadow-[inset_0_1px_3px_rgba(255,255,255,0.6)] drop-shadow-md' : 'border-white/30 bg-white/10 dark:bg-black/40 text-gray-900 dark:text-gray-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] hover:bg-white/30'
                  }`}
                >
                  {!isFarmer && <div className="pointer-events-none absolute inset-x-1 top-[2px] h-[45%] rounded-full bg-gradient-to-b from-white/40 to-transparent" />}
                  <ShieldCheck size={18} className="relative z-10" />
                  <span className="relative z-10">Admin</span>
                </button>
              </div>
            )}

            {/* SWAPPED TO BOTTOM: Mode Toggle: Login / Sign Up */}
            <div className="flex w-max gap-3">
              <button
                type="button"
                onClick={() => handleModeSwitch('login')}
                className={`relative overflow-hidden rounded-full px-8 py-2.5 text-[0.95rem] font-black transition ${
                  mode === 'login' ? 'bg-gradient-to-b from-white to-gray-200 text-[#1b5042] dark:text-[#a7f3d0] shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.1)]' : 'bg-black/10 border border-white/40 text-gray-900 dark:text-gray-200 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)] hover:bg-white/30'
                }`}
              >
                {mode === 'login' && <div className="pointer-events-none absolute inset-x-2 top-1 h-[40%] rounded-full bg-gradient-to-b from-white/80 to-transparent" />}
                <span className="relative z-10">Login</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className={`relative overflow-hidden rounded-full px-8 py-2.5 text-[0.95rem] font-black transition ${
                  mode === 'register' ? 'bg-gradient-to-b from-white to-gray-200 text-[#1b5042] dark:text-[#a7f3d0] shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.1)]' : 'bg-black/10 border border-white/40 text-gray-900 dark:text-gray-200 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)] hover:bg-white/30'
                }`}
              >
                {mode === 'register' && <div className="pointer-events-none absolute inset-x-2 top-1 h-[40%] rounded-full bg-gradient-to-b from-white/80 to-transparent" />}
                <span className="relative z-10">Sign Up</span>
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-10 text-center">
            <h1 className="font-[var(--font-sans-app)] text-[2.8rem] font-black tracking-tight text-[#111] dark:text-white sm:text-[3rem] drop-shadow-lg">
              {heading}
            </h1>
            <p className="mx-auto mt-2 max-w-[290px] text-[1rem] font-bold leading-6 text-gray-900 dark:text-gray-200 drop-shadow-md">{subtitle}</p>
          </div>

          {notice && (
            <div className="relative z-10 mt-6 rounded-2xl border border-[#3c8e7a]/60 bg-[#3c8e7a]/30 px-4 py-3 text-center text-sm font-bold text-[#113a30] backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
              {notice}
            </div>
          )}

          {!inOtpStep && isFarmer && (
            <form onSubmit={handleFarmerSubmit} className="relative z-10 mt-8 space-y-6">
              {mode === 'register' && (
                <PillField label="Name" icon={<UserRound size={20} />}>
                  <input
                    value={farmerForm.name}
                    onChange={(event) => setFarmerForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                    placeholder="Enter name"
                    className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 placeholder:font-bold drop-shadow-sm"
                  />
                </PillField>
              )}

              {mode === 'register' && (
                <PillField label="Email (Optional)" icon={<Mail size={20} />}>
                  <input
                    type="email"
                    value={farmerForm.email}
                    onChange={(event) => setFarmerForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Enter email for alerts"
                    className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 placeholder:font-bold drop-shadow-sm"
                  />
                </PillField>
              )}

              <PillField label="Phone Number" icon={<Phone size={20} />}>
                <input
                  value={farmerForm.phone}
                  onChange={(event) => setFarmerForm((prev) => ({ ...prev, phone: event.target.value }))}
                  required
                  placeholder="Enter phone number"
                  className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 placeholder:font-bold drop-shadow-sm"
                />
              </PillField>

              {error && <div className="rounded-2xl border border-red-400/60 bg-red-400/40 px-4 py-3 text-sm font-bold text-red-900 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]">{error}</div>}

              {/* ADVANCED GLOSSY EMERALD BUTTON */}
              <button
                type="submit"
                disabled={submitting}
                className="relative mt-8 inline-flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#4eb69c]/90 to-[#235e4f]/90 text-[1.15rem] font-black text-white shadow-[inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-3px_8px_rgba(0,0,0,0.6),0_10px_25px_rgba(35,94,79,0.5)] border border-white/40 backdrop-blur-2xl transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 overflow-hidden"
              >
                {/* Advanced 3D Gel Highlights */}
                <div className="pointer-events-none absolute inset-x-2 top-[3px] h-[45%] rounded-full bg-gradient-to-b from-white/70 to-transparent" />
                <div className="pointer-events-none absolute inset-x-6 bottom-[2px] h-[30%] rounded-full bg-gradient-to-t from-white/30 to-transparent blur-[2px]" />
                
                <span className="relative z-10 drop-shadow-md">{submitting ? 'verifying...' : primaryButtonLabel}</span>
                <ArrowRight size={22} className="relative z-10 ml-2 drop-shadow-md" />
              </button>
            </form>
          )}

          {!inOtpStep && !isFarmer && (
            <form onSubmit={handleAdminChallenge} className="relative z-10 mt-8 space-y-6">
              {mode === 'register' && (
                <PillField label="Name" icon={<ShieldCheck size={20} />}>
                  <input
                    value={adminForm.name}
                    onChange={(event) => setAdminForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                    placeholder="Enter name"
                    className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 placeholder:font-bold drop-shadow-sm"
                  />
                </PillField>
              )}

              <PillField label="Email" icon={<Mail size={20} />}>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  placeholder="Enter email"
                  className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 placeholder:font-bold drop-shadow-sm"
                />
              </PillField>

              <PillField label="Password" icon={<Lock size={20} />}>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  placeholder="Enter password"
                  className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 placeholder:font-bold drop-shadow-sm"
                />
              </PillField>

              {error && <div className="rounded-2xl border border-red-400/60 bg-red-400/40 px-4 py-3 text-sm font-bold text-red-900 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]">{error}</div>}

              {/* ADVANCED GLOSSY EMERALD BUTTON */}
              <button
                type="submit"
                disabled={submitting}
                className="relative mt-8 inline-flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#4eb69c]/90 to-[#235e4f]/90 text-[1.15rem] font-black text-white shadow-[inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-3px_8px_rgba(0,0,0,0.6),0_10px_25px_rgba(35,94,79,0.5)] border border-white/40 backdrop-blur-2xl transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 overflow-hidden"
              >
                {/* Advanced 3D Gel Highlights */}
                <div className="pointer-events-none absolute inset-x-2 top-[3px] h-[45%] rounded-full bg-gradient-to-b from-white/70 to-transparent" />
                <div className="pointer-events-none absolute inset-x-6 bottom-[2px] h-[30%] rounded-full bg-gradient-to-t from-white/30 to-transparent blur-[2px]" />
                
                <span className="relative z-10 drop-shadow-md">{submitting ? 'Sending OTP...' : primaryButtonLabel}</span>
                <ArrowRight size={22} className="relative z-10 ml-2 drop-shadow-md" />
              </button>
            </form>
          )}

          {inOtpStep && (
            <form onSubmit={handleVerifyOtp} className="relative z-10 mt-8 space-y-6">
              <PillField label="OTP Code" icon={<KeyRound size={20} />}>
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="Enter 6-digit OTP"
                  className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 placeholder:font-bold drop-shadow-sm"
                />
              </PillField>

              {error && <div className="rounded-2xl border border-red-400/60 bg-red-400/40 px-4 py-3 text-sm font-bold text-red-900 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]">{error}</div>}

              {/* ADVANCED GLOSSY EMERALD BUTTON */}
              <button
                type="submit"
                disabled={submitting}
                className="relative mt-8 inline-flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#4eb69c]/90 to-[#235e4f]/90 text-[1.15rem] font-black text-white shadow-[inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-3px_8px_rgba(0,0,0,0.6),0_10px_25px_rgba(35,94,79,0.5)] border border-white/40 backdrop-blur-2xl transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 overflow-hidden"
              >
                {/* Advanced 3D Gel Highlights */}
                <div className="pointer-events-none absolute inset-x-2 top-[3px] h-[45%] rounded-full bg-gradient-to-b from-white/70 to-transparent" />
                <div className="pointer-events-none absolute inset-x-6 bottom-[2px] h-[30%] rounded-full bg-gradient-to-t from-white/30 to-transparent blur-[2px]" />
                
                <span className="relative z-10 drop-shadow-md">{submitting ? 'Verifying...' : primaryButtonLabel}</span>
                <ArrowRight size={22} className="relative z-10 ml-2 drop-shadow-md" />
              </button>

              <div className="flex items-center justify-center gap-6 pt-3 text-[0.95rem] font-black text-gray-900 dark:text-white drop-shadow-md">
                <button
                  type="button"
                  onClick={() => {
                    resetOtpState();
                    setError('');
                  }}
                  className="transition hover:text-white"
                >
                  Back
                </button>
                <button type="button" onClick={() => void handleResendOtp()} className="transition hover:text-white">
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {!inOtpStep && switchLine && switchAction && (
            <div className="relative z-10 mt-10 text-center text-[1rem] font-bold text-gray-900 dark:text-white drop-shadow-md">
              <span>{switchLine} </span>
              <button
                type="button"
                onClick={() => handleModeSwitch(mode === 'register' ? 'login' : 'register')}
                className="text-white drop-shadow-lg transition hover:text-gray-200 ml-1 font-black"
              >
                {switchAction}
              </button>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={() => navigate('/owner')}
                  className="font-black text-[0.8rem] uppercase tracking-[0.2em] text-[#111] dark:text-white transition hover:text-white drop-shadow-md"
                >
                  Owner Access
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
