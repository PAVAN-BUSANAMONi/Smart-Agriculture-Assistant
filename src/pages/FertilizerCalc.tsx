import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Calculator, Sparkles, Sprout, LoaderCircle, Droplets, Leaf } from 'lucide-react';
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
        farmingType
      });
      setResult(plan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in p-4 space-y-8">
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-600 p-4 rounded-3xl shadow-xl shadow-green-500/20 transform hover:scale-105 transition-transform duration-300">
          <Sparkles className="text-white w-10 h-10 animate-pulse" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-green-500 to-teal-400 tracking-tight">
          AI Fertilizer Schedule
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto font-medium text-lg">
          Get a hyper-personalized, eco-friendly fertilizer plan powered by Gemini AI. 🌿✨
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/60 relative overflow-hidden group hover:border-emerald-200 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-400/30 transition-all"></div>
            
            <div className="space-y-5 relative z-10">
              {error && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700 uppercase tracking-wider">Land Size (Acres) 🏞️</label>
                <input 
                  type="number"
                  className="w-full bg-white/70 border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-emerald-500 rounded-2xl p-4 text-gray-900 font-semibold shadow-inner transition-all"
                  value={land}
                  onChange={(e) => setLand(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700 uppercase tracking-wider">Crop Type 🌱</label>
                <select 
                  className="w-full bg-white/70 border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-emerald-500 rounded-2xl p-4 text-gray-900 font-semibold shadow-inner transition-all appearance-none"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                >
                  <option value="">-- Select Crop --</option>
                  <option value="Rice">Rice 🌾</option>
                  <option value="Cotton">Cotton ☁️</option>
                  <option value="Maize">Maize 🌽</option>
                  <option value="Wheat">Wheat 🍞</option>
                  <option value="Tomato">Tomato 🍅</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700 uppercase tracking-wider">Soil Type 🪨</label>
                <select 
                  className="w-full bg-white/70 border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-emerald-500 rounded-2xl p-4 text-gray-900 font-semibold shadow-inner transition-all appearance-none"
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                >
                  <option value="Loam">Loam</option>
                  <option value="Clay">Clay</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Silt">Silt</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700 uppercase tracking-wider">Farming Style 🚜</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setFarmingType('Organic')}
                    className={`py-3 rounded-xl font-bold transition-all ${farmingType === 'Organic' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    Organic 🌿
                  </button>
                  <button 
                    onClick={() => setFarmingType('Chemical')}
                    className={`py-3 rounded-xl font-bold transition-all ${farmingType === 'Chemical' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    Chemical 🧪
                  </button>
                </div>
              </div>

              <button 
                onClick={calculate}
                disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl text-lg font-bold shadow-xl shadow-emerald-500/25 bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-400 hover:to-green-400 transform hover:-translate-y-1 transition-all disabled:opacity-70 disabled:transform-none flex items-center justify-center gap-2"
              >
                {loading ? <LoaderCircle className="animate-spin" size={24} /> : <Sparkles size={24} />}
                {loading ? 'AI Analyzing Soil...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {result && !loading && (
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/80 relative overflow-hidden animate-slide-up">
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-200/60">
                <div>
                  <h3 className="text-3xl font-extrabold font-display text-gray-900 mb-2">Your AI Schedule</h3>
                  <p className="text-emerald-700 font-semibold flex items-center gap-2">
                    <Leaf size={18} /> Model: {result.sourceModel}
                  </p>
                </div>
                
                <div className="flex flex-col items-center bg-gradient-to-b from-green-50 to-emerald-100 p-4 rounded-3xl border border-emerald-200/50 shadow-inner min-w-[140px]">
                  <div className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-1">Eco Score</div>
                  <div className="text-5xl font-black text-emerald-600 font-display flex items-baseline">
                    {result.sustainabilityScore} <span className="text-2xl text-emerald-400">/100</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {result.phases?.map((phase: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-end mb-5">
                      <h4 className="text-xl font-bold text-gray-900">{phase.phaseName}</h4>
                      <span className="text-sm font-bold text-white bg-gray-900 py-1.5 px-4 rounded-full">{phase.timing}</span>
                    </div>
                    
                    <div className="grid gap-3">
                      {phase.fertilizers?.map((fert: any, fIdx: number) => (
                        <div key={fIdx} className="flex flex-col md:flex-row md:items-center gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                            <Droplets className="text-white" size={24} />
                          </div>
                          <div className="flex-grow">
                            <div className="flex flex-wrap items-baseline gap-2 mb-1">
                              <h5 className="font-bold text-lg text-gray-900">{fert.name}</h5>
                              <span className="text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-md text-sm">{fert.amount}</span>
                            </div>
                            <p className="text-gray-600 text-sm font-medium">{fert.instructions}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {result.soilHealthTips && result.soilHealthTips.length > 0 && (
                <div className="mt-8 bg-amber-50 p-6 rounded-3xl border border-amber-200/50">
                  <h4 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <Sprout size={20} className="text-amber-600" /> Pro Soil Tips
                  </h4>
                  <ul className="space-y-3">
                    {result.soilHealthTips.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-amber-800 font-medium">
                        <span className="text-amber-500 font-black mt-0.5">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}

          {!result && !loading && (
             <div className="h-full min-h-[400px] rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-8 bg-white/20 backdrop-blur-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Calculator size={48} className="text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-400 font-display">Ready for Analysis</h3>
                <p className="text-gray-400 mt-2 font-medium max-w-sm">Enter your farm details on the left to let Gemini AI generate your custom schedule.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}