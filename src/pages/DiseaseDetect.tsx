import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Bug,
  Upload,
  RefreshCw,
  History,
  X,
  Sparkles,
  ShieldCheck,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Activity,
  Layers,
  Camera
} from 'lucide-react';
import { api } from '../services/api';
import { createAlert, shouldTriggerAlert } from '../utils/alertEngine';
import { pushBrowserNotification } from '../utils/browserNotifications';

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
  verificationResults?: Array<{ type: string; diseaseKey: string; diseaseName: string; confidence: number }>;
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

type UploadSlot = 'front' | 'back' | 'full';

export function DiseaseDetect() {
  const { t, language } = useLanguage();
  const [images, setImages] = useState<Record<UploadSlot, string | null>>({ front: null, back: null, full: null });
  const [activeSlot, setActiveSlot] = useState<UploadSlot | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'treatment' | 'prevention' | 'safety' | 'references' | 'verification'
  >('overview');
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
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const currentMonth = monthNames[now.getMonth()];
      const monthNum = now.getMonth() + 1;
      let season = 'Unknown';
      if (monthNum >= 6 && monthNum <= 9) season = 'Monsoon (Kharif)';
      else if (monthNum >= 10 && monthNum <= 2) season = 'Winter (Rabi)';
      else season = 'Summer (Zaid)';

      let weatherCtx: { temperature?: string; humidity?: string; condition?: string } = {};
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }),
        );
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,weather_code`,
        );
        const wData = await wRes.json();
        if (wData.current) {
          weatherCtx = {
            temperature: `${wData.current.temperature_2m}°C`,
            humidity: `${wData.current.relative_humidity_2m}%`,
            condition:
              wData.current.weather_code <= 3
                ? 'Clear/Sunny'
                : wData.current.weather_code <= 48
                ? 'Cloudy/Foggy'
                : wData.current.weather_code <= 67
                ? 'Rainy'
                : 'Stormy',
          };
        }
      } catch {
        /* Location/weather not available, proceed without context */
      }

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
          `Confidence ${detection.confidence}%. ${
            backendResult.prediction.description || 'Inspect leaves and begin the suggested treatment plan.'
          }`,
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
        const fallbackSource = images.front || images.back || images.full || '';
        const fallbackResult = await localFallback(fallbackSource);
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
              <span>Bio-Vision Agronomy Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white/95 tracking-tight flex items-center gap-2.5">
              <Bug size={24} className="text-emerald-300" />
              <span>{t('disease_detection')}</span>
            </h1>
          </div>

          <div className="text-xs text-white/60">
            Multi-angle spectral plant disease diagnosis
          </div>
        </div>

        {/* ═══ Main Grid: Upload & Analysis (Left) vs History Aside (Right) ═══ */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Upload & Results Section (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Upload Perspectives Workspace Card */}
            <div className="aurora-glass-strong p-6 sm:p-7 rounded-[26px] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-white/95">
                    Upload Perspective Imagery
                  </h3>
                  <p className="text-xs text-white/65">
                    Capture front, back, or full plant view for enhanced diagnostic precision
                  </p>
                </div>

                {Object.values(images).filter(Boolean).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setImages({ front: null, back: null, full: null });
                      setResult(null);
                    }}
                    className="aurora-glass-button text-xs py-1.5 px-3 text-white/80 hover:text-white"
                  >
                    <RefreshCw size={13} />
                    <span>Clear all</span>
                  </button>
                )}
              </div>

              {/* 3 Upload Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {(['front', 'back', 'full'] as UploadSlot[]).map((slot) => (
                  <div
                    key={slot}
                    className="relative overflow-hidden rounded-[20px] aurora-glass-light h-44 flex flex-col items-center justify-center group transition-all duration-200 border border-white/18"
                  >
                    {images[slot] ? (
                      <>
                        <img
                          src={images[slot]!}
                          alt={`Uploaded ${slot}`}
                          className="h-full w-full object-cover rounded-[18px]"
                        />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => ({ ...prev, [slot]: null }))}
                          className="absolute right-2.5 top-2.5 rounded-full bg-black/60 hover:bg-black/80 text-rose-300 p-1.5 backdrop-blur-md transition-transform hover:scale-110 shadow-sm border border-white/20"
                          title="Remove image"
                        >
                          <X size={14} />
                        </button>
                        <div className="absolute bottom-2 left-2.5 bg-black/65 text-white/90 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/15">
                          {slot === 'front' ? 'Front Leaf' : slot === 'back' ? 'Back Leaf' : 'Full Plant'}
                        </div>
                      </>
                    ) : (
                      <div
                        onClick={() => {
                          setActiveSlot(slot);
                          setTimeout(() => fileInputRef.current?.click(), 0);
                        }}
                        className="flex h-full w-full cursor-pointer flex-col items-center justify-center p-4 text-center hover:bg-white/[0.06] transition-all group"
                      >
                        <div className="p-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-all text-emerald-300 border border-white/18 mb-2">
                          <Upload size={18} />
                        </div>
                        <span className="text-xs font-medium text-white/85">
                          {slot === 'front' ? 'Add Front Leaf' : slot === 'back' ? 'Add Back Leaf' : 'Add Full Plant'}
                        </span>
                        <span className="text-[10.5px] text-white/50 mt-0.5">Click or tap to capture</span>
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

              {/* Action Button */}
              {Object.values(images).filter(Boolean).length > 0 && !result && (
                <button
                  type="button"
                  onClick={() => void analyze()}
                  disabled={analyzing}
                  className="w-full aurora-glass-button-primary py-3.5 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                      <span>{t('analyzing')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-emerald-300" />
                      <span>{t('analyze_button')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Diagnosis Result Card */}
            {result && (
              <div className="aurora-glass-strong p-6 sm:p-8 rounded-[26px] space-y-6">
                {/* Result Top Heading & Metrics */}
                <div className="pb-4 border-b border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="aurora-label">Diagnostic Finding</span>
                      <h2 className="text-2xl sm:text-3xl font-semibold text-white/95 tracking-tight mt-0.5">
                        {result.nameKey === 'healthy' ||
                        result.nameKey.includes('unknown') ||
                        result.nameKey.includes('not_a_plant') ||
                        result.nameKey.includes('blurry') ||
                        result.nameKey.includes('multiple')
                          ? t(result.nameKey)
                          : result.nameKey.replace('_', ' ')}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                          result.nameKey === 'healthy' ? 'aurora-badge-success' : 'aurora-badge-danger'
                        }`}
                      >
                        {result.confidence}% {t('confidence')}
                      </span>
                    </div>
                  </div>

                  {result.scientificName &&
                    result.scientificName !== 'N/A' &&
                    result.scientificName !== 'Unknown' && (
                      <p className="text-xs sm:text-sm italic text-white/70">{result.scientificName}</p>
                    )}

                  {/* Result Tab Navigation */}
                  <div className="flex gap-2 overflow-x-auto pt-2 scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className={`aurora-glass-button text-xs py-1.5 px-3.5 whitespace-nowrap ${
                        activeTab === 'overview' ? 'aurora-glass-button-primary' : ''
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('treatment')}
                      className={`aurora-glass-button text-xs py-1.5 px-3.5 whitespace-nowrap ${
                        activeTab === 'treatment' ? 'aurora-glass-button-primary' : ''
                      }`}
                    >
                      Treatment Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('prevention')}
                      className={`aurora-glass-button text-xs py-1.5 px-3.5 whitespace-nowrap ${
                        activeTab === 'prevention' ? 'aurora-glass-button-primary' : ''
                      }`}
                    >
                      Prevention & Protection
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('safety')}
                      className={`aurora-glass-button text-xs py-1.5 px-3.5 whitespace-nowrap ${
                        activeTab === 'safety' ? 'aurora-glass-button-primary' : ''
                      }`}
                    >
                      Safety & Recovery
                    </button>
                    {result.referenceImages && result.referenceImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('references')}
                        className={`aurora-glass-button text-xs py-1.5 px-3.5 whitespace-nowrap ${
                          activeTab === 'references' ? 'aurora-glass-button-primary' : ''
                        }`}
                      >
                        Visual Reference
                      </button>
                    )}
                    {result.verificationResults && result.verificationResults.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('verification')}
                        className={`aurora-glass-button text-xs py-1.5 px-3.5 whitespace-nowrap ${
                          activeTab === 'verification' ? 'aurora-glass-button-primary' : ''
                        }`}
                      >
                        Verification
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab Views */}
                <div className="space-y-4">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="aurora-glass-medium p-4.5 rounded-2xl">
                        <h4 className="text-sm font-semibold text-white/95 mb-1.5">Description</h4>
                        <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                          {result.description || t(result.obsKey)}
                        </p>
                      </div>

                      {result.symptoms && result.symptoms.length > 0 && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl">
                          <h4 className="text-sm font-semibold text-white/95 mb-2">Common Symptoms</h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-white/80">
                            {result.symptoms.map((s, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.contextAdvice && result.contextAdvice.length > 0 && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl border-cyan-300/30">
                          <h4 className="text-sm font-semibold text-cyan-200 mb-2 flex items-center gap-1.5">
                            <Activity size={15} />
                            <span>Context-Aware Weather Guidance</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-white/80">
                            {result.contextAdvice.map((advice, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 mt-1.5 shrink-0" />
                                <span>{advice}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Treatment Tab */}
                  {activeTab === 'treatment' && (
                    <div className="space-y-4 animate-fade-in">
                      {result.organicTreatment && result.organicTreatment.length > 0 && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl border-emerald-300/30">
                          <h4 className="text-sm font-semibold text-emerald-200 mb-2 flex items-center gap-1.5">
                            <Leaf size={15} />
                            <span>Organic Treatment</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-white/85">
                            {result.organicTreatment.map((s, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.chemicalTreatment && result.chemicalTreatment.length > 0 && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl border-amber-300/30">
                          <h4 className="text-sm font-semibold text-amber-200 mb-2 flex items-center gap-1.5">
                            <AlertTriangle size={15} />
                            <span>Chemical Intervention</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-white/85">
                            {result.chemicalTreatment.map((s, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.applicationSteps && result.applicationSteps.length > 0 && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl">
                          <h4 className="text-sm font-semibold text-white/95 mb-2">Application Steps</h4>
                          <ol className="space-y-1.5 text-xs sm:text-sm text-white/80 list-decimal pl-4">
                            {result.applicationSteps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prevention Tab */}
                  {activeTab === 'prevention' && (
                    <div className="space-y-4 animate-fade-in">
                      {result.preventionMethods && result.preventionMethods.length > 0 && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl border-emerald-300/30">
                          <h4 className="text-sm font-semibold text-emerald-200 mb-2">Prevention Protocol</h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-white/85">
                            {result.preventionMethods.map((s, i) => (
                              <li key={i} className="flex items-center gap-2 font-medium">
                                <CheckCircle2 size={14} className="text-emerald-300 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {result.cropRotation && result.cropRotation !== 'N/A' && (
                          <div className="aurora-glass-light p-3.5 rounded-xl">
                            <h5 className="aurora-label mb-1">Crop Rotation</h5>
                            <p className="text-xs text-white/85 leading-relaxed">{result.cropRotation}</p>
                          </div>
                        )}
                        {result.waterManagement && result.waterManagement !== 'N/A' && (
                          <div className="aurora-glass-light p-3.5 rounded-xl">
                            <h5 className="aurora-label mb-1">Water Management</h5>
                            <p className="text-xs text-white/85 leading-relaxed">{result.waterManagement}</p>
                          </div>
                        )}
                        {result.soilHealth && result.soilHealth !== 'N/A' && (
                          <div className="aurora-glass-light p-3.5 rounded-xl">
                            <h5 className="aurora-label mb-1">Soil Health</h5>
                            <p className="text-xs text-white/85 leading-relaxed">{result.soilHealth}</p>
                          </div>
                        )}
                        {result.spacingTechniques && result.spacingTechniques !== 'N/A' && (
                          <div className="aurora-glass-light p-3.5 rounded-xl">
                            <h5 className="aurora-label mb-1">Spacing</h5>
                            <p className="text-xs text-white/85 leading-relaxed">{result.spacingTechniques}</p>
                          </div>
                        )}
                        {result.resistantVarieties && result.resistantVarieties !== 'N/A' && (
                          <div className="aurora-glass-light p-3.5 rounded-xl">
                            <h5 className="aurora-label mb-1">Resistant Varieties</h5>
                            <p className="text-xs text-white/85 leading-relaxed">{result.resistantVarieties}</p>
                          </div>
                        )}
                        {result.toolSanitation && result.toolSanitation !== 'N/A' && (
                          <div className="aurora-glass-light p-3.5 rounded-xl">
                            <h5 className="aurora-label mb-1">Tool Sanitation</h5>
                            <p className="text-xs text-white/85 leading-relaxed">{result.toolSanitation}</p>
                          </div>
                        )}
                        {result.seasonalPrecautions && result.seasonalPrecautions !== 'N/A' && (
                          <div className="aurora-glass-light p-3.5 rounded-xl sm:col-span-2">
                            <h5 className="aurora-label mb-1">Seasonal Precautions</h5>
                            <p className="text-xs text-white/85 leading-relaxed">{result.seasonalPrecautions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Safety Tab */}
                  {activeTab === 'safety' && (
                    <div className="space-y-4 animate-fade-in">
                      {result.safetyPrecautions && result.safetyPrecautions.length > 0 && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl border-cyan-300/30">
                          <h4 className="text-sm font-semibold text-cyan-200 mb-2 flex items-center gap-1.5">
                            <ShieldCheck size={15} />
                            <span>Safety Precautions</span>
                          </h4>
                          <ul className="space-y-1.5 text-xs sm:text-sm text-white/80">
                            {result.safetyPrecautions.map((s, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 mt-1.5 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.recoveryTime && (
                        <div className="aurora-glass-medium p-4.5 rounded-2xl">
                          <h4 className="text-sm font-semibold text-white/95 mb-1">Expected Recovery Timeline</h4>
                          <p className="text-xs sm:text-sm text-emerald-200 font-medium">{result.recoveryTime}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* References Tab */}
                  {activeTab === 'references' && result.referenceImages && result.referenceImages.length > 0 && (
                    <div className="space-y-4 animate-fade-in">
                      <p className="text-xs text-white/70 aurora-glass-light p-3 rounded-xl">
                        Compare your plant with verified benchmark images from agricultural databases.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {result.referenceImages.map((img, i) => (
                          <div key={i} className="aurora-glass-light rounded-xl overflow-hidden p-2">
                            <img
                              src={img.url}
                              alt={img.caption}
                              className="w-full h-36 object-cover rounded-lg"
                              loading="lazy"
                            />
                            <div className="p-2 space-y-1">
                              <span className="aurora-badge-info text-[10px] px-2 py-0.5 rounded-full uppercase">
                                {img.stage}
                              </span>
                              <p className="text-xs text-white/85 leading-tight">{img.caption}</p>
                              <p className="text-[10px] text-white/50">Source: {img.source}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verification Tab */}
                  {activeTab === 'verification' && result.verificationResults && (
                    <div className="space-y-2.5 animate-fade-in">
                      {result.verificationResults.map((v, i) => {
                        const mapped = DISEASE_KEY_MAP[v.diseaseKey] || DISEASE_KEY_MAP.unknown;
                        return (
                          <div
                            key={i}
                            className="flex justify-between items-center aurora-glass-light p-3 rounded-xl text-xs"
                          >
                            <span className="capitalize font-semibold text-white/90">{v.type} Perspective</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white/70">{v.diseaseName || t(mapped.nameKey)}</span>
                              <span className="aurora-badge-success text-[10.5px] px-2 py-0.5 rounded-full font-bold">
                                {v.confidence}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Source info */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                  <span>
                    {language === 'te' ? 'డేటా మూలం' : 'Inference source'}: {result.source || 'bio-ai'}
                  </span>
                  <span>Agricultural Diagnosis Model v2</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scans Aside (4 cols) */}
          <div className="lg:col-span-4">
            <aside className="aurora-glass-medium p-6 rounded-[26px] space-y-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-white/95 pb-2 border-b border-white/10">
                <History size={17} className="text-emerald-300" />
                <span>{language === 'te' ? 'తాజా స్కాన్‌లు' : 'Recent Scans'}</span>
              </h3>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {scanHistory.length === 0 ? (
                  <p className="text-xs text-white/55 py-6 text-center">
                    {language === 'te' ? 'చరిత్ర అందుబాటులో లేదు.' : 'No scan history yet.'}
                  </p>
                ) : (
                  scanHistory.map((scan) => {
                    const mapped = DISEASE_KEY_MAP[scan.diseaseKey] || DISEASE_KEY_MAP.unknown;
                    return (
                      <div
                        key={scan.id}
                        className="aurora-glass-light p-3 rounded-xl space-y-1 hover:bg-white/15 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-semibold text-white/90">{t(mapped.nameKey)}</p>
                          <span className="text-[10px] font-bold aurora-badge-info px-1.5 py-0.5 rounded-md">
                            {scan.confidence}%
                          </span>
                        </div>
                        <p className="text-[10.5px] text-white/50">
                          {new Date(scan.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

