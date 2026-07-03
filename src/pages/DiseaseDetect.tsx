import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Bug, Upload, RefreshCw, History, X } from 'lucide-react';
import { api } from '../services/api';
import { createAlert, shouldTriggerAlert } from '../utils/alertEngine';
import { pushBrowserNotification } from '../utils/browserNotifications';
import { RippleButton } from '../components/ui/RippleButton';

type DetectionResult = {
  nameKey: string;
  obsKey: string;
  cureKey: string;
  confidence: number;
  scientificName?: string;
  description?: string;
  symptoms?: string[];
  organicTreatment?: string[];
  chemicalTreatment?: string[];
  applicationSteps?: string[];
  safetyPrecautions?: string[];
  recoveryTime?: string;
  preventionMethods?: string[];
  cropRotation?: string;
  waterManagement?: string;
  soilHealth?: string;
  spacingTechniques?: string;
  resistantVarieties?: string;
  toolSanitation?: string;
  seasonalPrecautions?: string;
  referenceImages?: Array<{ stage: string; url: string; caption: string; source: string }>;
  contextAdvice?: string[];
  source?: string;
  verificationResults?: Array<{ type: string; diseaseKey: string; diseaseName: string; confidence: number; }>;
};

type ScanHistoryItem = {
  id: string;
  crop: string;
  diseaseKey: string;
  confidence: number;
  level: 'low' | 'medium' | 'high';
  createdAt: string;
};

const DISEASE_KEY_MAP: Record<string, { nameKey: string; obsKey: string; cureKey: string }> = {
  healthy: { nameKey: 'healthy', obsKey: 'healthy_msg', cureKey: 'healthy_msg' },
  leaf_blight: { nameKey: 'leaf_blight', obsKey: 'leaf_blight_obs', cureKey: 'leaf_blight_cure' },
  rust: { nameKey: 'leaf_blight', obsKey: 'leaf_blight_obs', cureKey: 'leaf_blight_cure' },
  powdery_mildew: {
    nameKey: 'powdery_mildew',
    obsKey: 'powdery_mildew_obs',
    cureKey: 'powdery_mildew_cure',
  },
  unknown: { nameKey: 'unknown_disease', obsKey: 'unknown_msg', cureKey: 'unknown_msg' },
  not_a_plant: { nameKey: 'not_a_plant', obsKey: 'not_a_plant_obs', cureKey: 'not_a_plant_cure' },
  blurry: { nameKey: 'blurry', obsKey: 'blurry_obs', cureKey: 'blurry_cure' },
  low_light: { nameKey: 'low_light', obsKey: 'low_light_obs', cureKey: 'low_light_cure' },
  multiple_plants: { nameKey: 'multiple_plants', obsKey: 'multiple_plants_obs', cureKey: 'multiple_plants_cure' },
  leaf_not_visible: { nameKey: 'leaf_not_visible', obsKey: 'leaf_not_visible_obs', cureKey: 'leaf_not_visible_cure' },
  uncertain: { nameKey: 'uncertain', obsKey: 'uncertain_obs', cureKey: 'uncertain_cure' },
};

export function DiseaseDetect() {
  const { t, language } = useLanguage();
  type UploadSlot = 'front' | 'back' | 'full';
  const [images, setImages] = useState<Record<UploadSlot, string | null>>({ front: null, back: null, full: null });
  const [activeSlot, setActiveSlot] = useState<UploadSlot | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'treatment' | 'prevention' | 'safety' | 'references' | 'verification'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeSlot) {
      const file = e.target.files[0];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      setImages((prev) => ({ ...prev, [activeSlot]: dataUrl }));
      setResult(null);
    }
  };

  const notify = (title: string, message: string) => {
    void pushBrowserNotification({
      type: 'disease',
      level: 'high',
      title,
      message,
      path: '/disease-detect',
    });
  };

  const sendManagerAlert = async (message: string) => {
    const managerWebhookUrl = localStorage.getItem('managerWebhookUrl');
    if (!managerWebhookUrl) return;

    try {
      await fetch(managerWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Disease Detection Alert', body: message, time: new Date().toISOString() }),
      });
    } catch {
      // Keep UI responsive even if manager webhook is unavailable.
    }
  };

  const preprocessImage = async (source: string): Promise<string> => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load.'));
      img.src = source;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported.');

    // Resize before upload to reduce bandwidth for rural networks.
    const maxSize = 512;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.82);
  };

  const localFallback = async (src: string): Promise<DetectionResult> => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load.'));
      img.src = src;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported.');

    const width = 240;
    const height = Math.max(1, Math.round((img.height / img.width) * width));
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const pixels = ctx.getImageData(0, 0, width, height).data;
    let green = 0;
    let brown = 0;
    let yellow = 0;
    let white = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      if (g > r + 20 && g > b + 20) green += 1;
      if (r > 85 && g > 45 && g < 150 && b < 100) brown += 1;
      if (r > 130 && g > 120 && b < 110) yellow += 1;
      if (r > 190 && g > 190 && b > 190) white += 1;
    }

    const total = pixels.length / 4;
    const brownRatio = brown / total;
    const yellowRatio = yellow / total;
    const whiteRatio = white / total;
    const greenRatio = green / total;

    if (whiteRatio > 0.16) {
      return {
        nameKey: 'powdery_mildew',
        obsKey: 'powdery_mildew_obs',
        cureKey: 'powdery_mildew_cure',
        confidence: Math.min(92, Math.round(68 + whiteRatio * 100)),
        source: 'local-fallback',
      };
    }

    if (brownRatio + yellowRatio > 0.18) {
      return {
        nameKey: 'leaf_blight',
        obsKey: 'leaf_blight_obs',
        cureKey: 'leaf_blight_cure',
        confidence: Math.min(90, Math.round(70 + (brownRatio + yellowRatio) * 100)),
        source: 'local-fallback',
      };
    }

    if (greenRatio > 0.4) {
      return {
        nameKey: 'healthy',
        obsKey: 'healthy_msg',
        cureKey: 'healthy_msg',
        confidence: Math.min(90, Math.round(70 + greenRatio * 35)),
        source: 'local-fallback',
      };
    }

    return {
      nameKey: 'unknown_disease',
      obsKey: 'unknown_msg',
      cureKey: 'unknown_msg',
      confidence: 58,
      source: 'local-fallback',
    };
  };

  const loadHistory = async () => {
    try {
      const response = await api.getDiseaseHistory();
      const mapped = response.scans.slice(0, 8).map((scan) => ({
        id: scan.id,
        crop: scan.crop,
        diseaseKey: scan.diseaseKey,
        confidence: scan.confidence,
        level: scan.level,
        createdAt: scan.createdAt,
      }));
      setScanHistory(mapped);
    } catch {
      setScanHistory([]);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const analyze = async () => {
    if (Object.values(images).filter(Boolean).length === 0) return;
    setAnalyzing(true);

    try {
      // Preprocess all selected images for efficient upload
      const payloadImages = [];
      for (const [type, data] of Object.entries(images)) {
        if (data) {
          const preprocessed = await preprocessImage(data);
          payloadImages.push({ type, data: preprocessed });
        }
      }
      const crop = localStorage.getItem('primaryCrop') || 'unknown';

      // Build environmental context for context-aware recommendations
      const now = new Date();
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const currentMonth = monthNames[now.getMonth()];
      const monthNum = now.getMonth() + 1;
      let season = 'Unknown';
      if (monthNum >= 6 && monthNum <= 9) season = 'Monsoon (Kharif)';
      else if (monthNum >= 10 && monthNum <= 2) season = 'Winter (Rabi)';
      else season = 'Summer (Zaid)';

      let weatherCtx: { temperature?: string; humidity?: string; condition?: string } = {};
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }));
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,weather_code`);
        const wData = await wRes.json();
        if (wData.current) {
          weatherCtx = {
            temperature: `${wData.current.temperature_2m}°C`,
            humidity: `${wData.current.relative_humidity_2m}%`,
            condition: wData.current.weather_code <= 3 ? 'Clear/Sunny' : wData.current.weather_code <= 48 ? 'Cloudy/Foggy' : wData.current.weather_code <= 67 ? 'Rainy' : 'Stormy',
          };
        }
      } catch { /* Location/weather not available, proceed without context */ }

      const growthStage = localStorage.getItem('growthStage') || 'unknown';
      const region = localStorage.getItem('region') || 'unknown';
      const context = { weather: weatherCtx, season, growthStage, region, month: currentMonth };

      const backendResult = await api.analyzeDisease({ images: payloadImages, crop, context });
      const mappedKeys = DISEASE_KEY_MAP[backendResult.prediction.diseaseKey] || DISEASE_KEY_MAP.unknown;
      const detection: DetectionResult = {
        ...mappedKeys,
        confidence: backendResult.prediction.confidence,
        scientificName: backendResult.prediction.scientificName,
        description: backendResult.prediction.description,
        symptoms: backendResult.prediction.symptoms,
        organicTreatment: backendResult.prediction.organicTreatment,
        chemicalTreatment: backendResult.prediction.chemicalTreatment,
        applicationSteps: backendResult.prediction.applicationSteps,
        safetyPrecautions: backendResult.prediction.safetyPrecautions,
        recoveryTime: backendResult.prediction.recoveryTime,
        preventionMethods: backendResult.prediction.preventionMethods,
        cropRotation: backendResult.prediction.cropRotation,
        waterManagement: backendResult.prediction.waterManagement,
        soilHealth: backendResult.prediction.soilHealth,
        spacingTechniques: backendResult.prediction.spacingTechniques,
        resistantVarieties: backendResult.prediction.resistantVarieties,
        toolSanitation: backendResult.prediction.toolSanitation,
        seasonalPrecautions: backendResult.prediction.seasonalPrecautions,
        referenceImages: backendResult.prediction.referenceImages,
        contextAdvice: backendResult.prediction.contextAdvice,
        source: backendResult.prediction.source,
        verificationResults: backendResult.verificationResults,
      };
      setResult(detection);

      const diseaseText = t(detection.nameKey);
      const level = backendResult.prediction.level;
      const signature = `disease-${backendResult.prediction.diseaseKey}-${Math.round(detection.confidence / 5)}`;

      if (shouldTriggerAlert(signature, level)) {
        notify(
          detection.nameKey === 'healthy' ? 'Plant health looks stable' : `${diseaseText} review needed`,
          `Confidence ${detection.confidence}%. ${backendResult.prediction.description || 'Inspect leaves and begin the suggested treatment plan.'}`,
        );
        void sendManagerAlert(`Detected: ${diseaseText} | Confidence: ${detection.confidence}%`);
        createAlert({
          type: 'disease',
          level,
          message: `${diseaseText} detected with ${detection.confidence}% confidence`,
        });
        void api.ingestAlert({
          type: 'disease',
          level,
          title: detection.nameKey === 'healthy' ? 'Plant Health Update' : 'Disease Risk Detected',
          message: `${diseaseText} detected with ${detection.confidence}% confidence`,
          source: 'web-farmer-disease-ai',
          metadata: {
            diseaseKey: backendResult.prediction.diseaseKey,
            confidence: detection.confidence,
            fingerprint: signature,
            inferenceSource: detection.source,
          },
        });
      }
    } catch (err: any) {
      const errorStr = String(err?.message || '') + JSON.stringify(err || {});
      if (errorStr.includes('not_a_plant')) {
         setResult({
            nameKey: 'not_a_plant',
            obsKey: 'not_a_plant_obs',
            cureKey: 'not_a_plant_cure',
            confidence: 100,
            source: 'ai-rejection',
         });
         return;
      }

      try {
        const fallbackResult = await localFallback(images[0]); // Run fallback on first image only
        setResult(fallbackResult);
      } catch {
        setResult({
          nameKey: 'unknown_disease',
          obsKey: 'unknown_msg',
          cureKey: 'unknown_msg',
          confidence: 55,
          source: 'local-fallback',
        });
      }
    } finally {
      setAnalyzing(false);
      void loadHistory();
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in p-4 space-y-6">
      <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">
        <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600 shadow-sm">
          <Bug size={28} />
        </div>
        {t('disease_detection')}
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-panel p-6 lg:col-span-2 relative overflow-hidden">
          <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Upload up to 3 perspectives for higher accuracy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 {(['front', 'back', 'full'] as UploadSlot[]).map((slot) => (
                    <div key={slot} className="relative overflow-hidden rounded-2xl border border-gray-200/60 shadow-sm z-10 group h-48">
                      {images[slot] ? (
                        <>
                          <img src={images[slot]!} alt={`Uploaded ${slot}`} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                          <RippleButton
                            onClick={() => {
                              setImages(prev => ({ ...prev, [slot]: null }));
                            }}
                            className="absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur p-1.5 text-rose-600 shadow-md hover:bg-white transition-transform hover:scale-110"
                          >
                            <X size={16} />
                          </RippleButton>
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur">
                            {slot === 'front' ? 'Front Leaf' : slot === 'back' ? 'Back Leaf' : 'Full Plant'}
                          </div>
                        </>
                      ) : (
                        <div 
                          onClick={() => {
                            setActiveSlot(slot);
                            setTimeout(() => fileInputRef.current?.click(), 0);
                          }}
                          className="flex h-full cursor-pointer flex-col items-center justify-center bg-white/30 backdrop-blur-md hover:bg-white/50 transition-all group relative border-2 border-dashed border-gray-300/60 hover:border-gray-400"
                        >
                          <Upload size={24} className="text-gray-600 mb-2" />
                          <span className="text-sm font-semibold text-gray-700 text-center px-4">
                            {slot === 'front' ? 'Add Front Leaf' : slot === 'back' ? 'Add Back Leaf' : 'Add Full Plant'}
                          </span>
                        </div>
                      )}
                    </div>
                 ))}
                 <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleUpload}
                 />
              </div>
              {Object.values(images).filter(Boolean).length > 0 && (
                <RippleButton
                  onClick={() => {
                    setImages({ front: null, back: null, full: null });
                    setResult(null);
                  }}
                  className="self-end text-sm text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1 mt-2"
                >
                  <RefreshCw size={14} /> Clear all
                </RippleButton>
              )}
            </div>

          {Object.values(images).filter(Boolean).length > 0 && !result && (
            <RippleButton
              onClick={() => void analyze()}
              disabled={analyzing}
              className="mt-6 w-full glass-button py-3 text-lg font-bold shadow-md disabled:opacity-50 flex items-center justify-center gap-2 relative z-10 bg-gradient-to-r from-rose-500 to-red-600 border-none hover:from-rose-600 hover:to-red-700 text-white"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/50 border-t-white animate-spin"></div>
                  {t('analyzing')}
                </>
              ) : (
                t('analyze_button')
              )}
            </RippleButton>
          )}

          {result && (
            <div className="animate-fade-in mt-6 glass-card bg-gradient-to-br from-rose-50/80 to-red-50/80 border-rose-200/50 p-8 relative z-10 shadow-sm">
              <div className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <h2 className="text-3xl font-extrabold font-display text-rose-900">{result.nameKey === 'healthy' || result.nameKey.includes('unknown') || result.nameKey.includes('not_a_plant') || result.nameKey.includes('blurry') || result.nameKey.includes('multiple') ? t(result.nameKey) : (result.nameKey.replace('_', ' '))}</h2>
                  <span className="rounded-xl bg-white/60 backdrop-blur px-3 py-1.5 text-sm font-bold text-rose-800 shadow-sm border border-rose-100">
                    {result.confidence}% {t('confidence')}
                  </span>
                </div>
                {result.scientificName && result.scientificName !== 'N/A' && result.scientificName !== 'Unknown' && (
                  <p className="text-sm italic text-rose-700/80 mb-2">{result.scientificName}</p>
                )}
                
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                  <RippleButton onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/50 text-rose-800 hover:bg-white/80'}`}>Overview</RippleButton>
                  <RippleButton onClick={() => setActiveTab('treatment')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'treatment' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/50 text-rose-800 hover:bg-white/80'}`}>Treatment Plan</RippleButton>
                  <RippleButton onClick={() => setActiveTab('prevention')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'prevention' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/50 text-rose-800 hover:bg-white/80'}`}>Prevention & Protection</RippleButton>
                  <RippleButton onClick={() => setActiveTab('safety')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'safety' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/50 text-rose-800 hover:bg-white/80'}`}>Safety & Recovery</RippleButton>
                  {result.referenceImages && result.referenceImages.length > 0 && (
                     <RippleButton onClick={() => setActiveTab('references')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'references' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/50 text-rose-800 hover:bg-white/80'}`}>Visual Reference</RippleButton>
                  )}
                  {result.verificationResults && result.verificationResults.length > 0 && (
                     <RippleButton onClick={() => setActiveTab('verification')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'verification' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/50 text-rose-800 hover:bg-white/80'}`}>Verification</RippleButton>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {activeTab === 'overview' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                      <h4 className="font-bold text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-800">{result.description || t(result.obsKey)}</p>
                    </div>
                    {result.symptoms && result.symptoms.length > 0 && (
                      <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                        <h4 className="font-bold text-gray-900 mb-2">Common Symptoms</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-800">
                          {result.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.contextAdvice && result.contextAdvice.length > 0 && (
                      <div className="bg-gradient-to-br from-sky-50/80 to-blue-50/80 p-4 rounded-xl shadow-sm border border-sky-200/50">
                        <h4 className="font-bold text-sky-900 mb-2 flex items-center gap-2">
                          <span className="text-lg">🌦️</span> Context-Aware Advice
                        </h4>
                        <ul className="space-y-2 text-sky-800 text-sm">
                          {result.contextAdvice.map((advice, i) => (
                            <li key={i} className="flex gap-2 items-start">
                              <span className="text-sky-500 font-bold mt-0.5 shrink-0">•</span>
                              <span>{advice}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'treatment' && (
                  <div className="space-y-4 animate-fade-in">
                    {result.organicTreatment && result.organicTreatment.length > 0 && (
                      <div className="bg-emerald-50/80 p-4 rounded-xl shadow-sm border border-emerald-200/50">
                        <h4 className="font-bold text-emerald-900 mb-2">Organic Treatment</h4>
                        <ul className="list-disc pl-5 space-y-1 text-emerald-800">
                          {result.organicTreatment.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.chemicalTreatment && result.chemicalTreatment.length > 0 && (
                      <div className="bg-amber-50/80 p-4 rounded-xl shadow-sm border border-amber-200/50">
                        <h4 className="font-bold text-amber-900 mb-2">Chemical Treatment</h4>
                        <ul className="list-disc pl-5 space-y-1 text-amber-800">
                          {result.chemicalTreatment.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.applicationSteps && result.applicationSteps.length > 0 && (
                      <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50 mt-2">
                        <h4 className="font-bold text-gray-900 mb-2">Application Steps</h4>
                        <ol className="list-decimal pl-5 space-y-1 text-gray-800">
                          {result.applicationSteps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      </div>
                    )}
                  </div>
                )}


                {activeTab === 'prevention' && (
                  <div className="space-y-4 animate-fade-in">
                    {result.preventionMethods && result.preventionMethods.length > 0 && (
                      <div className="bg-emerald-50/80 p-4 rounded-xl shadow-sm border border-emerald-200/50">
                        <h4 className="font-bold text-emerald-900 mb-3 text-lg border-b border-emerald-200/50 pb-2">Prevention Checklist</h4>
                        <ul className="space-y-2 text-emerald-800">
                          {result.preventionMethods.map((s, i) => (
                            <li key={i} className="flex gap-2 items-center font-medium">
                              <span className="text-emerald-600 font-bold">✓</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.cropRotation && result.cropRotation !== 'N/A' && (
                        <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Crop Rotation</h4>
                          <p className="text-gray-800 text-sm">{result.cropRotation}</p>
                        </div>
                      )}
                      {result.waterManagement && result.waterManagement !== 'N/A' && (
                        <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Water Management</h4>
                          <p className="text-gray-800 text-sm">{result.waterManagement}</p>
                        </div>
                      )}
                      {result.soilHealth && result.soilHealth !== 'N/A' && (
                        <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Soil Health</h4>
                          <p className="text-gray-800 text-sm">{result.soilHealth}</p>
                        </div>
                      )}
                      {result.spacingTechniques && result.spacingTechniques !== 'N/A' && (
                        <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Spacing</h4>
                          <p className="text-gray-800 text-sm">{result.spacingTechniques}</p>
                        </div>
                      )}
                      {result.resistantVarieties && result.resistantVarieties !== 'N/A' && (
                        <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Resistant Varieties</h4>
                          <p className="text-gray-800 text-sm">{result.resistantVarieties}</p>
                        </div>
                      )}
                      {result.toolSanitation && result.toolSanitation !== 'N/A' && (
                        <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Tool Sanitation</h4>
                          <p className="text-gray-800 text-sm">{result.toolSanitation}</p>
                        </div>
                      )}
                      {result.seasonalPrecautions && result.seasonalPrecautions !== 'N/A' && (
                        <div className="bg-white/40 p-4 rounded-xl shadow-sm border border-white/50 md:col-span-2">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm uppercase tracking-wide">Seasonal Precautions</h4>
                          <p className="text-gray-800 text-sm">{result.seasonalPrecautions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'safety' && (
                  <div className="space-y-4 animate-fade-in">
                    {result.safetyPrecautions && result.safetyPrecautions.length > 0 && (
                      <div className="bg-blue-50/80 p-4 rounded-xl shadow-sm border border-blue-200/50">
                        <h4 className="font-bold text-blue-900 mb-2">Safety Precautions</h4>
                        <ul className="list-disc pl-5 space-y-1 text-blue-800">
                          {result.safetyPrecautions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.recoveryTime && (
                      <div className="bg-purple-50/80 p-4 rounded-xl shadow-sm border border-purple-200/50">
                        <h4 className="font-bold text-purple-900 mb-1">Expected Recovery Time</h4>
                        <p className="text-purple-800 font-medium">{result.recoveryTime}</p>
                      </div>
                    )}
                  </div>
                )}


                {activeTab === 'references' && result.referenceImages && result.referenceImages.length > 0 && (
                  <div className="space-y-6 animate-fade-in">
                    <p className="text-sm text-gray-600 bg-white/40 p-3 rounded-lg border border-gray-200/50">
                      Compare your plant with these verified reference images from trusted agricultural databases to confirm the diagnosis.
                    </p>
                    {(['healthy', 'mild', 'moderate', 'severe'] as const).map((stage) => {
                      const stageImages = result.referenceImages!.filter(img => img.stage === stage);
                      if (stageImages.length === 0) return null;
                      const stageColors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
                        healthy: { bg: 'bg-emerald-50/80', border: 'border-emerald-200/50', badge: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-900' },
                        mild: { bg: 'bg-yellow-50/80', border: 'border-yellow-200/50', badge: 'bg-yellow-100 text-yellow-800', text: 'text-yellow-900' },
                        moderate: { bg: 'bg-orange-50/80', border: 'border-orange-200/50', badge: 'bg-orange-100 text-orange-800', text: 'text-orange-900' },
                        severe: { bg: 'bg-red-50/80', border: 'border-red-200/50', badge: 'bg-red-100 text-red-800', text: 'text-red-900' },
                      };
                      const colors = stageColors[stage];
                      return (
                        <div key={stage} className={`${colors.bg} p-4 rounded-xl shadow-sm border ${colors.border}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`${colors.badge} text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide`}>{stage}</span>
                            <span className={`text-sm font-semibold ${colors.text}`}>
                              {stage === 'healthy' ? 'Healthy Reference' : stage === 'mild' ? 'Early Stage' : stage === 'moderate' ? 'Mid Stage' : 'Advanced Stage'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {stageImages.map((img, i) => (
                              <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
                                <img
                                  src={img.url}
                                  alt={img.caption}
                                  className="w-full h-40 object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                                  loading="lazy"
                                />
                                <div className="p-3">
                                  <p className="text-xs text-gray-700 leading-relaxed">{img.caption}</p>
                                  <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Source: {img.source}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'verification' && result.verificationResults && (
                  <div className="animate-fade-in space-y-2">
                    {result.verificationResults.map((v, i) => {
                      const mapped = DISEASE_KEY_MAP[v.diseaseKey] || DISEASE_KEY_MAP.unknown;
                      return (
                        <div key={i} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-rose-100 shadow-sm">
                          <span className="capitalize font-bold text-rose-900">{v.type} Image</span>
                          <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium text-gray-700">{v.diseaseName || t(mapped.nameKey)}</span>
                            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg">{v.confidence}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-rose-100/50">
                  <p className="text-xs text-gray-500 font-medium">
                    {language === 'te' ? 'డేటా మూలం' : 'Inference source'}: {result.source || 'unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="glass-card p-6 h-max">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold font-display text-gray-900 dark:text-white drop-shadow-sm">
            <History size={20} className="text-gray-600 dark:text-gray-400" />
            {language === 'te' ? 'తాజా స్కాన్‌లు' : 'Recent scans'}
          </h3>
          <div className="space-y-3">
            {scanHistory.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium py-4 text-center">{language === 'te' ? 'చరిత్ర అందుబాటులో లేదు.' : 'No scan history yet.'}</p>
            ) : (
              scanHistory.map((scan) => {
                const mapped = DISEASE_KEY_MAP[scan.diseaseKey] || DISEASE_KEY_MAP.unknown;
                return (
                  <div key={scan.id} className="rounded-xl border border-gray-100 bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/50 p-3 shadow-sm hover:bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-gray-900 dark:text-white drop-shadow-sm">{t(mapped.nameKey)}</p>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-200">{scan.confidence}%</span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">{new Date(scan.createdAt).toLocaleString()}</p>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
