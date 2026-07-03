import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, RefreshCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, MarketIntelligenceResponse, MarketQueryHistoryItem } from '../services/api';
import { createAlert } from '../utils/alertEngine';
import { RippleButton } from '../components/ui/RippleButton';

const COMMODITIES = ['rice', 'cotton', 'chilli', 'soybean', 'maize', 'onion', 'turmeric', 'banana'];

function TrendVisualization({ data }: { data: MarketIntelligenceResponse['trendSeries'] }) {
  if (!data.length) return null;

  const values = data.map((item) => item.avgPrice);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 640;
  const height = 180;
  const padding = 24;

  const points = data
    .map((item, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const ratio = max === min ? 0.5 : (item.avgPrice - min) / (max - min);
      const y = height - padding - ratio * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const predicted = data
    .map((item, idx) => {
      const value = item.predictedPrice ?? item.avgPrice;
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const ratio = max === min ? 0.5 : (value - min) / (max - min);
      const y = height - padding - ratio * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-indigo-200/50 bg-indigo-50/50 backdrop-blur-sm p-5 shadow-sm">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full drop-shadow-sm" role="img" aria-label="Price trend chart">
        <polyline fill="none" stroke="#4f46e5" strokeWidth="3" points={points} />
        <polyline fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 6" points={predicted} />
      </svg>
      <div className="mt-4 flex items-center justify-center gap-6 text-sm font-semibold text-gray-800 dark:text-gray-200">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600 shadow-sm" /> Historical avg</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" /> Predicted</span>
      </div>
    </div>
  );
}

function locateUser(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 17.385, lng: 78.4867 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        resolve({ lat: 17.385, lng: 78.4867 });
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  });
}

export function MarketPrices() {
  const { language, t } = useLanguage();
  const [commodity, setCommodity] = useState('rice');
  const [areaAcres, setAreaAcres] = useState('2');
  const [costPerAcre, setCostPerAcre] = useState('25000');
  const [detailed, setDetailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [marketData, setMarketData] = useState<MarketIntelligenceResponse | null>(null);
  const [history, setHistory] = useState<MarketQueryHistoryItem[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const title = language === 'te' ? 'మార్కెట్ ఇంటెలిజెన్స్' : 'Market Intelligence';

  const topMarkets = useMemo(() => {
    if (!marketData) return [];
    return marketData.markets.slice(0, 3);
  }, [marketData]);

  const refreshData = async () => {
    setLoading(true);
    setError('');

    try {
      const currentLocation = await locateUser();
      setLocation(currentLocation);
      const payload = {
        commodity,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        areaAcres: Math.max(0.2, Number(areaAcres) || 2),
        costPerAcre: Math.max(1000, Number(costPerAcre) || 25000),
      };
      const response = await api.getMarketIntelligence(payload);
      setMarketData(response);
      await api.saveMarketQuery(payload);
      const historyResponse = await api.getMarketQueryHistory();
      setHistory(historyResponse.history || []);

      if (response.bestMarket) {
        createAlert({
          type: 'market',
          level: 'low',
          message: `${response.bestMarket.market}: expected net ₹${response.bestMarket.economics.netProfit.toLocaleString()}`,
        });
      }
    } catch {
      setError(language === 'te' ? 'మార్కెట్ డేటా లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.' : 'Unable to load market intelligence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  return (
    <div className="mx-auto max-w-5xl animate-fade-in p-4 space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-3xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">
          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 shadow-sm">
            <TrendingUp size={28} />
          </div>
          {title}
        </h1>
        <RippleButton
          type="button"
          onClick={refreshData}
          variant="secondary"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw size={16} />}
          {language === 'te' ? 'రిఫ్రెష్' : 'Refresh'}
        </RippleButton>
      </div>

      <div className="mb-6 grid gap-4 glass-card p-5 md:grid-cols-4">
        <label className="text-sm font-semibold font-display text-gray-800 dark:text-gray-200">
          {t('commodity')}
          <select value={commodity} onChange={(event) => setCommodity(event.target.value)} className="glass-input mt-1.5 w-full">
            {COMMODITIES.map((item) => (
              <option key={item} value={item}>{t(item)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold font-display text-gray-800 dark:text-gray-200">
          {language === 'te' ? 'భూమి (ఎకరాలు)' : 'Land (acres)'}
          <input className="glass-input mt-1.5 w-full" type="number" min="0.2" step="0.1" value={areaAcres} onChange={(event) => setAreaAcres(event.target.value)} />
        </label>
        <label className="text-sm font-semibold font-display text-gray-800 dark:text-gray-200">
          {language === 'te' ? 'ఎకరాకు ఖర్చు (₹)' : 'Cost per acre (₹)'}
          <input className="glass-input mt-1.5 w-full" type="number" min="1000" value={costPerAcre} onChange={(event) => setCostPerAcre(event.target.value)} />
        </label>
        <div className="flex items-end">
          <RippleButton type="button" onClick={refreshData} variant="primary" className="w-full py-2.5">
            {language === 'te' ? 'లాభం చూసి మార్కెట్ ఎంచుకోండి' : 'Get Best Market'}
          </RippleButton>
        </div>
      </div>

      {error && <p className="mb-6 rounded-lg border border-red-200 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-900 dark:text-red-300 px-4 py-3 text-sm text-red-700">{error}</p>}

      {marketData && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-panel relative overflow-hidden bg-gradient-to-br from-emerald-50/80 to-green-100/80 p-5 shadow-md border-emerald-200/50">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400 blur-3xl opacity-20"></div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 relative z-10">{language === 'te' ? 'సూచించిన మార్కెట్' : 'Best Market'}</p>
              <p className="mt-2 text-3xl font-extrabold font-display text-emerald-950 relative z-10">{marketData.bestMarket?.market || '-'}</p>
              <p className="text-base font-semibold text-emerald-800 relative z-10 mt-1">₹{marketData.bestMarket?.modalPrice.toLocaleString() || '-'} / qtl</p>
              <p className="mt-3 inline-flex rounded-lg bg-emerald-600/10 px-3 py-1 text-sm font-bold text-emerald-900 border border-emerald-600/20 relative z-10">{language === 'te' ? 'అంచనా నికర లాభం' : 'Estimated net profit'}: ₹{marketData.bestMarket?.economics.netProfit.toLocaleString() || '-'}</p>
            </div>

            <div className="glass-panel relative overflow-hidden bg-gradient-to-br from-blue-50/80 to-indigo-100/80 p-5 shadow-md border-blue-200/50">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400 blur-3xl opacity-20"></div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800 relative z-10">{language === 'te' ? '7-రోజుల అంచనా ధర' : '7-Day Predicted Price'}</p>
              <p className="mt-2 text-3xl font-extrabold font-display text-blue-950 relative z-10">₹{marketData.futurePrediction.toLocaleString()} <span className="text-lg text-blue-800 font-medium">/ qtl</span></p>
              <p className="mt-3 text-sm font-medium text-blue-800/80 relative z-10">{language === 'te' ? 'ట్రెండ్ ఆధారిత ప్రాథమిక అంచనా' : 'Basic model based prediction'}</p>
            </div>

            <div className="glass-panel p-5 shadow-md bg-white/50">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">{language === 'te' ? 'ప్రస్తుత లొకేషన్' : 'Current Location'}</p>
              <p className="mt-2 text-lg font-bold font-display text-indigo-950">
                <span className="inline-flex items-center gap-1.5"><MapPin size={18} className="text-indigo-500" /> {location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : '-'}</span>
              </p>
              <p className="mt-3 inline-flex rounded-lg bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-900 border border-indigo-100">{language === 'te' ? `సగటు దిగుబడి: ${marketData.yieldQPerAcre} క్వింటాళ్లు/ఎకరం` : `Avg yield: ${marketData.yieldQPerAcre} qtl/acre`}</p>
            </div>
          </div>

          <TrendVisualization data={marketData.trendSeries} />

          <div className="glass-card p-6">
            <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">{language === 'te' ? 'ఈరోజు ఏమి చేయాలి?' : 'What to do today?'}</h2>
            <ul className="mt-4 space-y-3 text-sm text-gray-900 dark:text-white drop-shadow-sm font-medium">
              {marketData.insights.map((line, index) => (
                <li key={index} className="rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 border border-gray-100 px-4 py-3 shadow-sm">{line}</li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">{language === 'te' ? 'టాప్ మార్కెట్లు' : 'Top Markets'}</h2>
              <RippleButton type="button" onClick={() => setDetailed((prev) => !prev)} variant="secondary" className="text-xs px-3 py-1.5">
                {detailed ? (language === 'te' ? 'సరళ వీక్షణ' : 'Simple View') : (language === 'te' ? 'వివరాలు చూపించు' : 'Show Details')}
              </RippleButton>
            </div>

            <div className="space-y-4">
              {topMarkets.map((item) => (
                <div key={item.market} className="rounded-2xl border border-gray-100 bg-white/40 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <p className="font-bold font-display text-lg text-gray-900 dark:text-white drop-shadow-sm">{item.market}{item.recommended && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{language === 'te' ? 'ఉత్తమ ఎంపిక' : 'Best Choice'}</span>}</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100/50 px-2.5 py-1 rounded-lg border border-gray-200/50">{item.distanceKm ? `${item.distanceKm} km` : (language === 'te' ? 'దూరం లేదు' : 'No distance data')}</p>
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white drop-shadow-sm mb-2">₹{item.modalPrice.toLocaleString()} <span className="text-sm font-medium text-gray-600 dark:text-gray-400">/ qtl</span></p>
                  
                  <div className="flex flex-wrap gap-4 items-center bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 rounded-xl p-3 border border-gray-100">
                    <div className="text-sm font-semibold">
                      {item.trend7d >= 0 ? <span className="inline-flex items-center gap-1 text-emerald-700"><TrendingUp size={16} /> {item.trend7d}%</span> : <span className="inline-flex items-center gap-1 text-rose-700"><TrendingDown size={16} /> {item.trend7d}%</span>}
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white drop-shadow-sm">
                      <span className="text-gray-600 dark:text-gray-400 font-medium mr-1">{language === 'te' ? 'అంచనా నికర లాభం' : 'Net profit'}:</span> ₹{item.economics.netProfit.toLocaleString()}
                    </div>
                  </div>

                  {detailed && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-gray-800 dark:text-gray-200 font-medium bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                      <p><span className="text-gray-600 dark:text-gray-400">{language === 'te' ? 'అంచనా 7రోజుల ధర' : 'Predicted 7-day price'}:</span> ₹{item.predictedPrice7d.toLocaleString()}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">{language === 'te' ? 'గ్రాస్ ఆదాయం' : 'Gross income'}:</span> ₹{item.economics.grossIncome.toLocaleString()}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">{language === 'te' ? 'మొత్తం ఖర్చు' : 'Total cost'}:</span> ₹{item.economics.totalCost.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {detailed && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] text-left">
                      <th className="p-2">{t('market')}</th>
                      <th className="p-2">{t('price')}</th>
                      <th className="p-2">{t('trend')}</th>
                      <th className="p-2">{language === 'te' ? 'అంచనా' : 'Prediction'}</th>
                      <th className="p-2">{language === 'te' ? 'నెట్ లాభం' : 'Net Profit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketData.markets.map((item) => (
                      <tr key={item.market} className="border-b border-gray-100">
                        <td className="p-2">{item.market}</td>
                        <td className="p-2">₹{item.modalPrice.toLocaleString()}</td>
                        <td className="p-2">{item.trend7d}%</td>
                        <td className="p-2">₹{item.predictedPrice7d.toLocaleString()}</td>
                        <td className={`p-2 font-semibold ${item.economics.netProfit >= 0 ? 'text-[#2a6d5d] dark:text-[#4eb69c]' : 'text-red-700'}`}>
                          ₹{item.economics.netProfit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">{language === 'te' ? 'ఇటీవలి మార్కెట్ ప్రశ్నలు' : 'Recent Market Queries'}</h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">{language === 'te' ? 'ఇప్పటికీ హిస్టరీ లేదు.' : 'No history yet.'}</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm font-medium text-gray-900 dark:text-white drop-shadow-sm">
                {history.slice(0, 5).map((item) => (
                  <li key={item.id} className="rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 border border-gray-100 px-4 py-3 flex flex-wrap justify-between items-center gap-3">
                    <span>
                      <span className="font-bold text-gray-900 dark:text-white drop-shadow-sm">{t(item.commodity)}</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span>{item.bestMarket || '-'}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100">₹{item.bestNetProfit?.toLocaleString() || 0}</span>
                      <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && !marketData && !error && (
        <div className="mt-6 glass-panel border-dashed border-gray-300 p-12 text-center text-gray-600 dark:text-gray-400 bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/30">
          {language === 'te' ? 'మార్కెట్ డేటా మరియు లాభాల అంచనా కోసం పైనున్న ఫారం నింపండి.' : 'Fill out the form above to get market intelligence and profit estimates.'}
        </div>
      )}
    </div>
  );
}