import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator, Sparkles, Sprout, LoaderCircle, Droplets, Leaf, ShieldAlert, Award } from 'lucide-react';
import { api } from '../services/api';

export function FertilizerCalc() {
  const { t } = useLanguage();
  const [land, setLand] = useState('');
  const [crop, setCrop] = useState('');
  const [soilType, setSoilType] = useState('Loam');
  const [farmingType, setFarmingType] = useState('Organic');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculate = async () => {
    if (!land || !crop) {
      setError('Please enter land size and select a crop.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const plan = await api.getFertilizerPlan({
        land: parseFloat(land),
        crop,
        soilType,
        farmingType,
      });
      setResult(plan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan.');
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
              <span>Nutrient & Fertilizer Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight flex items-center gap-2.5">
              <Calculator size={24} className="text-emerald-300" />
              <span>AI Fertilizer Schedule</span>
            </h1>
          </div>

          <div className="text-xs text-white/60">
            Precision crop nutrition & split dose scheduling
          </div>
        </div>

        {/* ═══ Main 2-Column Grid: Inputs Workspace vs Fertilizer Plan Results ═══ */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Inputs Workspace (4 cols on lg) */}
          <div className="lg:col-span-4 aurora-glass-strong p-6 sm:p-7 rounded-[26px] space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white/95">Field & Crop Parameters</h2>
              <p className="text-xs text-white/65">Specify your acreage and crop to calculate exact fertilizer doses</p>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="aurora-card p-3 border-rose-400/30 bg-rose-500/15 text-rose-200 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="aurora-label mb-1.5 block">Land Size (Acres)</label>
                <input
                  type="number"
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  value={land}
                  onChange={(e) => setLand(e.target.value)}
                  placeholder="e.g. 2.5"
                  min="0.1"
                  step="0.1"
                />
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">Crop Type</label>
                <select
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                >
                  <option value="" className="bg-[#04121b] text-white">-- Select Crop --</option>
                  <option value="Rice" className="bg-[#04121b] text-white">Rice</option>
                  <option value="Cotton" className="bg-[#04121b] text-white">Cotton</option>
                  <option value="Maize" className="bg-[#04121b] text-white">Maize</option>
                  <option value="Wheat" className="bg-[#04121b] text-white">Wheat</option>
                  <option value="Tomato" className="bg-[#04121b] text-white">Tomato</option>
                </select>
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">Soil Texture</label>
                <select
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                >
                  <option value="Loam" className="bg-[#04121b] text-white">Loam</option>
                  <option value="Clay" className="bg-[#04121b] text-white">Clay</option>
                  <option value="Sandy" className="bg-[#04121b] text-white">Sandy</option>
                  <option value="Silt" className="bg-[#04121b] text-white">Silt</option>
                </select>
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">Farming Practice</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFarmingType('Organic')}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      farmingType === 'Organic'
                        ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 shadow-sm'
                        : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Organic 🌿
                  </button>
                  <button
                    type="button"
                    onClick={() => setFarmingType('Chemical')}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      farmingType === 'Chemical'
                        ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-200 shadow-sm'
                        : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Chemical 🧪
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={calculate}
                  disabled={loading}
                  className="w-full aurora-glass-button-primary text-xs sm:text-sm font-semibold py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="animate-spin" size={16} />
                      <span>AI Analyzing Soil Needs...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-emerald-300" />
                      <span>Generate Nutrient Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Surface (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {result && !loading ? (
              <div className="aurora-glass-strong p-6 sm:p-8 rounded-[26px] space-y-6 animate-fade-in">
                {/* Result Header Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div>
                    <span className="aurora-label text-emerald-300">Custom Dosage Schedule</span>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white/95 tracking-tight mt-0.5">
                      Agronomic Application Plan
                    </h3>
                    <p className="text-xs text-white/65 flex items-center gap-1.5 mt-1">
                      <Leaf size={14} className="text-emerald-300" />
                      <span>Model: {result.sourceModel}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 aurora-glass-medium px-4 py-2.5 rounded-2xl border border-emerald-400/30">
                    <Award size={20} className="text-emerald-300" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-white/60">Sustainability Score</div>
                      <div className="text-2xl font-bold text-emerald-300 leading-none mt-0.5">
                        {result.sustainabilityScore}
                        <span className="text-xs font-normal text-white/50">/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Application Phases List */}
                <div className="space-y-4">
                  {result.phases?.map((phase: any, idx: number) => (
                    <div key={idx} className="aurora-glass-medium p-5 rounded-[22px] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                        <h4 className="text-base font-semibold text-white/95">{phase.phaseName}</h4>
                        <span className="aurora-badge-info text-xs px-3 py-1 rounded-full font-semibold">
                          {phase.timing}
                        </span>
                      </div>

                      <div className="grid gap-2.5">
                        {phase.fertilizers?.map((fert: any, fIdx: number) => (
                          <div
                            key={fIdx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 aurora-glass-light p-3.5 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-white/10 text-emerald-300 shrink-0">
                                <Droplets size={18} />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-white/90">{fert.name}</h5>
                                <p className="text-xs text-white/70 leading-relaxed">{fert.instructions}</p>
                              </div>
                            </div>

                            <span className="aurora-badge-success text-xs px-3 py-1 rounded-lg font-bold self-start sm:self-center shrink-0">
                              {fert.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Soil Health Tips */}
                {result.soilHealthTips && result.soilHealthTips.length > 0 && (
                  <div className="aurora-glass-medium p-5 rounded-[22px] border-amber-300/30 space-y-2.5">
                    <h4 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                      <Sprout size={16} className="text-amber-300" />
                      <span>Soil Health & Best Practices</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-white/85">
                      {result.soilHealthTips.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="aurora-glass-medium p-12 text-center rounded-[26px] text-sm text-white/65 space-y-3 min-h-[420px] flex flex-col items-center justify-center">
                <div className="p-4 rounded-full bg-white/10 text-emerald-300 mb-1 border border-white/15">
                  <Calculator size={36} />
                </div>
                <h3 className="text-lg font-semibold text-white/90">Ready for Soil Nutrient Analysis</h3>
                <p className="text-xs text-white/60 max-w-sm mx-auto">
                  Enter your land size and crop choice to generate a custom fertilizer schedule with split application instructions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}