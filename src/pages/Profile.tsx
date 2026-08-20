import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { MapPinned, Tractor, Save, User, Calendar, Bell, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createAlert } from '../utils/alertEngine';
import { api } from '../services/api';

type FarmerProfile = {
  location: string;
  landSize: string;
  crops: string;
  sowingDate: string;
  notificationPreferences: {
    weather: boolean;
    disease: boolean;
    lifecycle: boolean;
    personalized: boolean;
  };
};

const PROFILE_KEY = 'farmerProfile';

const DEFAULT_PREFS = { weather: true, disease: true, lifecycle: true, personalized: true };

export function Profile() {
  const { language } = useLanguage();
  const initial = useMemo<FarmerProfile>(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const parsed = (JSON.parse(raw) as Partial<FarmerProfile>) || {};
        return {
          ...parsed,
          location: String(parsed.location || ''),
          landSize: String(parsed.landSize || ''),
          crops: String(parsed.crops || ''),
          sowingDate: String(parsed.sowingDate || new Date().toISOString().slice(0, 10)),
          notificationPreferences: {
            ...DEFAULT_PREFS,
            ...(parsed.notificationPreferences || {}),
          },
        };
      }

      return {
        location: '',
        landSize: '',
        crops: '',
        sowingDate: new Date().toISOString().slice(0, 10),
        notificationPreferences: DEFAULT_PREFS,
      };
    } catch {
      return {
        location: '',
        landSize: '',
        crops: '',
        sowingDate: new Date().toISOString().slice(0, 10),
        notificationPreferences: DEFAULT_PREFS,
      };
    }
  }, []);

  const [profile, setProfile] = useState<FarmerProfile>(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const syncProfile = async () => {
      try {
        const response = (await api.getProfile()) as {
          location?: string;
          landSizeAcres?: number;
          crops?: string[];
          cropPlans?: Array<{ sowingDate?: string }>;
          notificationPreferences?: FarmerProfile['notificationPreferences'];
        };
        setProfile((prev) => ({
          ...prev,
          location: response.location || prev.location,
          landSize: response.landSizeAcres ? String(response.landSizeAcres) : prev.landSize,
          crops: Array.isArray(response.crops) ? response.crops.join(', ') : prev.crops,
          sowingDate: response.cropPlans?.[0]?.sowingDate || prev.sowingDate,
          notificationPreferences: {
            ...prev.notificationPreferences,
            ...(response.notificationPreferences || {}),
          },
        }));
      } catch {
        // Keep local profile when backend is unavailable.
      }
    };

    void syncProfile();
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);

    const crops = profile.crops
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6);

    void api.updateProfile({
      location: profile.location,
      landSizeAcres: Number(profile.landSize || 0),
      crops,
      notificationPreferences: profile.notificationPreferences,
      cropPlans: crops.map((cropName) => ({
        cropName,
        sowingDate: profile.sowingDate,
        stage: 'active',
      })),
    });

    createAlert({
      type: 'lifecycle',
      level: 'low',
      message:
        language === 'te'
          ? 'రైతు ప్రొఫైల్ అప్డేట్ అయింది. పంట రిమైండర్లు వ్యక్తిగతీకరించబడ్డాయి.'
          : 'Farmer profile updated. Crop lifecycle reminders are now personalized.',
    });
  };

  return (
    <div
      className="relative -m-4 md:-m-6 lg:-m-8 p-4 md:p-8 lg:p-10 min-h-[calc(100vh-4rem)] flex flex-col bg-no-repeat bg-cover text-white rounded-2xl overflow-hidden font-sans"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(4,16,24,0.28) 0%, rgba(4,16,24,0.14) 50%, rgba(4,16,24,0.04) 100%), radial-gradient(ellipse at 30% 40%, rgba(6,26,35,0.30) 0%, rgba(4,15,22,0.72) 100%), url('/assets/storm-background.jpg')`,
        backgroundPosition: 'center 25%',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      <div className="relative z-10 mx-auto max-w-4xl w-full flex-1 space-y-7 animate-fade-in">
        {/* ═══ Header Section ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <div className="aurora-glass-pill mb-1.5">
              <span>Farmer Identity & Telemetry</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight flex items-center gap-2.5">
              <User size={24} className="text-emerald-300" />
              <span>{language === 'te' ? 'రైతు ప్రొఫైల్' : 'Farmer Profile'}</span>
            </h1>
          </div>

          <div className="text-xs text-white/60">
            Personalized farm parameters, crop history & alert triggers
          </div>
        </div>

        {/* ═══ Profile Identity Summary Card ═══ */}
        <div className="aurora-glass-strong p-6 rounded-[24px] flex flex-col sm:flex-row items-center gap-5 border border-white/15">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
            <div className="h-full w-full rounded-full bg-[#04121b] flex items-center justify-center text-emerald-300">
              <User size={28} />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-xl font-semibold text-white/95 tracking-tight">
              {profile.location ? `${profile.location} Farm Holdings` : 'Registered Farmer'}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-white/70">
              {profile.location && (
                <span className="aurora-glass-pill text-[11px] flex items-center gap-1">
                  <MapPinned size={12} className="text-emerald-300" />
                  {profile.location}
                </span>
              )}
              {profile.landSize && (
                <span className="aurora-glass-pill text-[11px] flex items-center gap-1">
                  <Tractor size={12} className="text-sky-300" />
                  {profile.landSize} Acres
                </span>
              )}
              {profile.crops && (
                <span className="aurora-glass-pill text-[11px]">
                  Crops: {profile.crops}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Main Profile & Farm Config Form ═══ */}
        <form onSubmit={onSubmit} className="aurora-glass-strong p-6 sm:p-8 rounded-[26px] space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white/95 pb-2 border-b border-white/10">
              Farm & Geographic Parameters
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="aurora-label mb-1.5 flex items-center gap-1.5">
                  <MapPinned size={14} className="text-emerald-300" />
                  <span>{language === 'te' ? 'గ్రామం/స్థానం' : 'Village / Location'}</span>
                </label>
                <input
                  value={profile.location}
                  onChange={(event) => setProfile((prev) => ({ ...prev, location: event.target.value }))}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  placeholder={language === 'te' ? 'ఉదా: వరంగల్' : 'e.g. Warangal, Telangana'}
                />
              </div>

              <div>
                <label className="aurora-label mb-1.5 flex items-center gap-1.5">
                  <Tractor size={14} className="text-emerald-300" />
                  <span>{language === 'te' ? 'భూమి పరిమాణం (ఎకరాలు)' : 'Land Size (Acres)'}</span>
                </label>
                <input
                  value={profile.landSize}
                  onChange={(event) => setProfile((prev) => ({ ...prev, landSize: event.target.value }))}
                  type="number"
                  min="0"
                  step="0.1"
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  placeholder="e.g. 3.5"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="aurora-label mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-300" />
                  <span>{language === 'te' ? 'నాటిన తేదీ (ప్రధాన పంట)' : 'Sowing Date (Primary Crop)'}</span>
                </label>
                <input
                  value={profile.sowingDate}
                  onChange={(event) => setProfile((prev) => ({ ...prev, sowingDate: event.target.value }))}
                  type="date"
                  className="aurora-glass-input text-xs py-2.5 w-full"
                />
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">
                  {language === 'te' ? 'ప్రస్తుతం సాగు చేస్తున్న పంటలు' : 'Current Crops (Comma Separated)'}
                </label>
                <input
                  value={profile.crops}
                  onChange={(event) => setProfile((prev) => ({ ...prev, crops: event.target.value }))}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  placeholder={language === 'te' ? 'ఉదా: వరి, మిరప, అరటి' : 'e.g. Rice, Chilli, Banana'}
                />
              </div>
            </div>
          </div>

          {/* Alert Preferences Section */}
          <div className="aurora-glass-medium p-5 rounded-[22px] space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/95 pb-2 border-b border-white/10">
              <Bell size={16} className="text-emerald-300" />
              <span>{language === 'te' ? 'అలర్ట్ ప్రాధాన్యతలు' : 'Automated Alert & Reminder Preferences'}</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              {(
                [
                  ['weather', language === 'te' ? 'వాతావరణ అలర్ట్స్' : 'Weather alerts & storm warnings'],
                  ['disease', language === 'te' ? 'వ్యాధి అలర్ట్స్' : 'Crop disease outbreak alerts'],
                  ['lifecycle', language === 'te' ? 'పంట దశ రిమైండర్లు' : 'Crop lifecycle stage reminders'],
                  ['personalized', language === 'te' ? 'వ్యక్తిగత సిఫార్సులు' : 'Personalized fertilizer advisory'],
                ] as Array<[keyof FarmerProfile['notificationPreferences'], string]>
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2.5 aurora-glass-light p-3 rounded-xl cursor-pointer hover:bg-white/15 transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={profile.notificationPreferences[key]}
                    onChange={(event) =>
                      setProfile((prev) => ({
                        ...prev,
                        notificationPreferences: {
                          ...prev.notificationPreferences,
                          [key]: event.target.checked,
                        },
                      }))
                    }
                    className="rounded bg-white/10 border-white/20 text-emerald-400 focus:ring-emerald-400/50 focus:ring-offset-0 h-4 w-4"
                  />
                  <span className="text-white/85 font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Row & Success Message */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <button
              type="submit"
              className="aurora-glass-button-primary text-xs sm:text-sm font-semibold py-3 px-6 flex items-center justify-center gap-2"
            >
              <Save size={16} />
              <span>{language === 'te' ? 'ప్రొఫైల్ సేవ్ చేయండి' : 'Save Profile Details'}</span>
            </button>

            {saved && (
              <div className="aurora-badge-success text-xs py-2 px-3.5 rounded-xl flex items-center gap-2 animate-fade-in self-start sm:self-center">
                <CheckCircle2 size={15} />
                <span>
                  {language === 'te' ? 'ప్రొఫైల్ విజయవంతంగా సేవ్ అయింది.' : 'Profile and preferences saved successfully.'}
                </span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}