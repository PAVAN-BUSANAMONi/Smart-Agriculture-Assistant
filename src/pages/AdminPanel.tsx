import { useEffect, useMemo, useState } from 'react';
import { BellRing, KeyRound, ShieldCheck, ToggleLeft, Trash2, UserPlus, Users } from 'lucide-react';
import { api, type AdminConsoleResponse, type FeatureFlag, type RegisterPayload } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function AdminPanel() {
  const { applyFeatureFlags } = useAuth();
  const [consoleData, setConsoleData] = useState<AdminConsoleResponse | null>(null);
  const [featureDraft, setFeatureDraft] = useState<FeatureFlag[]>([]);
  const [newUser, setNewUser] = useState({
    role: 'farmer' as 'farmer' | 'admin',
    name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [otpSessionToken, setOtpSessionToken] = useState('');
  const [otp, setOtp] = useState('');
  const [actionOtpSessionToken, setActionOtpSessionToken] = useState('');
  const [actionOtp, setActionOtp] = useState('');
  const [actionOtpProofToken, setActionOtpProofToken] = useState('');
  const [activeUserActionId, setActiveUserActionId] = useState('');
  const [activeNotificationActionId, setActiveNotificationActionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const hasFeatureChanges = useMemo(() => {
    if (!consoleData) return false;
    return JSON.stringify(consoleData.features) !== JSON.stringify(featureDraft);
  }, [consoleData, featureDraft]);

  const loadConsole = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getAdminConsole();
      setConsoleData(response);
      setFeatureDraft(response.features);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load admin console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConsole();
  }, []);

  const requestOtp = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await api.requestAdminActionOtp('system_control');
      setOtpSessionToken(response.otpSessionToken);
      setMessage(response.message);
      if (!response.delivered) {
        setError(response.deliveryError || 'Admin OTP email could not be delivered. Please fix SMTP and retry.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request OTP.');
    } finally {
      setSaving(false);
    }
  };

  const requestActionOtp = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await api.requestAdminActionOtp('system_control');
      setActionOtpSessionToken(response.otpSessionToken);
      setActionOtp('');
      setActionOtpProofToken('');
      setMessage(response.message);
      if (!response.delivered) {
        setError(response.deliveryError || 'Admin action OTP email could not be delivered. Please fix SMTP and retry.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request admin action OTP.');
    } finally {
      setSaving(false);
    }
  };

  const verifyActionOtp = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const verification = await api.verifyAdminActionOtp({
        otpSessionToken: actionOtpSessionToken,
        otp: actionOtp,
      });
      setActionOtpProofToken(verification.otpProofToken);
      setActionOtp('');
      setActionOtpSessionToken('');
      setMessage('Admin action verification successful. You can now create/update/delete users and notifications.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify admin action OTP.');
    } finally {
      setSaving(false);
    }
  };

  const requireActionProof = () => {
    if (!actionOtpProofToken) {
      setError('Verify admin action OTP first to perform this operation.');
      return null;
    }
    return actionOtpProofToken;
  };

  const handleSaveFeatures = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const verification = await api.verifyAdminActionOtp({ otpSessionToken, otp });
      const response = await api.updateFeatureFlags(
        featureDraft.map((feature) => ({ key: feature.key, enabled: feature.enabled })),
        verification.otpProofToken,
      );

      applyFeatureFlags(response.features);
      setConsoleData((prev) => (prev ? { ...prev, features: response.features } : prev));
      setFeatureDraft(response.features);
      setOtpSessionToken('');
      setOtp('');
      setMessage('Feature updates applied successfully.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save feature changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    const proofToken = requireActionProof();
    if (!proofToken) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload: any =
        newUser.role === 'farmer'
          ? {
              role: 'farmer',
              name: newUser.name.trim(),
              phone: newUser.phone.trim(),
              ...(newUser.email.trim() ? { email: newUser.email.trim() } : {}),
            }
          : {
              role: 'admin',
              name: newUser.name.trim(),
              email: newUser.email.trim(),
              password: newUser.password,
              ...(newUser.phone.trim() ? { phone: newUser.phone.trim() } : {}),
            };

      await api.createAdminUser(payload, proofToken);
      setMessage('User created successfully.');
      setNewUser({
        role: 'farmer',
        name: '',
        phone: '',
        email: '',
        password: '',
      });
      await loadConsole();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create user.');
      if (requestError instanceof Error && requestError.message.toLowerCase().includes('otp')) {
        setActionOtpProofToken('');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const proofToken = requireActionProof();
    if (!proofToken) return;
    setActiveUserActionId(userId);
    setError('');
    setMessage('');
    try {
      const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
      await api.updateAdminUser(userId, { status: nextStatus as 'active' | 'disabled' }, proofToken);
      setMessage(`User status changed to ${nextStatus}.`);
      await loadConsole();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update user status.');
      if (requestError instanceof Error && requestError.message.toLowerCase().includes('otp')) {
        setActionOtpProofToken('');
      }
    } finally {
      setActiveUserActionId('');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const proofToken = requireActionProof();
    if (!proofToken) return;
    setActiveUserActionId(userId);
    setError('');
    setMessage('');
    try {
      await api.deleteAdminUser(userId, proofToken);
      setMessage('User deleted successfully.');
      await loadConsole();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete user.');
      if (requestError instanceof Error && requestError.message.toLowerCase().includes('otp')) {
        setActionOtpProofToken('');
      }
    } finally {
      setActiveUserActionId('');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const proofToken = requireActionProof();
    if (!proofToken) return;
    setActiveNotificationActionId(notificationId);
    setError('');
    setMessage('');
    try {
      await api.deleteAdminNotification(notificationId, proofToken);
      setMessage('Notification deleted successfully.');
      await loadConsole();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete notification.');
      if (requestError instanceof Error && requestError.message.toLowerCase().includes('otp')) {
        setActionOtpProofToken('');
      }
    } finally {
      setActiveNotificationActionId('');
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6 text-lg font-semibold text-[#294833]">Loading admin console...</div>;
  }

  if (!consoleData) {
    return <div className="container mx-auto p-6 text-[#9f3e2c]">{error || 'Admin console is unavailable.'}</div>;
  }

  return (
    <div className="container mx-auto space-y-6 p-4">
      <div className="rounded-[28px] border border-white/50 dark:border-white/20 bg-white/20 dark:bg-black/20 backdrop-blur-3xl border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_2px_4px_rgba(255,255,255,0.6)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2a6d5d] dark:text-[#4eb69c] drop-shadow-sm">Admin workspace</p>
            <h1 className="mt-3 text-3xl font-black text-gray-900 dark:text-white drop-shadow-sm">System control and live access overview</h1>
            <p className="mt-3 max-w-3xl text-gray-700 dark:text-gray-300">
              Admin sign-in is protected by email OTP. Sensitive feature changes below require a fresh OTP before they can be applied.
            </p>
          </div>
          <div className="rounded-2xl border border-white/50 dark:border-white/20 bg-white/80 px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
            Signed in as <span className="font-bold">{consoleData.currentUser.name}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total users</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white drop-shadow-sm">{consoleData.stats.totalUsers}</p>
        </div>
        <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white drop-shadow-sm">{consoleData.stats.admins}</p>
        </div>
        <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">Farmers</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white drop-shadow-sm">{consoleData.stats.farmers}</p>
        </div>
        <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
          <p className="text-sm text-gray-600 dark:text-gray-400">Notifications</p>
          <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white drop-shadow-sm">{consoleData.stats.totalAlerts}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white drop-shadow-sm">
              <Users size={20} />
              <h2 className="text-2xl font-black">Registered users</h2>
            </div>
            <div className="mt-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-md p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#2b4f2e]">
                <UserPlus size={16} />
                Add new user
              </p>
              <div className="grid gap-3 md:grid-cols-2">
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
                  className="rounded-xl border border-[#ccd9c6] bg-white/40 dark:bg-black/40 px-3 py-2 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white text-sm text-[#254128]"
                >
                  <option value="farmer">Farmer</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  value={newUser.name}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Name"
                  className="rounded-xl border border-[#ccd9c6] bg-white/40 dark:bg-black/40 px-3 py-2 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white text-sm text-[#254128]"
                />
                {newUser.role === 'farmer' ? (
                  <input
                    value={newUser.phone}
                    onChange={(event) => setNewUser((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Phone number"
                    className="rounded-xl border border-[#ccd9c6] bg-white/40 dark:bg-black/40 px-3 py-2 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white text-sm text-[#254128]"
                  />
                ) : (
                  <>
                    <input
                      value={newUser.email}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="Admin email"
                      className="rounded-xl border border-[#ccd9c6] bg-white/40 dark:bg-black/40 px-3 py-2 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white text-sm text-[#254128]"
                    />
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="Admin password"
                      className="rounded-xl border border-[#ccd9c6] bg-white/40 dark:bg-black/40 px-3 py-2 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white text-sm text-[#254128]"
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
                className="mt-3 rounded-xl bg-gradient-to-br from-[#4eb69c]/90 to-[#235e4f]/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(35,94,79,0.4)] backdrop-blur-md border border-white/30 text-white px-4 py-2 text-sm font-bold text-white transition hover:bg-[#28592b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Create user'}
              </button>
            </div>
            <div className="mt-4 overflow-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/30 dark:border-white/10 bg-white/40 dark:bg-white/10 backdrop-blur-md">
                    <th className="p-3">Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consoleData.users.map((user) => (
                    <tr key={user.id} className="border-b border-white/30 dark:border-white/10">
                      <td className="p-3">{user.name}</td>
                      <td className="p-3 capitalize">{user.role}</td>
                      <td className="p-3 text-gray-600">{user.phone || '-'}</td>
                      <td className="p-3 text-gray-600">{user.email || '-'}</td>
                      <td className="p-3 capitalize">{user.status}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={activeUserActionId === user.id}
                            onClick={() => void handleToggleStatus(user.id, user.status)}
                            className="rounded-lg border border-[#cad9c5] bg-white px-2 py-1 text-xs font-semibold text-[#345737] hover:bg-[#eef6e8] disabled:opacity-60"
                          >
                            {user.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            disabled={activeUserActionId === user.id}
                            onClick={() => void handleDeleteUser(user.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#efc9c0] bg-[#fff5f2] px-2 py-1 text-xs font-semibold text-[#9c3f32] hover:bg-[#ffece7] disabled:opacity-60"
                          >
                            <Trash2 size={12} />
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

          <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white drop-shadow-sm">
              <BellRing size={20} />
              <h2 className="text-2xl font-black">Recent notifications</h2>
            </div>
            <div className="mt-4 space-y-3">
              {consoleData.alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-md p-4 border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white drop-shadow-sm">{alert.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase text-gray-600">{alert.type}</span>
                      <button
                        type="button"
                        disabled={activeNotificationActionId === alert.id}
                        onClick={() => void handleDeleteNotification(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#efc9c0] bg-[#fff5f2] px-2 py-1 text-xs font-semibold text-[#9c3f32] hover:bg-[#ffece7] disabled:opacity-60"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{alert.message}</p>
                  <p className="mt-2 text-xs text-gray-400">{new Date(alert.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white drop-shadow-sm">Audit trail</h2>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
              {consoleData.auditLog.length ? (
                consoleData.auditLog.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-md p-3 border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white drop-shadow-sm">{entry.action}</p>
                    <p className="text-xs text-gray-700">{entry.detail}</p>
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">{new Date(entry.createdAt).toLocaleString()}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-md p-3 border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] text-sm text-gray-600 dark:text-gray-400">No audit records yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white drop-shadow-sm">Email activity</h2>
            <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
              {consoleData.emailLog.length ? (
                consoleData.emailLog.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-md p-3 border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white drop-shadow-sm">{entry.subject}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${
                          entry.delivered ? 'bg-[#eef6e8] text-[#2f6b32]' : 'bg-red-500/20 backdrop-blur-md border border-red-500/50 text-red-900 dark:text-red-400 text-[#9f3e2c]'
                        }`}
                      >
                        {entry.delivered ? 'Delivered' : 'Failed'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-700">To: {entry.to}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {entry.category} via {entry.transport}
                    </p>
                    <p className="mt-2 text-xs text-gray-600">{entry.payloadPreview || 'No preview available.'}</p>
                    {entry.errorMessage ? <p className="mt-2 text-xs font-medium text-[#9f3e2c]">{entry.errorMessage}</p> : null}
                    <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-400">{new Date(entry.createdAt).toLocaleString()}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-md p-3 border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] text-sm text-gray-600 dark:text-gray-400">No email activity yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white drop-shadow-sm">
              <KeyRound size={20} />
              <h2 className="text-2xl font-black">Admin action verification</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              User management and notification delete actions now require a verified OTP proof token.
            </p>

            {actionOtpProofToken ? (
              <div className="mt-4 rounded-xl border border-[#cfe3c8] bg-[#4eb69c]/20 backdrop-blur-md border border-[#4eb69c]/50 text-[#111] dark:text-[#4eb69c] px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
                Admin action token is active for this session.
              </div>
            ) : null}

            {!actionOtpSessionToken ? (
              <button
                type="button"
                onClick={() => void requestActionOtp()}
                disabled={saving}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[#4eb69c]/90 to-[#235e4f]/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(35,94,79,0.4)] backdrop-blur-md border border-white/30 text-white px-5 py-3 text-sm font-bold text-white transition hover:bg-[#255428] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={16} />
                Request action OTP
              </button>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/50 dark:border-white/20 bg-white/30 dark:bg-white/5 backdrop-blur-md p-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[#314a30]">Enter OTP</span>
                  <input
                    value={actionOtp}
                    onChange={(event) => setActionOtp(event.target.value)}
                    maxLength={6}
                    className="w-full rounded-2xl border border-[#d2ddc5] bg-white/40 dark:bg-black/40 px-4 py-3 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white tracking-[0.25em] outline-none"
                    placeholder="123456"
                  />
                </label>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={saving || actionOtp.length < 6}
                    onClick={() => void verifyActionOtp()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-orange-400/90 to-orange-600/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(234,88,12,0.4)] backdrop-blur-md border border-white/30 text-white px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ef6c0d] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <ShieldCheck size={16} />
                    Verify action OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionOtpSessionToken('');
                      setActionOtp('');
                    }}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white/20 dark:bg-black/20 backdrop-blur-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white drop-shadow-sm">
              <ToggleLeft size={20} />
              <h2 className="text-2xl font-black">Feature switches</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Changing system modules is treated as a sensitive action and requires OTP verification.
            </p>

            <div className="mt-4 space-y-3">
              {featureDraft.map((feature) => (
                <label key={feature.key} className="flex items-start justify-between gap-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-md p-4 border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white drop-shadow-sm">{feature.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={feature.enabled}
                    onChange={(event) =>
                      setFeatureDraft((prev) =>
                        prev.map((item) => (item.key === feature.key ? { ...item, enabled: event.target.checked } : item)),
                      )
                    }
                    className="mt-1 h-5 w-5"
                  />
                </label>
              ))}
            </div>

            {error && <div className="mt-4 rounded-2xl border border-[#f0c5ba] bg-red-500/20 backdrop-blur-md border border-red-500/50 text-red-900 dark:text-red-400 px-4 py-3 text-sm font-medium text-[#9f3e2c]">{error}</div>}
            {message && <div className="mt-4 rounded-2xl border border-[#cfe3c8] bg-[#4eb69c]/20 backdrop-blur-md border border-[#4eb69c]/50 text-[#111] dark:text-[#4eb69c] px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{message}</div>}

            {!otpSessionToken ? (
              <button
                type="button"
                disabled={!hasFeatureChanges || saving}
                onClick={() => void requestOtp()}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[#4eb69c]/90 to-[#235e4f]/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(35,94,79,0.4)] backdrop-blur-md border border-white/30 text-white px-5 py-3 text-sm font-bold text-white transition hover:bg-[#255428] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={16} />
                {hasFeatureChanges ? 'Request OTP to apply changes' : 'No pending feature changes'}
              </button>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/50 dark:border-white/20 bg-white/30 dark:bg-white/5 backdrop-blur-md p-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[#314a30]">Enter OTP</span>
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    maxLength={6}
                    className="w-full rounded-2xl border border-[#d2ddc5] bg-white/40 dark:bg-black/40 px-4 py-3 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-gray-900 dark:text-white tracking-[0.25em] outline-none"
                    placeholder="123456"
                  />
                </label>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveFeatures()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-orange-400/90 to-orange-600/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_12px_rgba(234,88,12,0.4)] backdrop-blur-md border border-white/30 text-white px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ef6c0d] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <ShieldCheck size={16} />
                    Verify OTP and save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSessionToken('');
                      setOtp('');
                      setMessage('');
                    }}
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
