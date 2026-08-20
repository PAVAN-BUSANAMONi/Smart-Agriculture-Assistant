import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, CloudSun, Droplets, Leaf, Sprout, TrendingUp, DollarSign, Sparkles, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { api, type CropRecommendationResult } from '../services/api';
import { createAlert, shouldTriggerAlert } from '../utils/alertEngine';
import { pushBrowserNotification } from '../utils/browserNotifications';
import { CROP_IMAGES } from '../utils/cropImages';

type SoilType = 'black' | 'red' | 'loamy' | 'sandy' | 'clay' | 'silt';
type SeasonType = 'kharif' | 'rabi' | 'zaid';

type FormState = {
  soilType: SoilType;
  season: SeasonType;
  temperatureC: number;
  rainfallMm: number;
  landSizeAcres: number;
};

const DEFAULT_FORM: FormState = {
  soilType: 'loamy',
  season: 'kharif',
  temperatureC: 30,
  rainfallMm: 850,
  landSizeAcres: 2,
};

const SOIL_OPTIONS: SoilType[] = ['black', 'red', 'loamy', 'sandy', 'clay', 'silt'];
const SEASON_OPTIONS: SeasonType[] = ['kharif', 'rabi', 'zaid'];

async function fetchCurrentWeatherContext(): Promise<{ temperatureC: number; rainfallMm: number }> {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&daily=precipitation_sum&forecast_days=7&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Weather fetch failed');

  const payload = await response.json();
  const temp = Number(payload.current?.temperature_2m ?? 30);
  const weeklyRain = payload.daily?.precipitation_sum || [];
  const rainMm = Number(weeklyRain.reduce((sum: number, item: number) => sum + Number(item || 0), 0));

  return {
    temperatureC: Math.round(temp),
    rainfallMm: Math.max(100, Math.round(rainMm * 4)),
  };
}

function riskBadgeClass(risk: string) {
  if (risk === 'High') return 'aurora-badge-danger';
  if (risk === 'Medium') return 'aurora-badge-warning';
  return 'aurora-badge-success';
}

function formatCurrency(value: number) {
  return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
}

export function CropRecommend() {
  const { t } = useLanguage();
  const { simpleMode } = useAppSettings();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<CropRecommendationResult | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; topCrop: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [error, setError] = useState('');
  const [showDetailed, setShowDetailed] = useState(false);
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyResponse = await api.getCropRecommendationHistory();
        const compact = historyResponse.history.map((item) => ({
          id: item.id,
          topCrop: item.topCrop,
          createdAt: item.createdAt,
        }));
        setHistory(compact);
      } catch {
        setHistory([]);
      }
    };

    void loadHistory();
  }, []);

  const topRecommendation = useMemo(() => result?.recommendations?.[0], [result]);

  const notify = (title: string, body: string) => {
    void pushBrowserNotification({
      type: 'crop',
      level: 'medium',
      title,
      message: body,
      path: '/crop-recommend',
    });
  };

  const handleAutofillWeather = async () => {
    setFetchingWeather(true);
    setError('');
    try {
      const weatherContext = await fetchCurrentWeatherContext();
      setForm((prev) => ({ ...prev, ...weatherContext }));
    } catch {
      setError('Could not auto-fetch weather. Please enter temperature and rainfall manually.');
    } finally {
      setFetchingWeather(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.recommendCrop(form);
      setResult(data);

      if (data.recommendations.length) {
        const best = data.recommendations[0];
        const alertMessage = `${best.cropLabel} (${best.suitabilityScore}%) | ${best.riskLevel} risk`;
        const level = best.riskLevel === 'High' ? 'high' : best.riskLevel === 'Medium' ? 'medium' : 'low';
        const signature = `crop-${form.soilType}-${form.season}-${best.cropKey}-${best.riskLevel}`;
        if (level !== 'low' || best.suitabilityScore >= 88) {
          if (shouldTriggerAlert(signature, level)) {
            notify(
              `${best.cropLabel} planning signal`,
              `Suitability ${best.suitabilityScore}%. ${best.riskLevel} risk. ${best.whyRecommended}`,
            );
            createAlert({ type: 'crop', level, message: alertMessage });
            void api.ingestAlert({
              type: 'crop',
              level,
              title: 'Crop Recommendation Update',
              message: alertMessage,
              source: 'web-farmer-crop',
              metadata: {
                soilType: form.soilType,
                season: form.season,
                temperatureC: form.temperatureC,
                rainfallMm: form.rainfallMm,
                fingerprint: signature,
              },
            });
          }
        }
      }

      const historyResponse = await api.getCropRecommendationHistory();
      setHistory(
        historyResponse.history.map((item) => ({
          id: item.id,
          topCrop: item.topCrop,
          createdAt: item.createdAt,
        })),
      );
    } catch {
      setError('Recommendation service unavailable. Please verify backend API and retry.');
    } finally {
      setLoading(false);
    }
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
      <div className="relative z-10 mx-auto max-w-6xl w-full flex-1 space-y-7 animate-fade-in">
        {/* ═══ Header Section ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <div className="aurora-glass-pill mb-1.5">
              <span>Bio-Agronomy Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight flex items-center gap-2.5">
              <Sprout size={24} className="text-emerald-300" />
              <span>{t('crop_recommendation')}</span>
            </h1>
          </div>

          <div className="text-xs text-white/60">
            Soil-adaptive crop suitability & profit forecasting
          </div>
        </div>

        {/* ═══ Main 2-Column Grid: Inputs Workspace vs Results/Forecast ═══ */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Inputs Section (4 cols on lg) */}
          <section className="lg:col-span-4 aurora-glass-strong p-6 sm:p-7 rounded-[26px] space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white/95">Farm & Soil Inputs</h2>
              <p className="text-xs text-white/65">Define your field parameters to calculate crop suitability</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="aurora-label mb-1.5 block">{t('select_soil')}</label>
                <select
                  value={form.soilType}
                  onChange={(event) => setForm((prev) => ({ ...prev, soilType: event.target.value as SoilType }))}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                >
                  {SOIL_OPTIONS.map((soil) => (
                    <option key={soil} value={soil} className="bg-[#04121b] text-white">
                      {t(soil)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">{t('select_season')}</label>
                <select
                  value={form.season}
                  onChange={(event) => setForm((prev) => ({ ...prev, season: event.target.value as SeasonType }))}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                >
                  {SEASON_OPTIONS.map((season) => (
                    <option key={season} value={season} className="bg-[#04121b] text-white">
                      {t(season)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">Temperature (°C)</label>
                <input
                  type="number"
                  value={form.temperatureC}
                  onChange={(event) => setForm((prev) => ({ ...prev, temperatureC: Number(event.target.value) }))}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                />
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">Seasonal Rainfall (mm)</label>
                <input
                  type="number"
                  value={form.rainfallMm}
                  onChange={(event) => setForm((prev) => ({ ...prev, rainfallMm: Number(event.target.value) }))}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                />
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">Land Size (acres)</label>
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={form.landSizeAcres}
                  onChange={(event) => setForm((prev) => ({ ...prev, landSizeAcres: Number(event.target.value) }))}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleAutofillWeather}
                disabled={fetchingWeather}
                className="w-full aurora-glass-button text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <CloudSun size={15} className="text-cyan-300" />
                <span>{fetchingWeather ? 'Fetching live weather...' : 'Use current weather'}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full aurora-glass-button-primary text-xs sm:text-sm font-semibold py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                    <span>{t('analyzing')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-emerald-300" />
                    <span>{t('get_recommendation')}</span>
                  </>
                )}
              </button>

              {error && (
                <div className="aurora-card p-3 border-rose-400/30 bg-rose-500/15 text-rose-200 text-xs">
                  {error}
                </div>
              )}
            </div>
          </section>

          {/* Results Section (8 cols on lg) */}
          <section className="lg:col-span-8 space-y-6">
            {/* Top Recommended Crop Hero Card */}
            {topRecommendation && (
              <article className="aurora-glass-strong p-6 sm:p-8 rounded-[26px] space-y-6 border border-emerald-400/30 relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <span className="aurora-label text-emerald-300">Optimal Recommendation</span>
                    <h3 className="text-3xl sm:text-4xl font-semibold text-white/95 tracking-tight">
                      {t(topRecommendation.cropKey)}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="aurora-badge-success text-xs px-3 py-1 rounded-full font-semibold">
                        Suitability {topRecommendation.suitabilityScore}%
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${riskBadgeClass(topRecommendation.riskLevel)}`}>
                        {topRecommendation.riskLevel} Risk
                      </span>
                    </div>
                  </div>

                  <div className="w-full md:w-44 h-32 shrink-0 rounded-2xl overflow-hidden aurora-glass-light p-1.5 border border-white/20 shadow-md">
                    <img
                      src={CROP_IMAGES[topRecommendation.cropKey.toLowerCase()] || CROP_IMAGES.default}
                      alt={t(topRecommendation.cropKey)}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="aurora-glass-medium p-4 rounded-2xl">
                    <span className="aurora-label block mb-1">Why Selected</span>
                    <p className="text-xs sm:text-sm text-white/85 leading-relaxed">{topRecommendation.whyRecommended}</p>
                  </div>

                  <div className="aurora-glass-medium p-4 rounded-2xl">
                    <span className="aurora-label block mb-1">Financial Estimate</span>
                    <p className="text-xl sm:text-2xl font-semibold text-emerald-300">
                      {formatCurrency(topRecommendation.economics.netProfit)}
                      <span className="text-xs font-normal text-white/60 ml-1.5">net profit</span>
                    </p>
                    <p className="text-xs text-white/70 mt-1">
                      {topRecommendation.expectedYieldQPerAcre} yield / {formatCurrency(topRecommendation.economics.estimatedCost)} est. cost
                    </p>
                  </div>
                </div>
              </article>
            )}

            {/* Advisory Notice */}
            {result?.advisory?.length ? (
              <div className="aurora-glass-medium p-5 rounded-[22px] border-amber-300/30 space-y-2.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <CircleAlert size={16} />
                  <span>Actionable Agronomic Advisory</span>
                </p>
                <ul className="space-y-1.5 text-xs text-white/85">
                  {result.advisory.map((item) => (
                    <li key={item} className="flex gap-2 items-start">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Grid of Other Recommended Crops */}
            {result?.recommendations?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {result.recommendations.map((crop) => {
                  const isExpanded = expandedCrop === crop.cropKey || showDetailed;
                  return (
                    <article
                      key={crop.cropKey}
                      className={`aurora-glass-medium p-0 flex flex-col rounded-[22px] overflow-hidden cursor-pointer transition-all duration-200 ${
                        isExpanded ? 'border-emerald-400/40 ring-1 ring-emerald-400/30' : 'hover:bg-white/15'
                      }`}
                      onClick={() => setExpandedCrop(isExpanded ? null : crop.cropKey)}
                    >
                      <div className="h-40 w-full relative">
                        <img
                          src={CROP_IMAGES[crop.cropKey.toLowerCase()] || CROP_IMAGES.default}
                          alt={t(crop.cropKey)}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-4">
                          <div className="flex w-full items-center justify-between">
                            <h4 className="text-xl font-semibold text-white tracking-tight">{t(crop.cropKey)}</h4>
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${riskBadgeClass(crop.riskLevel)}`}>
                              {crop.suitabilityScore}% Match
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="aurora-glass-light rounded-xl p-2.5 text-xs flex justify-between items-center text-white/80">
                          <span>Risk: <strong className="text-white">{crop.riskLevel}</strong></span>
                          <span>Yield: <strong className="text-white">{crop.expectedYieldQPerAcre}</strong></span>
                        </div>

                        {isExpanded ? (
                          <div className="space-y-2 text-xs text-white/80 pt-2 border-t border-white/10 animate-fade-in">
                            <p className="flex items-start gap-2">
                              <Droplets size={14} className="mt-0.5 text-cyan-300 shrink-0" />
                              <span>{crop.requiredWater}</span>
                            </p>
                            <p className="flex items-start gap-2">
                              <Leaf size={14} className="mt-0.5 text-emerald-300 shrink-0" />
                              <span>{crop.requiredFertilizer}</span>
                            </p>
                            <p className="text-white/70">
                              <strong className="text-white/90">Why recommended:</strong> {crop.whyRecommended}
                            </p>
                            {crop.riskNote && (
                              <p className="text-amber-200/90">
                                <strong>Risk note:</strong> {crop.riskNote}
                              </p>
                            )}
                            <div className="pt-2 text-sm font-semibold text-emerald-300">
                              {formatCurrency(crop.economics.netProfit)}
                              <span className="text-[11px] font-normal text-white/60 ml-1">est. Net Profit</span>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 text-[11px] text-cyan-300/80 text-center flex items-center justify-center gap-1">
                            <span>Click for detailed agronomy plan</span>
                            <ChevronDown size={13} />
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="aurora-glass-medium p-10 text-center rounded-[24px] text-sm text-white/65 space-y-2">
                <Sprout size={32} className="mx-auto text-emerald-300/80 mb-2" />
                <p className="font-semibold text-white/90">Enter your farm parameters on the left</p>
                <p className="text-xs text-white/60 max-w-md mx-auto">
                  Get AI-calculated crop recommendations, risk evaluations, and financial profit projections tailored to your soil.
                </p>
              </div>
            )}

            {/* Recent Queries History */}
            <aside className="aurora-glass-medium p-5 rounded-[24px] space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white/95 pb-2 border-b border-white/10">
                <History size={15} className="text-emerald-300" />
                <span>Recent Recommendation Queries</span>
              </h3>

              {history.length ? (
                <div className="space-y-2 text-xs">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl aurora-glass-light px-3.5 py-2 text-white/80"
                    >
                      <span>
                        Top crop: <strong className="text-white">{t(item.topCrop)}</strong>
                      </span>
                      <span className="text-[11px] text-white/50">
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/50 text-center py-2">No past recommendations found.</p>
              )}
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}

