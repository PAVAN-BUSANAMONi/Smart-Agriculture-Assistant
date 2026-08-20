import { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { LineChart, IndianRupee, TrendingUp, TrendingDown, Sparkles, Percent, DollarSign, Sprout, AlertCircle } from 'lucide-react';
import { createAlert } from '../utils/alertEngine';

type CropUnit = {
  key: string;
  avgYieldQPerAcre: number;
  modalPrice: number;
};

const CROP_UNITS: CropUnit[] = [
  { key: 'rice', avgYieldQPerAcre: 24, modalPrice: 2450 },
  { key: 'cotton', avgYieldQPerAcre: 10, modalPrice: 6920 },
  { key: 'maize', avgYieldQPerAcre: 20, modalPrice: 2280 },
  { key: 'chilli', avgYieldQPerAcre: 9, modalPrice: 14150 },
  { key: 'banana', avgYieldQPerAcre: 125, modalPrice: 1890 },
  { key: 'marigold', avgYieldQPerAcre: 30, modalPrice: 4100 },
];

export function ProfitEstimator() {
  const { language, t } = useLanguage();
  const [crop, setCrop] = useState('rice');
  const [acres, setAcres] = useState('2');
  const [costPerAcre, setCostPerAcre] = useState('25000');
  const [markup, setMarkup] = useState('0');

  const selected = CROP_UNITS.find((item) => item.key === crop) || CROP_UNITS[0];
  const acreValue = Number(acres) || 0;
  const cost = Number(costPerAcre) || 0;
  const marketAdjustment = Number(markup) || 0;

  const summary = useMemo(() => {
    const adjustedPrice = Math.max(0, selected.modalPrice + marketAdjustment);
    const gross = selected.avgYieldQPerAcre * acreValue * adjustedPrice;
    const totalCost = acreValue * cost;
    const net = gross - totalCost;
    const roi = totalCost > 0 ? (net / totalCost) * 100 : 0;
    return { adjustedPrice, gross, totalCost, net, roi };
  }, [selected, acreValue, cost, marketAdjustment]);

  const recommendSale =
    summary.net > 0
      ? language === 'te'
        ? 'ప్రస్తుత ధర వద్ద విక్రయించవచ్చు. ధరల ట్రెండ్ పెరుగుతోంది.'
        : 'You can sell at current modal price. Market trend is supportive.'
      : language === 'te'
      ? 'వెంటనే విక్రయించకుండా, నిల్వ/గ్రేడింగ్ లేదా మార్కెట్ టైమింగ్ పరిశీలించండి.'
      : 'Avoid distress sale now. Consider grading/storage and market timing.';

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
              <span>Farm Economics & Financial Advisory</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight flex items-center gap-2.5">
              <LineChart size={24} className="text-emerald-300" />
              <span>{language === 'te' ? 'లాభ అంచనా వ్యవస్థ' : 'Profit Estimation System'}</span>
            </h1>
          </div>

          <div className="text-xs text-white/60">
            Real-time revenue forecast, production cost model & ROI telemetry
          </div>
        </div>

        {/* ═══ Main 2-Column Grid: Inputs Workspace vs Revenue Projection ═══ */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Farm & Production Inputs (5 cols on lg) */}
          <div className="lg:col-span-5 aurora-glass-strong p-6 sm:p-7 rounded-[26px] space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white/95">Farm & Production Parameters</h2>
              <p className="text-xs text-white/65">Define your crop scale and input costs to calculate farm returns</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="aurora-label mb-1.5 block">{t('select_crop')}</label>
                <select
                  value={crop}
                  onChange={(event) => setCrop(event.target.value)}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                >
                  {CROP_UNITS.map((item) => (
                    <option key={item.key} value={item.key} className="bg-[#04121b] text-white">
                      {t(item.key)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">{t('land_size')} (Acres)</label>
                <input
                  value={acres}
                  onChange={(event) => setAcres(event.target.value)}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 2.0"
                />
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">
                  {language === 'te' ? 'ఎకరాకు మొత్తం ఖర్చు (₹)' : 'Total Cost Per Acre (₹)'}
                </label>
                <input
                  value={costPerAcre}
                  onChange={(event) => setCostPerAcre(event.target.value)}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  type="number"
                  min="0"
                  placeholder="e.g. 25000"
                />
              </div>

              <div>
                <label className="aurora-label mb-1.5 block">
                  {language === 'te' ? 'మార్కెట్ ధర సర్దుబాటు (₹/క్వింటాల్)' : 'Market Price Adjustment (₹/Qtl)'}
                </label>
                <input
                  value={markup}
                  onChange={(event) => setMarkup(event.target.value)}
                  className="aurora-glass-input text-xs py-2.5 w-full"
                  type="number"
                  placeholder="e.g. 100 or -50"
                />
              </div>

              {/* Crop Baseline Telemetry */}
              <div className="aurora-glass-light p-3.5 rounded-xl space-y-1.5 text-xs text-white/75 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Benchmark Yield:</span>
                  <span className="font-semibold text-white/90">{selected.avgYieldQPerAcre} qtl / acre</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Base Modal Mandi Price:</span>
                  <span className="font-semibold text-white/90">₹{selected.modalPrice.toLocaleString()} / qtl</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Summary & Projections (7 cols on lg) */}
          <div className="lg:col-span-7 aurora-glass-strong p-6 sm:p-8 rounded-[26px] space-y-6 border border-emerald-400/25">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <span className="aurora-label text-emerald-300">Financial Summary</span>
                <h3 className="text-2xl font-semibold text-white/95 tracking-tight">
                  {language === 'te' ? 'ఆదాయం అంచనా' : 'Revenue & Profit Forecast'}
                </h3>
              </div>

              <div className="flex items-center gap-2 aurora-glass-medium px-3.5 py-1.5 rounded-full border border-emerald-400/30">
                <Percent size={14} className="text-emerald-300" />
                <span className="text-xs font-bold text-emerald-300">
                  ROI: {summary.roi.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Financial Telemetry Rows */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between aurora-glass-light p-3.5 rounded-xl">
                <span className="text-white/75">{language === 'te' ? 'అంచనా ధర' : 'Adjusted Unit Price'}</span>
                <span className="font-semibold text-white/95">₹{summary.adjustedPrice.toLocaleString()} <span className="text-[10.5px] font-normal text-white/50">/ qtl</span></span>
              </div>

              <div className="flex items-center justify-between aurora-glass-light p-3.5 rounded-xl">
                <span className="text-white/75">{language === 'te' ? 'స్థూల ఆదాయం' : 'Gross Revenue (Yield × Price)'}</span>
                <span className="font-semibold text-white/95">₹{summary.gross.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between aurora-glass-light p-3.5 rounded-xl">
                <span className="text-white/75">{language === 'te' ? 'మొత్తం ఖర్చు' : 'Total Production Cost (Acres × Cost)'}</span>
                <span className="font-semibold text-white/95">₹{summary.totalCost.toLocaleString()}</span>
              </div>

              {/* Net Profit Hero Display */}
              <div className="aurora-glass-medium p-5 rounded-[22px] border border-emerald-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-white/60">
                    {language === 'te' ? 'నికర లాభం' : 'Net Farm Profit'}
                  </span>
                  <div className="text-xs text-white/70 mt-0.5">After all input & operational deductions</div>
                </div>

                <div className={`text-3xl sm:text-4xl font-bold tracking-tight font-display flex items-baseline ${
                  summary.net >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  ₹{summary.net.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Advisory Note & Save Profit Alert Action */}
            <div className="space-y-4 pt-3 border-t border-white/10">
              <div className="aurora-glass-light p-4 rounded-xl flex items-start gap-3 text-xs text-white/85 leading-relaxed">
                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${summary.net >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{recommendSale}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  createAlert({
                    type: 'market',
                    level: summary.net > 0 ? 'low' : 'medium',
                    message: `${t(crop)}: ${recommendSale}`,
                  })
                }
                className="w-full aurora-glass-button-primary text-xs sm:text-sm font-semibold py-3 flex items-center justify-center gap-2"
              >
                <IndianRupee size={16} className="text-emerald-300" />
                <span>{language === 'te' ? 'లాభ అలర్ట్ సేవ్ చేయండి' : 'Save Profit Alert'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}