import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Bug, Upload, RefreshCw, History } from 'lucide-react';
import { api } from '../services/api';
import { createAlert, shouldTriggerAlert } from '../utils/alertEngine';
import { pushBrowserNotification } from '../utils/browserNotifications';

type DetectionResult = {
  nameKey: string;
  obsKey: string;
  cureKey: string;
  confidence: number;
  cause?: string;
  treatment?: string[];
  prevention?: string[];
  source?: string;
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
};

export function DiseaseDetect() {
  const { t, language } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => setImage(event.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
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
    if (!image) return;
    setAnalyzing(true);

    try {
      const preprocessedImage = await preprocessImage(image);
      const crop = localStorage.getItem('primaryCrop') || 'unknown';

      const backendResult = await api.analyzeDisease({ imageData: preprocessedImage, crop });
      const mappedKeys = DISEASE_KEY_MAP[backendResult.prediction.diseaseKey] || DISEASE_KEY_MAP.unknown;
      const detection: DetectionResult = {
        ...mappedKeys,
        confidence: backendResult.prediction.confidence,
        cause: backendResult.prediction.cause,
        treatment: backendResult.prediction.treatment,
        prevention: backendResult.prediction.prevention,
        source: backendResult.prediction.source,
      };
      setResult(detection);

      const diseaseText = t(detection.nameKey);
      const level = backendResult.prediction.level;
      const signature = `disease-${backendResult.prediction.diseaseKey}-${Math.round(detection.confidence / 5)}`;

      if (shouldTriggerAlert(signature, level)) {
        notify(
          detection.nameKey === 'healthy' ? 'Plant health looks stable' : `${diseaseText} review needed`,
          `Confidence ${detection.confidence}%. ${backendResult.prediction.cause || 'Inspect leaves and begin the suggested treatment plan.'}`,
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
    } catch {
      try {
        const fallbackResult = await localFallback(image);
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
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300/60 bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/30 transition-all hover:bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]/60 hover:border-gray-400 group relative z-10"
            >
              <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Upload size={40} className="text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-semibold text-gray-700 dark:text-gray-300 font-display text-lg">{t('upload_image')}</span>
              <p className="text-sm text-gray-400 mt-1">Tap to browse or take a photo</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
              />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 shadow-sm z-10 group">
              <img src={image} alt="Uploaded leaf" className="h-72 w-full object-cover transition-transform group-hover:scale-[1.02]" />
              <button
                onClick={() => {
                  setImage(null);
                  setResult(null);
                }}
                className="absolute right-4 top-4 rounded-full bg-white/90 backdrop-blur p-2.5 text-rose-600 shadow-md hover:bg-white transition-transform hover:scale-110"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          )}

          {image && !result && (
            <button
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
            </button>
          )}

          {result && (
            <div className="animate-fade-in mt-6 glass-card bg-gradient-to-br from-rose-50/80 to-red-50/80 border-rose-200/50 p-8 relative z-10 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl font-extrabold font-display text-rose-900">{t(result.nameKey)}</h2>
                <span className="rounded-xl bg-white/60 backdrop-blur px-3 py-1.5 text-sm font-bold text-rose-800 shadow-sm border border-rose-100">
                  {result.confidence}% {t('confidence')}
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="mb-1.5 font-bold font-display text-gray-900 dark:text-white drop-shadow-sm text-lg">{t('observation')}:</h4>
                  <p className="text-gray-800 dark:text-gray-200 font-medium">{t(result.obsKey)}</p>
                </div>

                <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/60 p-5 shadow-sm">
                  <h4 className="mb-2 font-bold font-display text-emerald-800 text-lg">{t('recommended_cure')}:</h4>
                  <ul className="space-y-2 text-emerald-900 font-medium">
                    <li className="flex gap-3">
                      <div className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                      <span>{t(result.cureKey)}</span>
                    </li>
                    {(result.treatment || []).slice(0, 2).map((tip, idx) => (
                      <li key={`${tip}-${idx}`} className="flex gap-3">
                        <div className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {language === 'te' ? 'డేటా మూలం' : 'Inference source'}: {result.source || 'unknown'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDetails((value) => !value)}
                    className="glass-button-secondary text-xs px-3 py-1.5"
                  >
                    {showDetails ? (language === 'te' ? 'వివరాలు దాచు' : 'Hide details') : (language === 'te' ? 'వివరాలు చూపు' : 'Show details')}
                  </button>
                </div>

                {showDetails && (
                  <div className="rounded-xl border border-gray-200/50 bg-white/50 backdrop-blur-sm p-5 text-sm text-gray-800 dark:text-gray-200 shadow-sm">
                    <p className="mb-3"><span className="font-semibold text-gray-900 dark:text-white drop-shadow-sm">Cause:</span> {result.cause || '-'}</p>
                    <p className="mb-2 font-semibold text-gray-900 dark:text-white drop-shadow-sm">Prevention:</p>
                    <ul className="space-y-2 font-medium">
                      {(result.prevention || []).map((tip) => (
                        <li key={tip} className="flex gap-2">
                          <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0"></div>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
