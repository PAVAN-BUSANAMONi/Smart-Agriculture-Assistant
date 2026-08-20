import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveDataFile() {
  const candidates = [
    path.resolve(process.cwd(), 'backend/data/app-db.json'),
    path.resolve(process.cwd(), 'data/app-db.json'),
    path.resolve(__dirname, '../../data/app-db.json'),
    path.resolve(__dirname, '../backend/data/app-db.json'),
    path.resolve(__dirname, '../data/app-db.json'),
    path.join(process.cwd(), 'app-db.json'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {}
  }
  return path.join('/tmp', 'app-db.json');
}

const DB_FILE = resolveDataFile();

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
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(baseState(), null, 2));
    }
  } catch {}
}

function normalizeState(raw) {
  const next = baseState();
  const payload = raw && raw.default ? raw.default : raw;
  const input = payload && typeof payload === 'object' ? payload : {};

  next.users = Array.isArray(input.users) ? structuredClone(input.users) : [];
  next.sessions = Array.isArray(input.sessions) ? structuredClone(input.sessions) : [];
  next.profiles = input.profiles && typeof input.profiles === 'object' ? structuredClone(input.profiles) : {};
  next.alerts = Array.isArray(input.alerts) ? structuredClone(input.alerts) : [];
  next.otpChallenges = Array.isArray(input.otpChallenges) ? structuredClone(input.otpChallenges) : [];
  next.chatHistory = Array.isArray(input.chatHistory) ? structuredClone(input.chatHistory) : [];
  next.emailLog = Array.isArray(input.emailLog) ? structuredClone(input.emailLog) : [];
  next.auditLog = Array.isArray(input.auditLog) ? structuredClone(input.auditLog) : [];
  next.featureFlags = {
    ...structuredClone(FEATURE_DEFAULTS),
    ...(input.featureFlags && typeof input.featureFlags === 'object' ? input.featureFlags : {}),
  };

  return next;
}

import seedDb from '../../data/app-db.json' with { type: 'json' };

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

  const fallback = normalizeState(seedDb || baseState());
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
