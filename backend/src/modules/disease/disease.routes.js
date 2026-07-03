import { Router } from 'express';
import { z } from 'zod';
import { addDiseaseScan, listDiseaseScansByUser } from './disease.store.js';
import { inferDisease } from './disease.ai.js';
import { validateRequest } from '../../lib/validate.js';

const router = Router();

const analyzeBodySchema = z.object({
  userId: z.string().trim().min(1).max(64).optional(),
  images: z.array(z.object({
    type: z.enum(['front', 'back', 'full']),
    data: z.string().trim().min(30).max(6_000_000)
  })).min(1).max(3),
  crop: z.string().trim().min(1).max(80).optional(),
  context: z.object({
    weather: z.object({
      temperature: z.string().optional(),
      humidity: z.string().optional(),
      condition: z.string().optional(),
    }).optional(),
    season: z.string().optional(),
    growthStage: z.string().optional(),
    region: z.string().optional(),
    month: z.string().optional(),
  }).optional(),
}).strict();

const saveScanBodySchema = z.object({
  userId: z.string().trim().min(1).max(64).optional(),
  crop: z.string().trim().min(1).max(80).optional(),
  diseaseKey: z.string().trim().min(1).max(80),
  confidence: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high']),
  imageUrl: z.string().trim().max(6_000_000).nullable().optional(),
  notes: z.string().trim().max(1500).optional(),
}).strict();

const historyQuerySchema = z.object({
  userId: z.string().trim().min(1).max(64).optional(),
});

router.post('/analyze', validateRequest({ body: analyzeBodySchema }), async (req, res) => {
  const payload = req.body || {};
  const userId = String(req.headers['x-user-id'] || payload.userId || 'anonymous');
  const images = payload.images || [];
  const crop = String(payload.crop || 'unknown');
  const context = payload.context || {};

  if (!images || images.length === 0) {
    return res.status(400).json({ message: 'images array is required' });
  }

  // Analyze each image concurrently
  const results = await Promise.all(
    images.map(async (img) => {
      const prediction = await inferDisease({ imageData: img.data, crop, context });
      return { type: img.type, ...prediction };
    })
  );

  // Check if any rejected the image as not a plant immediately
  const firstError = results.find(r => r.diseaseKey === 'not_a_plant');
  if (firstError) {
    return res.status(400).json({ status: 'error', reason: 'not_a_plant' });
  }

  // Filter out uncertain or poor quality predictions for the consensus
  const validPredictions = results.filter(r => !['not_a_plant', 'blurry', 'low_light', 'leaf_not_visible', 'uncertain'].includes(r.diseaseKey));

  if (validPredictions.length === 0) {
    // If all failed validation, just return the first one
    const errPred = results[0];
    const scan = addDiseaseScan({
      userId,
      crop,
      diseaseKey: errPred.diseaseKey,
      confidence: errPred.confidence,
      level: 'low',
      imageUrl: images[0].data,
      notes: `Failed quality checks across ${images.length} images.`,
    });
    return res.json({ prediction: errPred, verificationResults: results, scan });
  }

  // Consensus Algorithm
  const diseaseCounts = {};
  for (const r of validPredictions) {
    diseaseCounts[r.diseaseKey] = (diseaseCounts[r.diseaseKey] || 0) + 1;
  }

  let majorityDisease = null;
  let maxCount = 0;
  for (const [key, count] of Object.entries(diseaseCounts)) {
    if (count > maxCount) {
      maxCount = count;
      majorityDisease = key;
    }
  }

  // Priority: Majority -> Front Leaf -> First valid
  const primaryPrediction = validPredictions.find(r => r.type === 'front') || validPredictions[0];
  const finalDiseaseKey = majorityDisease || primaryPrediction.diseaseKey;
  const finalPrediction = results.find(r => r.diseaseKey === finalDiseaseKey) || primaryPrediction;

  // Boost confidence if multiple agree
  let combinedConfidence = finalPrediction.confidence;
  if (maxCount > 1) {
    combinedConfidence = Math.min(99, combinedConfidence + (maxCount - 1) * 10);
  }

  const level = finalDiseaseKey === 'healthy' ? 'low' : combinedConfidence >= 82 ? 'high' : 'medium';

  const scan = addDiseaseScan({
    userId,
    crop,
    diseaseKey: finalDiseaseKey,
    confidence: combinedConfidence,
    level,
    imageUrl: images[0].data,
    notes: `Verified by ${images.length} images. Consensus: ${finalDiseaseKey}.`,
  });

  return res.json({
    prediction: {
      diseaseKey: finalDiseaseKey,
      diseaseName: finalPrediction.diseaseName,
      scientificName: finalPrediction.scientificName,
      description: finalPrediction.description,
      confidence: combinedConfidence,
      symptoms: finalPrediction.symptoms,
      organicTreatment: finalPrediction.organicTreatment,
      chemicalTreatment: finalPrediction.chemicalTreatment,
      applicationSteps: finalPrediction.applicationSteps,
      safetyPrecautions: finalPrediction.safetyPrecautions,
      recoveryTime: finalPrediction.recoveryTime,
      preventionMethods: finalPrediction.preventionMethods,
      cropRotation: finalPrediction.cropRotation,
      waterManagement: finalPrediction.waterManagement,
      soilHealth: finalPrediction.soilHealth,
      spacingTechniques: finalPrediction.spacingTechniques,
      resistantVarieties: finalPrediction.resistantVarieties,
      toolSanitation: finalPrediction.toolSanitation,
      seasonalPrecautions: finalPrediction.seasonalPrecautions,
      referenceImages: finalPrediction.referenceImages,
      contextAdvice: finalPrediction.contextAdvice,
      level,
      source: 'multi-image-consensus',
    },
    verificationResults: results.map(r => ({
      type: r.type,
      diseaseKey: r.diseaseKey,
      diseaseName: r.diseaseName,
      confidence: r.confidence,
    })),
    scan,
  });
});

router.post('/scans', validateRequest({ body: saveScanBodySchema }), (req, res) => {
  const payload = req.body || {};
  const userId = String(req.headers['x-user-id'] || payload.userId || 'anonymous');

  const scan = addDiseaseScan({
    userId,
    crop: String(payload.crop || 'unknown'),
    diseaseKey: String(payload.diseaseKey || 'unknown'),
    confidence: Number(payload.confidence || 0),
    level: String(payload.level || 'low'),
    imageUrl: payload.imageUrl || null,
    notes: String(payload.notes || ''),
  });

  res.status(201).json({ message: 'Disease scan logged', scan });
});

router.get('/history', validateRequest({ query: historyQuerySchema }), (req, res) => {
  const userId = String(req.headers['x-user-id'] || req.query.userId || 'anonymous');
  const scans = listDiseaseScansByUser(userId);
  res.json({ scans });
});

export const diseaseRouter = router;
