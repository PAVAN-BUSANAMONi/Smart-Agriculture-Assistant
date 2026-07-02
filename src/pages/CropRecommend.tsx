import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, CloudSun, Droplets, Leaf, Sprout } from 'lucide-react';
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

function riskStyles(risk: string) {
  if (risk === 'High') return 'bg-red-100 text-red-700 border-red-200';
  if (risk === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-green-100 text-green-700 border-green-200';
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
    <div className="mx-auto max-w-6xl animate-fade-in p-4 space-y-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-3xl font-bold font-display text-gray-900">
          <div className="bg-green-100 p-2.5 rounded-xl text-green-600 shadow-sm">
            <Sprout size={28} />
          </div>
          {t('crop_recommendation')}
        </h1>
        <button
          type="button"
          onClick={() => setShowDetailed((prev) => !prev)}
          className="glass-button-secondary text-sm px-4 py-2 hidden"
        >
          {showDetailed ? 'Simple View' : 'Detailed View'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 glass-card p-6">
          <h2 className="mb-5 text-xl font-bold font-display text-gray-900">Recommendation Inputs</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('select_soil')}</label>
              <select
                value={form.soilType}
                onChange={(event) => setForm((prev) => ({ ...prev, soilType: event.target.value as SoilType }))}
                className="glass-input w-full"
              >
                {SOIL_OPTIONS.map((soil) => (
                  <option key={soil} value={soil}>
                    {t(soil)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('select_season')}</label>
              <select
                value={form.season}
                onChange={(event) => setForm((prev) => ({ ...prev, season: event.target.value as SeasonType }))}
                className="glass-input w-full"
              >
                {SEASON_OPTIONS.map((season) => (
                  <option key={season} value={season}>
                    {t(season)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Temperature (°C)</label>
              <input
                type="number"
                value={form.temperatureC}
                onChange={(event) => setForm((prev) => ({ ...prev, temperatureC: Number(event.target.value) }))}
                className="glass-input w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Seasonal Rainfall (mm)</label>
              <input
                type="number"
                value={form.rainfallMm}
                onChange={(event) => setForm((prev) => ({ ...prev, rainfallMm: Number(event.target.value) }))}
                className="glass-input w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Land Size (acres)</label>
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={form.landSizeAcres}
                onChange={(event) => setForm((prev) => ({ ...prev, landSizeAcres: Number(event.target.value) }))}
                className="glass-input w-full"
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleAutofillWeather}
              className="inline-flex w-full items-center justify-center gap-2 glass-button-secondary py-3 text-blue-700 border-blue-200/60 bg-blue-50/50 hover:bg-blue-100/50"
            >
              <CloudSun size={18} />
              {fetchingWeather ? 'Fetching weather...' : 'Use current weather'}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full glass-button py-3 text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                 <div className="flex justify-center items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/50 border-t-white animate-spin"></div>
                    <span>{t('analyzing')}</span>
                 </div>
              ) : t('get_recommendation')}
            </button>

            {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          {topRecommendation && (
            <article className="glass-panel relative overflow-hidden bg-gradient-to-br from-green-50/80 to-emerald-100/80 p-8 shadow-md border-green-200/50">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-400 blur-3xl opacity-20"></div>
              
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-400 blur-3xl opacity-20"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-wider text-green-800 mb-1">Top Recommendation</p>
                  <h3 className="text-4xl font-extrabold font-display text-gray-900 mb-4">{t(topRecommendation.cropKey)}</h3>

                  <div className={`inline-flex items-center rounded-xl border px-4 py-1.5 text-sm font-bold shadow-sm ${riskStyles(topRecommendation.riskLevel)}`}>
                    Suitability {topRecommendation.suitabilityScore}% • Risk {topRecommendation.riskLevel}
                  </div>
                </div>
                
                <div className="w-full md:w-48 h-32 shrink-0 rounded-2xl overflow-hidden shadow-md border-2 border-white/50">
                  <img 
                    src={CROP_IMAGES[topRecommendation.cropKey.toLowerCase()] || CROP_IMAGES.default} 
                    alt={t(topRecommendation.cropKey)}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              <div className="relative z-10 mt-6 grid md:grid-cols-2 gap-4">
                  <div className="bg-white/40 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                    <p className="text-sm text-gray-600 mb-1 font-semibold">Why Selected</p>
                    <p className="text-gray-900 font-medium">{topRecommendation.whyRecommended}</p>
                  </div>
                  <div className="bg-white/40 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                    <p className="text-sm text-gray-600 mb-1 font-semibold">Financial Estimate</p>
                    <p className="text-gray-900 font-bold text-lg">{formatCurrency(topRecommendation.economics.netProfit)} <span className="text-sm font-normal text-gray-600">net profit</span></p>
                    <p className="text-xs text-gray-600 mt-1">{topRecommendation.expectedYieldQPerAcre} yield / {formatCurrency(topRecommendation.economics.estimatedCost)} cost</p>
                  </div>
                </div>
            </article>
          )}

          {result?.advisory?.length ? (
            <div className="glass-card border-amber-200/50 bg-amber-50/50 p-6 text-amber-900">
              <p className="mb-4 flex items-center gap-2 font-bold font-display text-lg">
                <CircleAlert size={20} className="text-amber-600" /> Actionable Advice
              </p>
              <ul className="space-y-3 font-medium">
                {result.advisory.map((item) => (
                  <li key={item} className="flex gap-3">
                     <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"></div>
                     <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result?.recommendations?.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {result.recommendations.map((crop) => {
                const isExpanded = expandedCrop === crop.cropKey || showDetailed;
                return (
                  <article 
                    key={crop.cropKey} 
                    className={`glass-card p-0 flex flex-col overflow-hidden cursor-pointer transition-all duration-300 ${isExpanded ? 'ring-2 ring-green-400' : 'hover:scale-[1.02]'}`}
                    onClick={() => setExpandedCrop(isExpanded ? null : crop.cropKey)}
                  >
                    <div className="h-48 w-full relative">
                      <img 
                        src={CROP_IMAGES[crop.cropKey.toLowerCase()] || CROP_IMAGES.default} 
                        alt={t(crop.cropKey)}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-5">
                        <div className="flex w-full items-center justify-between">
                          <h4 className="text-2xl font-bold font-display text-white drop-shadow-md">{t(crop.cropKey)}</h4>
                          <span className={`rounded-xl border px-3 py-1 text-xs font-bold shadow-sm ${riskStyles(crop.riskLevel)} backdrop-blur-md bg-white/95`}>
                            {crop.suitabilityScore}% Match
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 mb-4">
                     <p className="text-sm text-gray-700 font-medium flex justify-between">
                       <span className="text-gray-500">Risk Level</span> 
                       <span>{crop.riskLevel}</span>
                     </p>
                     <p className="text-sm text-gray-700 font-medium flex justify-between mt-2">
                       <span className="text-gray-500">{t('yield')}</span> 
                       <span>{crop.expectedYieldQPerAcre}</span>
                     </p>
                  </div>

                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="space-y-3 text-sm text-gray-700 font-medium mt-4 border-t border-gray-100 pt-4">
                        <p className="flex items-start gap-3"><Droplets size={18} className="mt-0.5 text-blue-500 shrink-0" /> {crop.requiredWater}</p>
                        <p className="flex items-start gap-3"><Leaf size={18} className="mt-0.5 text-green-600 shrink-0" /> {crop.requiredFertilizer}</p>
                        <p><strong className="text-gray-900 block mb-1">Why recommended:</strong> {crop.whyRecommended}</p>
                        {crop.riskNote && <p><strong className="text-amber-800 block mb-1">Risk note:</strong> {crop.riskNote}</p>}
                        <p className="text-lg font-bold text-gray-900 mt-2">{formatCurrency(crop.economics.netProfit)} <span className="text-xs font-medium text-gray-500">Net Profit</span></p>
                      </div>
                    </div>

                    {!isExpanded && (
                      <p className="mt-4 pt-4 text-sm font-medium text-blue-600/80 text-center border-t border-gray-100 flex items-center justify-center gap-1 group-hover:text-blue-600 transition-colors">
                        Click for detailed plan
                        <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
            </div>
          ) : (
            <div className="glass-panel border-dashed border-gray-300 p-12 text-center text-gray-500 bg-gray-50/30">
              Enter farm inputs to get AI-powered crop recommendations with suitability and profit estimates.
            </div>
          )}

          <section className="glass-card p-6">
            <h3 className="mb-4 text-xl font-bold font-display text-gray-900">Recent Queries</h3>
            {history.length ? (
              <div className="space-y-3 text-sm text-gray-700 font-medium">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50/50 border border-gray-100 px-4 py-3">
                    <span className="text-gray-900">Top crop: <span className="font-bold">{t(item.topCrop)}</span></span>
                    <span className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recommendation history found yet.</p>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
