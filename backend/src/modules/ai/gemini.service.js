import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const SECONDARY_MODEL = process.env.GEMINI_SECONDARY_MODEL || 'gemini-2.0-flash-lite';
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  DEFAULT_MODEL,
  SECONDARY_MODEL,
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];
const MAX_RETRIES_PER_MODEL = Number(process.env.GEMINI_MAX_RETRIES || 2);

let client = null;

function getClient() {
  if (client) {
    return client;
  }

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }

  client = new GoogleGenerativeAI(apiKey);
  return client;
}

function compact(value, fallback = 'Not available') {
  const text = String(value || '').trim();
  return text || fallback;
}

function buildPrompt({ query, user, weatherSummary, crop }) {
  const weatherSection = weatherSummary
    ? `Weather:
- City: ${compact(weatherSummary.city)}
- Temperature: ${compact(weatherSummary.tempC)} C
- Feels like: ${compact(weatherSummary.feelsLikeC)} C
- Humidity: ${compact(weatherSummary.humidity)}%
- Wind: ${compact(weatherSummary.windKmph)} km/h
- Rain chance (24h): ${compact(weatherSummary.rainChance24h)}%
- Rain expected (24h): ${compact(weatherSummary.rainMm24h)} mm
- Condition: ${compact(weatherSummary.condition)}
`
    : 'Weather: Not available\n';

  return `
You are a professional agricultural expert and agronomist. 

Core Instructions:
1. DO NOT use long greetings, pleasantries, or unnecessary introductions. Skip the warm welcomes.
2. Give direct, concise, and practical answers.
3. Keep your response under 100 words unless the user explicitly requests detailed explanations (e.g. "Why?", "How?", "Explain in detail").
4. Automatically switch to detailed explanations ONLY when explicitly asked.
5. Use bullet points whenever appropriate for readability.
6. Prioritize response speed by using minimal tokens.
7. Maintain a friendly but professional tone.

User profile:
- Role: ${compact(user.role)}
- Name: ${compact(user.name)}
- Primary crop: ${compact(crop)}

${weatherSection}

User question:
${query}
`.trim();
}

function fallbackAnswer({ query, weatherSummary, crop, user }) {
  const risk = weatherSummary?.rainChance24h >= 70
    ? 'High rain risk in the next 24 hours. We need to avoid over-irrigation and make sure the field drainage is completely clear.'
    : weatherSummary?.tempC >= 38
      ? 'Heat stress risk is elevated. Let us protect root moisture and avoid spraying during noon.'
      : 'No severe immediate weather threats detected in our forecast.';

  const userName = compact(user?.name, 'Farmer');
  const cropName = compact(crop, 'your crops');

  return `
Based on our data for ${cropName}:

• Act quickly to prioritize soil health and preventative care.
• Verify soil moisture manually before running any irrigation today.
• Inspect ${cropName} for early signs of pests this evening.
• Keep a close eye on local market prices this week.

Risk Warning:
${risk}
`.trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractStatusCode(error) {
  const direct = Number(error?.status || error?.code);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const match = String(error?.message || '').match(/\b(4\d\d|5\d\d)\b/);
  return match ? Number(match[1]) : null;
}

function isQuotaError(error) {
  const detail = String(error?.message || '').toLowerCase();
  return (
    detail.includes('quota')
    || detail.includes('resource exhausted')
    || detail.includes('rate limit')
    || extractStatusCode(error) === 429
  );
}

function isTransientError(error) {
  const statusCode = extractStatusCode(error);
  if (statusCode && statusCode >= 500) {
    return true;
  }
  const detail = String(error?.message || '').toLowerCase();
  return detail.includes('timeout') || detail.includes('temporar') || detail.includes('unavailable');
}

async function runModelWithRetry(client, modelName, prompt) {
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const answer = result?.response?.text()?.trim();
      if (!answer) {
        throw new Error('Gemini returned an empty response.');
      }
      return { answer, quotaExceeded: false };
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) {
        return { answer: null, quotaExceeded: true, error };
      }
      if (!isTransientError(error) || attempt === MAX_RETRIES_PER_MODEL) {
        break;
      }
      await sleep(350 * (attempt + 1));
    }
  }
  throw lastError || new Error('Gemini request failed.');
}

export async function generateGeminiFarmingAnswer({ query, user, weatherSummary, crop }) {
  const activeClient = getClient();
  if (!activeClient) {
    return {
      answer: fallbackAnswer({ query, weatherSummary, crop, user }),
      model: 'local-fallback',
      provider: 'rules',
    };
  }

  try {
    let lastError = null;
    let quotaExceeded = false;
    const prompt = buildPrompt({ query, user, weatherSummary, crop });
    for (const modelName of [...new Set(FALLBACK_MODELS)]) {
      try {
        const result = await runModelWithRetry(activeClient, modelName, prompt);
        if (result.answer) {
          return {
            answer: result.answer,
            model: modelName,
            provider: 'gemini',
          };
        }
        quotaExceeded = quotaExceeded || Boolean(result.quotaExceeded);
        if (result.error) {
          lastError = result.error;
        }
        continue;
      } catch (error) {
        lastError = error;
        const detail = String(error?.message || '').toLowerCase();
        if (!detail.includes('not found') && !detail.includes('unsupported')) {
          throw error;
        }
      }
    }
    throw lastError || new Error(quotaExceeded ? 'Gemini quota exceeded.' : 'No compatible Gemini model was found.');
  } catch (error) {
    const quotaExceeded = isQuotaError(error);
    return {
      answer: fallbackAnswer({ query, weatherSummary, crop, user }),
      model: 'local-fallback',
      provider: 'rules',
      quotaExceeded,
      detail: error?.message || null,
    };
  }
}

export async function analyzeDiseaseImage(imageData, crop) {
  const activeClient = getClient();
  if (!activeClient) {
    throw new Error('Gemini API is not configured.');
  }

  const prompt = `
You are an expert agricultural botanist and plant pathologist.
Analyze the following image. First, determine if it is actually a picture of a plant or crop.
If the image is NOT a plant (e.g., a screenshot, a person, a random object), you MUST respond strictly in JSON format matching this schema exactly:
{
  "diseaseKey": "not_a_plant",
  "confidence": 100,
  "cause": "The uploaded image does not appear to be a plant.",
  "treatment": ["Please upload a clear picture of a plant leaf."],
  "prevention": []
}

If it IS a plant, identify any visible diseases or nutritional deficiencies for the crop: ${crop || 'unknown'}.
Identify any visible diseases or nutritional deficiencies.
Respond strictly in JSON format matching this schema exactly:
{
  "diseaseKey": "leaf_blight" | "powdery_mildew" | "rust" | "healthy" | "unknown" | "not_a_plant",
  "confidence": <number between 0 and 100>,
  "cause": "<Short description of the cause>",
  "treatment": ["<treatment step 1>", "<treatment step 2>"],
  "prevention": ["<prevention step 1>", "<prevention step 2>"]
}
If the disease doesn't perfectly match the allowed keys, pick the closest one or "unknown".
`;

  const base64Data = imageData.split(',')[1] || imageData;
  const mimeMatch = imageData.match(/^data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const content = [
    prompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    }
  ];

  let lastError = null;
  for (const modelId of FALLBACK_MODELS) {
    try {
      const result = await runModelWithRetry(activeClient, modelId, content);
      if (result.quotaExceeded) {
        lastError = result.error || new Error('Quota exceeded');
        continue;
      }
      const text = result.answer;
      const jsonStr = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return { ...parsed, source: `gemini-vision (${modelId})` };
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) {
        continue;
      }
      continue;
    }
  }
  throw lastError || new Error('All Gemini Vision models failed.');
}

export async function generateFertilizerPlan({ land, crop, soilType, farmingType }) {
  const activeClient = getClient();
  if (!activeClient) {
    throw new Error('Gemini API is not configured.');
  }

  const prompt = `
You are an expert agronomist providing a highly modern, data-driven fertilizer schedule.
Crop: ${crop}
Land Size: ${land} Acres
Soil Type: ${soilType}
Farming Style: ${farmingType}

Create a highly detailed, phase-by-phase fertilizer application plan.
Provide the response strictly in JSON matching this schema:
{
  "sustainabilityScore": <number 0-100>,
  "phases": [
    {
      "phaseName": "<e.g., Basal Dose / Pre-sowing>",
      "timing": "<e.g., Day 0>",
      "fertilizers": [
        { "name": "<e.g., Neem Cake / Urea>", "amount": "<amount per acre or total>", "instructions": "<brief instruction>" }
      ]
    }
  ],
  "soilHealthTips": ["<tip 1>", "<tip 2>"]
}
`;

  let lastError = null;
  for (const modelId of FALLBACK_MODELS) {
    try {
      const result = await runModelWithRetry(activeClient, modelId, [{ text: prompt }]);
      if (result.quotaExceeded) {
        lastError = result.error || new Error('Quota exceeded');
        continue;
      }
      const text = result.answer;
      const jsonStr = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return { ...parsed, sourceModel: modelId };
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) {
        continue;
      }
      continue;
    }
  }
  throw lastError || new Error('All Gemini models failed for fertilizer plan.');
}
