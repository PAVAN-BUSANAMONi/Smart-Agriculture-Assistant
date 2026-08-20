import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'app-db.json');

const FEATURE_DEFAULTS = {
  weather: {
    key: 'weather',
    title: 'Weather Intelligence',
    description: 'Daily forecast analysis and irrigation guidance.',
    enabled: true,
  },
  cropRecommendation: {
    key: 'cropRecommendation',
    title: 'Crop Recommendation',
    description: 'Soil and season based crop planning.',
    enabled: true,
  },
  diseaseDetection: {
    key: 'diseaseDetection',
    title: 'Disease Detection',
    description: 'Plant disease scan and treatment support.',
    enabled: true,
  },
  marketPrices: {
    key: 'marketPrices',
    title: 'Market Prices',
    description: 'Market intelligence and profitability guidance.',
    enabled: true,
  },
  fertilizerCalculator: {
    key: 'fertilizerCalculator',
    title: 'Fertilizer Calculator',
    description: 'Nutrient requirement calculator.',
    enabled: true,
  },
  govtSchemes: {
    key: 'govtSchemes',
    title: 'Government Schemes',
    description: 'Subsidy and scheme discovery.',
    enabled: true,
  },
  farmerProfile: {
    key: 'farmerProfile',
    title: 'Farmer Profile',
    description: 'Farm profile and personalization settings.',
    enabled: true,
  },
  profitEstimator: {
    key: 'profitEstimator',
    title: 'Profit Estimator',
    description: 'Cost versus revenue planning.',
    enabled: true,
  },
  notificationsDebug: {
    key: 'notificationsDebug',
    title: 'Notifications Debug',
    description: 'Operations and notifications diagnostics.',
    enabled: true,
  },
};

function baseState() {
  return {
    users: [],
    sessions: [],
    profiles: {},
    alerts: [],
    otpChallenges: [],
    chatHistory: [],
    emailLog: [],
    auditLog: [],
    featureFlags: structuredClone(FEATURE_DEFAULTS),
  };
}

function ensureDbFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(baseState(), null, 2));
    }
  } catch (err) {
    console.warn('Could not initialize local data directory (serverless/read-only filesystem):', err.message);
  }
}

function normalizeState(raw) {
  const next = baseState();
  const input = raw && typeof raw === 'object' ? raw : {};

  next.users = Array.isArray(input.users) ? input.users : [];
  next.sessions = Array.isArray(input.sessions) ? input.sessions : [];
  next.profiles = input.profiles && typeof input.profiles === 'object' ? input.profiles : {};
  next.alerts = Array.isArray(input.alerts) ? input.alerts : [];
  next.otpChallenges = Array.isArray(input.otpChallenges) ? input.otpChallenges : [];
  next.chatHistory = Array.isArray(input.chatHistory) ? input.chatHistory : [];
  next.emailLog = Array.isArray(input.emailLog) ? input.emailLog : [];
  next.auditLog = Array.isArray(input.auditLog) ? input.auditLog : [];
  next.featureFlags = {
    ...structuredClone(FEATURE_DEFAULTS),
    ...(input.featureFlags && typeof input.featureFlags === 'object' ? input.featureFlags : {}),
  };

  return next;
}

function loadState() {
  ensureDbFile();

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return normalizeState(JSON.parse(raw));
    }
  } catch (err) {
    console.warn('Could not read DB_FILE:', err.message);
  }

  // Fallback to /tmp in serverless environments
  const tmpFile = path.join('/tmp', 'app-db.json');
  try {
    if (fs.existsSync(tmpFile)) {
      const raw = fs.readFileSync(tmpFile, 'utf8');
      return normalizeState(JSON.parse(raw));
    }
  } catch (err) {
    console.warn('Could not read /tmp DB file:', err.message);
  }

  const fallback = baseState();
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(fallback, null, 2));
  } catch {}
  return fallback;
}

let state = loadState();

function persistState() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
    return;
  } catch {
    // In serverless/read-only environment, persist to /tmp
    try {
      const tmpFile = path.join('/tmp', 'app-db.json');
      fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
    } catch {}
  }
}

export function readDb() {
  return structuredClone(state);
}

export function updateDb(mutator) {
  const result = mutator(state);
  persistState();
  return result;
}

export function getFeatureDefaults() {
  return structuredClone(FEATURE_DEFAULTS);
}
