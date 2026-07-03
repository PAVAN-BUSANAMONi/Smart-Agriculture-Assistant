import { useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, CheckCircle2, ShieldAlert, Trash2, UserCheck, UserPlus, Users, UserX, ArrowRight, UserRound, Lock, Edit2 } from 'lucide-react';
import { api, type AuthUser, type OwnerStatusResponse } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

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

export function OwnerAccess() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { acceptSession, isAuthenticated, canAccessAdmin, logout } = useAuth();
  const [credentials, setCredentials] = useState({
    name: '',
    password: '',
  });
  const [ownerStatus, setOwnerStatus] = useState<OwnerStatusResponse | null>(null);
  const [pendingAdmins, setPendingAdmins] = useState<AuthUser[]>([]);
  const [managedUsers, setManagedUsers] = useState<AuthUser[]>([]);
  const [newUser, setNewUser] = useState({
    role: 'farmer' as 'farmer' | 'admin',
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [busyUserId, setBusyUserId] = useState('');
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', email: '', password: '', role: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const ownerLoggedIn = Boolean(isAuthenticated && canAccessAdmin);

  const loadOwnerData = async () => {
    if (!ownerLoggedIn) return;
    setLoading(true);
    setError('');
    try {
      const [status, pending, users] = await Promise.all([
        api.ownerStatus(),
        api.ownerPendingAdmins(),
        api.ownerUsers(),
      ]);
      setOwnerStatus(status);
      setPendingAdmins(Array.isArray(pending.pendingAdmins) ? pending.pendingAdmins : []);
      setManagedUsers(Array.isArray(users.users) ? users.users : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load owner data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOwnerData();
  }, [ownerLoggedIn]);

  const handleOwnerLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const session = await api.ownerLogin({
        name: credentials.name.trim(),
        password: credentials.password,
      });
      acceptSession(session);
      setMessage('Owner session started.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Owner login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (userId: string, decision: 'approve' | 'deny') => {
    setBusyUserId(userId);
    setError('');
    setMessage('');
    try {
      if (decision === 'approve') {
        await api.ownerApproveAdmin(userId);
        setMessage('Admin signup approved.');
      } else {
        await api.ownerDenyAdmin(userId);
        setMessage('Admin signup denied.');
      }
      await loadOwnerData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Action failed.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleCreateUser = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload =
        newUser.role === 'farmer'
          ? {
              role: 'farmer' as const,
              name: newUser.name.trim(),
              phone: newUser.phone.trim(),
              email: newUser.email.trim() || undefined,
            }
          : {
              role: 'admin' as const,
              name: newUser.name.trim(),
              email: newUser.email.trim(),
              password: newUser.password,
            };

      await api.ownerCreateUser(payload);
      setMessage('User created by owner.');
      setNewUser({
        role: 'farmer',
        name: '',
        phone: '',
        email: '',
        password: '',
      });
      await loadOwnerData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: AuthUser) => {
    setBusyUserId(user.id);
    setError('');
    setMessage('');
    try {
      const nextStatus = user.status === 'active' ? 'disabled' : 'active';
      await api.ownerUpdateUser(user.id, { status: nextStatus });
      setMessage(`User status changed to ${nextStatus}.`);
      await loadOwnerData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update user status.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleEditClick = (user: AuthUser) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      phone: user.phone || '',
      email: user.email || '',
      password: '', // only fill if they want to change it
      role: user.role,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setError('');
    setMessage('');
    try {
      const payload: any = { name: editFormData.name };
      if (editFormData.phone) payload.phone = editFormData.phone;
      if (editFormData.email) payload.email = editFormData.email;
      if (editFormData.password) payload.password = editFormData.password;
      
      await api.ownerUpdateUser(editingUser.id, payload);
      setMessage(`User ${editingUser.name} updated successfully.`);
      setEditingUser(null);
      await loadOwnerData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    setBusyUserId(user.id);
    setError('');
    setMessage('');
    try {
      await api.ownerDeleteUser(user.id);
      setMessage(`User ${user.name} removed.`);
      await loadOwnerData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete user.');
    } finally {
      setBusyUserId('');
    }
  };

  const glassCardClasses = "relative w-full rounded-[42px] bg-white/20 dark:bg-black/30 bg-gradient-to-br from-white/40 via-white/5 to-transparent p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-1px_3px_rgba(255,255,255,0.4),0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-2xl sm:p-10 mb-6";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Background Images */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/owner-bg.jpg.png')" }}
        />
        <div className="absolute inset-0 bg-white/10 dark:bg-black/40 dark:bg-black/60 transition-colors duration-500" />
      </div>

      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="rounded-full bg-white/40 dark:bg-black/50 dark:bg-black/40 p-2 text-gray-900 dark:text-white dark:text-white/90 shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-white/60 dark:hover:bg-black/60 border border-white/20"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        
        <div className="mx-auto w-full max-w-5xl">
          
          {!ownerLoggedIn ? (
            <div className="mx-auto max-w-[420px]">
              <div className={glassCardClasses}>
                <div className="relative z-10 text-center">
                  <p className="text-[0.8rem] font-bold uppercase tracking-[0.2em] text-[#1b5042] dark:text-[#a7f3d0] drop-shadow-sm">Owner Session</p>
                  <h1 className="mt-3 font-[var(--font-sans-app)] text-[2.8rem] font-black tracking-tight text-[#111] dark:text-white drop-shadow-lg leading-none">
                    Owner<br/>Access
                  </h1>
                </div>

                {error && <div className="relative z-10 mt-6 rounded-2xl border border-red-400/60 bg-red-400/40 px-4 py-3 text-sm font-bold text-red-900 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]">{error}</div>}
                
                <form onSubmit={handleOwnerLogin} className="relative z-10 mt-8 space-y-6">
                  <PillField label="Name" icon={<UserRound size={20} />}>
                    <input
                      value={credentials.name}
                      onChange={(event) => setCredentials((prev) => ({ ...prev, name: event.target.value }))}
                      required
                      autoComplete="username"
                      placeholder="Owner name"
                      className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 drop-shadow-sm"
                    />
                  </PillField>

                  <PillField label="Password" icon={<Lock size={20} />}>
                    <input
                      type="password"
                      value={credentials.password}
                      onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                      required
                      autoComplete="current-password"
                      placeholder="Owner password"
                      className="w-full bg-transparent text-[1.05rem] font-bold text-gray-900 dark:text-white outline-none placeholder:text-gray-700/80 dark:text-gray-300/80 drop-shadow-sm"
                    />
                  </PillField>

                  <button
                    type="submit"
                    disabled={loading || !credentials.name.trim() || !credentials.password}
                    className="relative mt-8 inline-flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#4eb69c]/90 to-[#235e4f]/90 text-[1.15rem] font-black text-white shadow-[inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-3px_8px_rgba(0,0,0,0.6),0_10px_25px_rgba(35,94,79,0.5)] border border-white/40 backdrop-blur-2xl transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 overflow-hidden"
                  >
                    <div className="pointer-events-none absolute inset-x-2 top-[3px] h-[45%] rounded-full bg-gradient-to-b from-white/70 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-6 bottom-[2px] h-[30%] rounded-full bg-gradient-to-t from-white/30 to-transparent blur-[2px]" />
                    
                    <span className="relative z-10 drop-shadow-md">{loading ? 'Authenticating...' : 'Start owner session'}</span>
                    <ArrowRight size={22} className="relative z-10 ml-2 drop-shadow-md" />
                  </button>
                </form>

                <div className="relative z-10 mt-8 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-black text-[0.85rem] uppercase tracking-[0.1em] text-gray-900 dark:text-white transition hover:text-white drop-shadow-md"
                  >
                    Back to Normal Login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {error ? (
                <div className="rounded-2xl border border-red-400/60 bg-red-400/40 px-4 py-3 mb-6 text-sm font-bold text-red-900 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-2xl border border-[#3c8e7a]/60 bg-[#3c8e7a]/30 px-4 py-3 mb-6 text-sm font-bold text-[#113a30] backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
                  <div className="inline-flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    {message}
                  </div>
                </div>
              ) : null}

              {/* DASHBOARD SECTION 1 */}
              <div className={glassCardClasses}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-[1.8rem] font-black text-[#111] dark:text-white drop-shadow-md">Owner Controls</h2>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => void loadOwnerData()}
                      className="rounded-full border border-white/50 bg-white/10 dark:bg-black/40 px-5 py-2 text-sm font-bold text-gray-900 dark:text-white backdrop-blur-md transition hover:bg-white/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                    >
                      Refresh Data
                    </button>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="rounded-full border border-red-400/50 bg-red-500/20 px-5 py-2 text-sm font-bold text-red-900 backdrop-blur-md transition hover:bg-red-500/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]"
                    >
                      End Session
                    </button>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-white/50 bg-white/20 dark:bg-black/30 p-5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900 dark:text-gray-200 drop-shadow-sm">Environment</p>
                    <p className="mt-1 text-[1.05rem] font-black text-[#111] dark:text-white drop-shadow-sm leading-tight">{ownerStatus?.environment === 'development' ? 'AI Agriculture Assistant' : (ownerStatus?.environment || 'Unknown')}</p>
                  </div>
                  <div className="rounded-3xl border border-white/50 bg-white/20 dark:bg-black/30 p-5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900 dark:text-gray-200 drop-shadow-sm">Owner Email</p>
                    <p className="mt-1 text-[0.95rem] font-black text-[#111] dark:text-white drop-shadow-sm break-all">{ownerStatus?.ownerEmail || 'Not set'}</p>
                  </div>
                  <div className="rounded-3xl border border-white/50 bg-white/20 dark:bg-black/30 p-5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-800 dark:text-gray-200 drop-shadow-sm">OWNER</p>
                    <p className="mt-1 text-[1.1rem] font-black text-[#111] dark:text-white drop-shadow-sm">
                      {ownerStatus?.emailTransportConfigured ? 'PAVAN BUSANAMONi' : 'Not configured'}
                    </p>
                  </div>
                </div>
              </div>

              {/* DASHBOARD SECTION 2 */}
              <div className={glassCardClasses}>
                <div className="flex items-center gap-2 text-[#111] dark:text-white drop-shadow-md">
                  <ShieldAlert size={22} />
                  <h2 className="text-[1.5rem] font-black">Pending Admin Approvals</h2>
                </div>
                <div className="mt-6 space-y-4">
                  {pendingAdmins.length ? (
                    pendingAdmins.map((entry) => (
                      <div key={entry.id} className="rounded-3xl border border-white/50 bg-white/20 dark:bg-black/30 p-5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md">
                        <p className="text-[1.2rem] font-black text-[#111] dark:text-white drop-shadow-sm">{entry.name}</p>
                        <p className="text-[0.95rem] font-bold text-gray-900 dark:text-gray-200 drop-shadow-sm">{entry.email}</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={busyUserId === entry.id}
                            onClick={() => void handleDecision(entry.id, 'approve')}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#4eb69c]/90 to-[#235e4f]/90 px-6 py-2.5 text-sm font-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_10px_rgba(35,94,79,0.3)] border border-white/40 disabled:opacity-60"
                          >
                            <UserCheck size={16} />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyUserId === entry.id}
                            onClick={() => void handleDecision(entry.id, 'deny')}
                            className="inline-flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/20 px-6 py-2.5 text-sm font-black text-red-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] disabled:opacity-60 hover:bg-red-500/40"
                          >
                            <UserX size={16} />
                            Deny
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-3xl border border-white/50 bg-white/10 dark:bg-black/40 p-5 text-[1rem] font-bold text-gray-900 dark:text-gray-200 drop-shadow-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] backdrop-blur-md">
                      No pending admin signup requests.
                    </p>
                  )}
                </div>
              </div>

              {/* DASHBOARD SECTION 3 */}
              <div className={glassCardClasses}>
                <div className="flex items-center gap-2 text-[#111] dark:text-white drop-shadow-md">
                  <Users size={22} />
                  <h2 className="text-[1.5rem] font-black">Owner User Management</h2>
                </div>

                <div className="mt-6 rounded-3xl border border-white/50 bg-white/20 dark:bg-black/30 p-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md">
                  <p className="mb-4 flex items-center gap-2 text-[1rem] font-black text-[#111] dark:text-white drop-shadow-sm">
                    <UserPlus size={18} />
                    Create User Manually
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <select
                      value={newUser.role}
                      onChange={(event) =>
                        setNewUser((prev) => ({
                          ...prev,
                          role: event.target.value as 'farmer' | 'admin',
                          phone: '',
                          email: '',
                          password: '',
                        }))
                      }
                      className="rounded-full border border-white/60 bg-white/40 dark:bg-black/50 px-5 py-3 text-[1rem] font-bold text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none focus:ring-2 focus:ring-[#2a6d5d]/50 backdrop-blur-md"
                    >
                      <option value="farmer">Farmer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <input
                      value={newUser.name}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Name"
                      className="rounded-full border border-white/60 bg-white/40 dark:bg-black/50 px-5 py-3 text-[1rem] font-bold text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none placeholder:text-gray-700/70 focus:ring-2 focus:ring-[#2a6d5d]/50 backdrop-blur-md"
                    />

                    {newUser.role === 'farmer' ? (
                      <>
                        <input
                          value={newUser.phone}
                          onChange={(event) => setNewUser((prev) => ({ ...prev, phone: event.target.value }))}
                          placeholder="Phone number"
                          className="rounded-full border border-white/60 bg-white/40 dark:bg-black/50 px-5 py-3 text-[1rem] font-bold text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none placeholder:text-gray-700/70 focus:ring-2 focus:ring-[#2a6d5d]/50 backdrop-blur-md"
                        />
                        <input
                          value={newUser.email}
                          onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                          placeholder="Farmer email (optional)"
                          className="rounded-full border border-white/60 bg-white/40 dark:bg-black/50 px-5 py-3 text-[1rem] font-bold text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none placeholder:text-gray-700/70 focus:ring-2 focus:ring-[#2a6d5d]/50 backdrop-blur-md"
                        />
                      </>
                    ) : (
                      <>
                        <input
                          value={newUser.email}
                          onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                          placeholder="Admin email"
                          className="rounded-full border border-white/60 bg-white/40 dark:bg-black/50 px-5 py-3 text-[1rem] font-bold text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none placeholder:text-gray-700/70 focus:ring-2 focus:ring-[#2a6d5d]/50 backdrop-blur-md"
                        />
                        <input
                          type="password"
                          value={newUser.password}
                          onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                          placeholder="Admin password"
                          className="rounded-full border border-white/60 bg-white/40 dark:bg-black/50 px-5 py-3 text-[1rem] font-bold text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none placeholder:text-gray-700/70 focus:ring-2 focus:ring-[#2a6d5d]/50 backdrop-blur-md"
                        />
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreateUser()}
                    disabled={
                      saving
                      || !newUser.name.trim()
                      || (newUser.role === 'farmer' ? !newUser.phone.trim() : !newUser.email.trim() || newUser.password.length < 8)
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#4eb69c]/90 to-[#235e4f]/90 px-8 py-3 text-[1.05rem] font-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_10px_rgba(35,94,79,0.3)] border border-white/40 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Create user'}
                  </button>
                </div>

                <div className="mt-8 overflow-hidden rounded-3xl border border-white/50 bg-white/20 dark:bg-black/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md">
                  <div className="overflow-auto">
                    <table className="w-full min-w-[700px] text-left text-[0.95rem] font-bold">
                      <thead>
                        <tr className="border-b border-white/30 bg-white/10">
                          <th className="p-4 text-gray-900 dark:text-white">Name</th>
                          <th className="p-4 text-gray-900 dark:text-white">Role</th>
                          <th className="p-4 text-gray-900 dark:text-white">Phone</th>
                          <th className="p-4 text-gray-900 dark:text-white">Email</th>
                          <th className="p-4 text-gray-900 dark:text-white">Password</th>
                          <th className="p-4 text-gray-900 dark:text-white">Status</th>
                          <th className="p-4 text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {managedUsers.map((user) => (
                          <tr key={user.id} className="border-b border-white/20 hover:bg-white/10 dark:bg-black/40 transition">
                            <td className="p-4 text-gray-900 dark:text-white drop-shadow-sm">{user.name}</td>
                            <td className="p-4 capitalize text-gray-900 dark:text-white drop-shadow-sm">{user.role}</td>
                            <td className="p-4 text-gray-900 dark:text-gray-200">{user.phone || '-'}</td>
                            <td className="p-4 text-gray-900 dark:text-gray-200">{user.email || '-'}</td>
                            <td className="p-4 text-gray-900 dark:text-gray-200">
                              {user.role === 'admin' ? (
                                <span className="font-mono text-xs">{user.lastKnownPassword || 'Unknown'}</span>
                              ) : '-'}
                            </td>
                            <td className="p-4 capitalize text-gray-900 dark:text-white drop-shadow-sm">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-black ${user.status === 'active' ? 'bg-[#3c8e7a]/30 text-[#113a30]' : 'bg-gray-500/30 text-gray-900 dark:text-white'}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={busyUserId === user.id}
                                  onClick={() => void handleToggleUserStatus(user)}
                                  className="rounded-full border border-white/50 bg-white/40 dark:bg-black/50 px-3 py-1.5 text-xs font-black text-gray-900 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-white/60 transition disabled:opacity-60"
                                >
                                  {user.status === 'active' ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyUserId === user.id}
                                  onClick={() => void handleDeleteUser(user)}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-black text-red-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] hover:bg-red-500/40 transition disabled:opacity-60"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[32px] border border-white/20 bg-[#f8fafc] dark:bg-slate-900 p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 size={20} className="text-[#4eb69c]" />
                Edit User
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4eb69c]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4eb69c]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4eb69c]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">New Password (optional)</label>
                <input
                  type="text"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4eb69c]"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-full px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editFormData.name.trim()}
                  className="rounded-full bg-[#4eb69c] px-6 py-2 text-sm font-bold text-white hover:bg-[#3d9880] transition disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
