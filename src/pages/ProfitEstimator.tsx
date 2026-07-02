import { useMemo, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { LineChart, IndianRupee } from 'lucide-react';
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
        : 'You can sell at current modal price. Trend is supportive.'
      : language === 'te'
      ? 'వెంటనే విక్రయించకుండా, నిల్వ/గ్రేడింగ్ లేదా మార్కెట్ టైమింగ్ పరిశీలించండి.'
      : 'Avoid distress sale now. Consider grading/storage and market timing.';

  return (
    <div className="mx-auto max-w-4xl animate-fade-in p-4 space-y-6">
      <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">
        <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shadow-sm">
          <LineChart size={28} />
        </div>
        {language === 'te' ? 'లాభ అంచనా వ్యవస్థ' : 'Profit Estimation System'}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 glass-card p-6 h-max">
          <div>
            <label className="mb-1.5 block text-sm font-semibold font-display text-gray-800 dark:text-gray-200">{t('select_crop')}</label>
            <select value={crop} onChange={(event) => setCrop(event.target.value)} className="glass-input w-full">
              {CROP_UNITS.map((item) => (
                <option key={item.key} value={item.key}>
                  {t(item.key)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold font-display text-gray-800 dark:text-gray-200">{t('land_size')}</label>
            <input value={acres} onChange={(event) => setAcres(event.target.value)} className="glass-input w-full" type="number" min="0" step="0.1" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold font-display text-gray-800 dark:text-gray-200">{language === 'te' ? 'ఎకరాకు మొత్తం ఖర్చు (₹)' : 'Total Cost Per Acre (₹)'}</label>
            <input value={costPerAcre} onChange={(event) => setCostPerAcre(event.target.value)} className="glass-input w-full" type="number" min="0" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold font-display text-gray-800 dark:text-gray-200">{language === 'te' ? 'మార్కెట్ ధర సర్దుబాటు (₹/క్వింటాల్)' : 'Market Price Adjustment (₹/Qtl)'}</label>
            <input value={markup} onChange={(event) => setMarkup(event.target.value)} className="glass-input w-full" type="number" />
          </div>
        </div>

        <div className="glass-panel relative overflow-hidden bg-gradient-to-br from-emerald-50/80 to-green-100/80 p-6 shadow-md border-emerald-200/50">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400 blur-3xl opacity-20"></div>
          <h2 className="mb-5 text-2xl font-extrabold font-display text-emerald-950 relative z-10">{language === 'te' ? 'ఆదాయం అంచనా' : 'Revenue Projection'}</h2>
          <div className="space-y-3 text-sm relative z-10 font-medium">
            <p className="flex items-center justify-between rounded-xl bg-white/60 backdrop-blur-sm p-3 shadow-sm border border-emerald-100/50"><span>{language === 'te' ? 'అంచనా ధర' : 'Estimated Price'}</span><strong className="text-base text-gray-900 dark:text-white drop-shadow-sm">₹{summary.adjustedPrice.toLocaleString()}</strong></p>
            <p className="flex items-center justify-between rounded-xl bg-white/60 backdrop-blur-sm p-3 shadow-sm border border-emerald-100/50"><span>{language === 'te' ? 'స్థూల ఆదాయం' : 'Gross Income'}</span><strong className="text-base text-gray-900 dark:text-white drop-shadow-sm">₹{summary.gross.toLocaleString()}</strong></p>
            <p className="flex items-center justify-between rounded-xl bg-white/60 backdrop-blur-sm p-3 shadow-sm border border-emerald-100/50"><span>{language === 'te' ? 'మొత్తం ఖర్చు' : 'Total Cost'}</span><strong className="text-base text-gray-900 dark:text-white drop-shadow-sm">₹{summary.totalCost.toLocaleString()}</strong></p>
            <div className="flex items-center justify-between rounded-xl bg-white/80 backdrop-blur-sm p-4 shadow-sm border border-emerald-200/60 my-2">
              <span className="font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">{language === 'te' ? 'నికర లాభం' : 'Net Profit'}</span>
              <strong className={`text-xl font-extrabold ${summary.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{summary.net.toLocaleString()}</strong>
            </div>
            <p className="flex items-center justify-between rounded-xl bg-white/60 backdrop-blur-sm p-3 shadow-sm border border-emerald-100/50"><span>ROI</span><strong className="text-base text-gray-900 dark:text-white drop-shadow-sm">{summary.roi.toFixed(1)}%</strong></p>
          </div>

          <div className="relative z-10 mt-6 pt-5 border-t border-emerald-200/50">
            <p className="mb-4 text-sm font-semibold text-emerald-900 flex items-start gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/50">
              <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0"></div>
              {recommendSale}
            </p>

            <button
              type="button"
              onClick={() =>
                createAlert({
                  type: 'market',
                  level: summary.net > 0 ? 'low' : 'medium',
                  message: `${t(crop)}: ${recommendSale}`,
                })
              }
              className="w-full glass-button py-3 text-base shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <IndianRupee size={18} />
              {language === 'te' ? 'లాభ అలర్ట్ సేవ్ చేయండి' : 'Save Profit Alert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}