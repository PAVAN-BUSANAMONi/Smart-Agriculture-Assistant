import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, RefreshCcw, TrendingDown, TrendingUp, DollarSign, Store, Sparkles, ChevronRight, BarChart3 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, MarketIntelligenceResponse, MarketQueryHistoryItem } from '../services/api';
import { createAlert } from '../utils/alertEngine';

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
    <div className="w-full overflow-x-auto rounded-[24px] aurora-glass-medium p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="aurora-label flex items-center gap-1.5 text-cyan-300">
          <BarChart3 size={14} /> Price Volatility & Forecast Trajectory
        </span>
        <span className="text-[11px] text-white/50">Historical vs 7-Day Projection</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[580px] w-full" role="img" aria-label="Price trend chart">
        <defs>
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#gridGrad)" rx="12" />
        <polyline fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <polyline fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" points={predicted} />
      </svg>

      <div className="flex items-center justify-center gap-6 text-xs font-medium text-white/80 pt-1">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" /> Historical avg
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" /> Predicted trend
        </span>
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
              <span>Mandi Price & Profit Arbitrage</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight flex items-center gap-2.5">
              <TrendingUp size={24} className="text-emerald-300" />
              <span>{title}</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="aurora-glass-button text-xs py-2 px-3.5 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw size={14} />}
            <span>{language === 'te' ? 'రిఫ్రెష్' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* ═══ Filter Input Surface (Strong Glass) ═══ */}
        <div className="aurora-glass-strong p-5 sm:p-6 rounded-[26px] grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
          <div>
            <label className="aurora-label mb-1.5 block">{t('commodity')}</label>
            <select
              value={commodity}
              onChange={(event) => setCommodity(event.target.value)}
              className="aurora-glass-input text-xs py-2.5 w-full"
            >
              {COMMODITIES.map((item) => (
                <option key={item} value={item} className="bg-[#04121b] text-white">
                  {t(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="aurora-label mb-1.5 block">
              {language === 'te' ? 'భూమి (ఎకరాలు)' : 'Land (acres)'}
            </label>
            <input
              className="aurora-glass-input text-xs py-2.5 w-full"
              type="number"
              min="0.2"
              step="0.1"
              value={areaAcres}
              onChange={(event) => setAreaAcres(event.target.value)}
            />
          </div>

          <div>
            <label className="aurora-label mb-1.5 block">
              {language === 'te' ? 'ఎకరాకు ఖర్చు (₹)' : 'Cost per acre (₹)'}
            </label>
            <input
              className="aurora-glass-input text-xs py-2.5 w-full"
              type="number"
              min="1000"
              value={costPerAcre}
              onChange={(event) => setCostPerAcre(event.target.value)}
            />
          </div>

          <div>
            <button
              type="button"
              onClick={refreshData}
              disabled={loading}
              className="w-full aurora-glass-button-primary text-xs sm:text-sm font-semibold py-2.5 flex items-center justify-center gap-2"
            >
              <Sparkles size={15} className="text-emerald-300" />
              <span>{language === 'te' ? 'లాభం చూసి మార్కెట్ ఎంచుకోండి' : 'Get Best Market'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="aurora-card p-3.5 border-rose-400/30 bg-rose-500/15 text-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* ═══ Market Analytics Workspace ═══ */}
        {marketData && (
          <div className="space-y-6">
            {/* 3 Overview Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {/* Best Market */}
              <div className="aurora-glass-strong p-6 rounded-[24px] border-emerald-400/30 space-y-2 relative overflow-hidden">
                <span className="aurora-label text-emerald-300">
                  {language === 'te' ? 'సూచించిన మార్కెట్' : 'Recommended Mandi'}
                </span>
                <p className="text-2xl sm:text-3xl font-semibold text-white/95 tracking-tight">
                  {marketData.bestMarket?.market || '-'}
                </p>
                <p className="text-sm font-semibold text-emerald-300">
                  ₹{marketData.bestMarket?.modalPrice.toLocaleString() || '-'} <span className="text-xs font-normal text-white/60">/ qtl</span>
                </p>
                <div className="pt-2">
                  <span className="aurora-badge-success text-xs px-3 py-1 rounded-full font-bold">
                    {language === 'te' ? 'అంచనా నికర లాభం' : 'Est. Net Profit'}: ₹{marketData.bestMarket?.economics.netProfit.toLocaleString() || '-'}
                  </span>
                </div>
              </div>

              {/* 7-Day Predicted Price */}
              <div className="aurora-glass-strong p-6 rounded-[24px] border-cyan-400/30 space-y-2 relative overflow-hidden">
                <span className="aurora-label text-cyan-300">
                  {language === 'te' ? '7-రోజుల అంచనా ధర' : '7-Day Price Projection'}
                </span>
                <p className="text-2xl sm:text-3xl font-semibold text-white/95 tracking-tight">
                  ₹{marketData.futurePrediction.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-white/60">/ qtl</span>
                </p>
                <p className="text-xs text-white/70 pt-1">
                  {language === 'te' ? 'ట్రెండ్ ఆధారిత ప్రాథమిక అంచనా' : 'Time-series machine learning model'}
                </p>
              </div>

              {/* Current Location & Yield */}
              <div className="aurora-glass-medium p-6 rounded-[24px] space-y-2 sm:col-span-2 md:col-span-1">
                <span className="aurora-label text-white/65">
                  {language === 'te' ? 'ప్రస్తుత లొకేషన్' : 'Geolocation Context'}
                </span>
                <p className="text-base font-semibold text-white/90 flex items-center gap-1.5">
                  <MapPin size={16} className="text-cyan-300" />
                  <span>{location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : 'Hyderabad, TG'}</span>
                </p>
                <div className="pt-2">
                  <span className="aurora-badge-info text-xs px-3 py-1 rounded-full font-semibold">
                    {language === 'te' ? `సగటు దిగుబడి: ${marketData.yieldQPerAcre} క్వి/ఎకరం` : `Avg Yield: ${marketData.yieldQPerAcre} qtl/acre`}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Trend Chart */}
            <TrendVisualization data={marketData.trendSeries} />

            {/* Actionable Today Insights */}
            <div className="aurora-glass-medium p-6 rounded-[24px] space-y-3">
              <h2 className="text-base font-semibold text-white/95 flex items-center gap-2 pb-2 border-b border-white/10">
                <Sparkles size={16} className="text-emerald-300" />
                <span>{language === 'te' ? 'ఈరోజు ఏమి చేయాలి?' : 'What to Do Today'}</span>
              </h2>
              <ul className="space-y-2 text-xs sm:text-sm text-white/85">
                {marketData.insights.map((line, index) => (
                  <li key={index} className="aurora-glass-light p-3 rounded-xl flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top Markets List & Detailed View */}
            <div className="aurora-glass-strong p-6 sm:p-7 rounded-[26px] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10">
                <div>
                  <h2 className="text-base font-semibold text-white/95">
                    {language === 'te' ? 'టాప్ మార్కెట్లు' : 'Top Performing Mandis'}
                  </h2>
                  <p className="text-xs text-white/60">Ranked by net financial return after transportation costs</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailed((prev) => !prev)}
                  className="aurora-glass-button text-xs py-1.5 px-3.5"
                >
                  {detailed
                    ? language === 'te' ? 'సరళ వీక్షణ' : 'Simple View'
                    : language === 'te' ? 'వివరాలు చూపించు' : 'Show Full Breakdown'}
                </button>
              </div>

              <div className="space-y-3.5">
                {topMarkets.map((item) => (
                  <div
                    key={item.market}
                    className="aurora-glass-medium p-5 rounded-[22px] space-y-3 hover:bg-white/15 transition-all duration-200"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold text-white/95">{item.market}</h4>
                        {item.recommended && (
                          <span className="aurora-badge-success text-[10.5px] px-2 py-0.5 rounded-full font-bold">
                            {language === 'te' ? 'ఉత్తమ ఎంపిక' : 'Optimal'}
                          </span>
                        )}
                      </div>
                      <span className="aurora-glass-pill text-[11px]">
                        {item.distanceKm ? `${item.distanceKm} km away` : 'Regional Hub'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center pt-1 text-xs">
                      <div>
                        <span className="text-white/60 block text-[10.5px]">Modal Price</span>
                        <span className="text-sm font-semibold text-white">₹{item.modalPrice.toLocaleString()} <span className="text-[10px] font-normal text-white/50">/ qtl</span></span>
                      </div>

                      <div className="w-px h-6 bg-white/10" />

                      <div>
                        <span className="text-white/60 block text-[10.5px]">7-Day Trend</span>
                        <span className={`font-semibold flex items-center gap-1 ${item.trend7d >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {item.trend7d >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {item.trend7d}%
                        </span>
                      </div>

                      <div className="w-px h-6 bg-white/10" />

                      <div>
                        <span className="text-white/60 block text-[10.5px]">Estimated Net Profit</span>
                        <span className="text-sm font-semibold text-emerald-300">₹{item.economics.netProfit.toLocaleString()}</span>
                      </div>
                    </div>

                    {detailed && (
                      <div className="mt-3 pt-3 border-t border-white/10 grid gap-2 sm:grid-cols-3 text-xs text-white/75 aurora-glass-light p-3 rounded-xl animate-fade-in">
                        <p>
                          <span className="text-white/50">Predicted 7d:</span> ₹{item.predictedPrice7d.toLocaleString()}
                        </p>
                        <p>
                          <span className="text-white/50">Gross Income:</span> ₹{item.economics.grossIncome.toLocaleString()}
                        </p>
                        <p>
                          <span className="text-white/50">Total Cost:</span> ₹{item.economics.totalCost.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {detailed && (
                <div className="mt-4 overflow-x-auto aurora-glass-medium p-4 rounded-2xl animate-fade-in">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/10 text-white/60 pb-2">
                        <th className="p-2.5 font-medium">{t('market')}</th>
                        <th className="p-2.5 font-medium">{t('price')}</th>
                        <th className="p-2.5 font-medium">{t('trend')}</th>
                        <th className="p-2.5 font-medium">{language === 'te' ? 'అంచనా' : 'Prediction'}</th>
                        <th className="p-2.5 font-medium">{language === 'te' ? 'నెట్ లాభం' : 'Net Profit'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {marketData.markets.map((item) => (
                        <tr key={item.market} className="text-white/85 hover:bg-white/5">
                          <td className="p-2.5 font-medium">{item.market}</td>
                          <td className="p-2.5">₹{item.modalPrice.toLocaleString()}</td>
                          <td className={`p-2.5 ${item.trend7d >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {item.trend7d}%
                          </td>
                          <td className="p-2.5">₹{item.predictedPrice7d.toLocaleString()}</td>
                          <td className={`p-2.5 font-semibold ${item.economics.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            ₹{item.economics.netProfit.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Queries Stream */}
            <aside className="aurora-glass-medium p-5 rounded-[24px] space-y-3">
              <h2 className="text-sm font-semibold text-white/95 pb-2 border-b border-white/10">
                {language === 'te' ? 'ఇటీవలి మార్కెట్ ప్రశ్నలు' : 'Recent Market Queries'}
              </h2>
              {history.length === 0 ? (
                <p className="text-xs text-white/50 py-3 text-center">
                  {language === 'te' ? 'ఇప్పటికీ హిస్టరీ లేదు.' : 'No search history recorded yet.'}
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {history.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="aurora-glass-light p-3 rounded-xl flex flex-wrap justify-between items-center gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white/95 capitalize">{t(item.commodity)}</span>
                        <span className="text-white/30">•</span>
                        <span className="text-white/70">{item.bestMarket || '-'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="aurora-badge-success text-[10.5px] px-2 py-0.5 rounded-md font-bold">
                          ₹{item.bestNetProfit?.toLocaleString() || 0}
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
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}

        {!loading && !marketData && !error && (
          <div className="aurora-glass-medium p-12 text-center rounded-[26px] text-sm text-white/60">
            {language === 'te'
              ? 'మార్కెట్ డేటా మరియు లాభాల అంచనా కోసం పైనున్న ఫారం నింపండి.'
              : 'Fill out the commodity and land parameters above to calculate real-time mandi prices and net profit forecasts.'}
          </div>
        )}
      </div>
    </div>
  );
}
