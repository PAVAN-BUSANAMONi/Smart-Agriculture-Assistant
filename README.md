# 🌾 Smart Agriculture Assistant

A full-stack, AI-powered web application that empowers farmers with data-driven insights for crop planning, disease detection, market intelligence, weather-aware advisory, and government scheme discovery — available in **English** and **Telugu**.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the Application](#running-the-application)
- [Frontend Pages & Functions](#frontend-pages--functions)
- [Backend API Reference](#backend-api-reference)
- [Authentication & Roles](#authentication--roles)
- [Real-time Features](#real-time-features)
- [Multilingual Support](#multilingual-support)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

Smart Agriculture Assistant is designed to bridge the technology gap for farmers by delivering actionable intelligence directly on their devices. The platform combines:

- **Gemini AI** for natural-language farming advice
- **Live weather data** (Open-Meteo / OpenWeatherMap)
- **AI-powered plant disease detection** from leaf images
- **Market price intelligence** with trend charts
- **Government scheme aggregation** with direct portal links
- **Real-time alerts** via WebSocket (Socket.IO)
- **OTP-based email verification** for secure, passwordless registration

---

## Features

| Feature | Description |
|---|---|
| 🤖 AI Farming Assistant | Weather-aware Gemini AI chat with history, filters, and CSV/JSON export |
| 🌱 Crop Recommendation | Soil, season, temperature, and rainfall inputs → suitability scores + profit estimates |
| 🦠 Disease Detection | Upload a leaf photo → AI + local pixel-analysis fallback identifies disease + treatment |
| 🌦️ Weather Forecast | 7-day forecast, rain alerts, irrigation advisory, frost/heat warnings |
| 📈 Market Prices | Live commodity prices with historical trend charts and predicted prices |
| 💰 Profit Estimator | Cost, yield, and price-based net profit and ROI calculator |
| 🧪 Fertilizer Calculator | Land-size and crop-specific NPK (Urea, DAP, MOP) quantity calculator |
| 🏛️ Government Schemes | 12+ national and state schemes (PM-KISAN, Rythu Bandhu, PMFBY, etc.) with portal links |
| 🔔 Notifications & Alerts | Real-time in-app alerts triggered by crop, disease, weather, and market events |
| 👤 Farmer Profile | Location, land size, and crop preferences for personalised insights |
| 🛡️ Admin Panel | User management, role control, feature flag toggles, and live alert management |
| 🌐 Multilingual | Full English and Telugu (తెలుగు) interface |
| 🎙️ Voice Query | Hands-free voice input on the dashboard for quick navigation |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool and dev server |
| Tailwind CSS | 4 | Styling |
| React Router | 7 | Client-side routing |
| Socket.IO Client | 4 | Real-time notifications |
| Lucide React | Latest | Icon library |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js (ESM) | 18+ | Runtime |
| Express | 5 | HTTP server |
| MongoDB + Mongoose | 8 | Primary database |
| MySQL2 | 3 | Optional relational data |
| Socket.IO | 4 | WebSocket / real-time events |
| JWT | 9 | Authentication tokens |
| Google Generative AI | 0.24 | Gemini AI integration |
| Nodemailer | 7 | OTP email delivery |
| Helmet + Rate Limiter | Latest | Security |
| Pino | 10 | Structured logging |
| Zod | 4 | Input validation |
| Vitest | 4 | Testing |

---

## Project Structure

```
Smart-Agriculture-Assistant/
├── src/                        # Frontend (React + TypeScript)
│   ├── App.tsx                 # Root router and provider setup
│   ├── main.tsx                # React entry point
│   ├── index.css               # Global styles
│   ├── pages/                  # One file per route/page
│   │   ├── Dashboard.tsx       # Feature hub, weather snapshot, voice query
│   │   ├── AIAssistant.tsx     # Gemini AI chat with filters and export
│   │   ├── CropRecommend.tsx   # Soil/season/weather crop advisory
│   │   ├── DiseaseDetect.tsx   # Image upload → AI disease analysis
│   │   ├── Weather.tsx         # 7-day forecast + alerts
│   │   ├── MarketPrices.tsx    # Commodity prices + trend charts
│   │   ├── ProfitEstimator.tsx # Cost/yield/price profit calculator
│   │   ├── FertilizerCalc.tsx  # NPK fertilizer quantity calculator
│   │   ├── GovtSchemes.tsx     # Government schemes directory
│   │   ├── Profile.tsx         # Farmer profile settings
│   │   ├── AdminPanel.tsx      # Admin user/role/feature management
│   │   ├── Login.tsx           # Auth (login + register + OTP)
│   │   ├── FarmingTips.tsx     # Seasonal farming best practices
│   │   ├── NotificationsDebug.tsx # Admin: notification testing
│   │   └── OwnerAccess.tsx     # Owner-only system access
│   ├── components/
│   │   ├── Header.tsx          # Navigation bar with notification bell
│   │   ├── ProtectedRoute.tsx  # Route guard (auth + role + feature flags)
│   │   ├── VoiceQueryInput.tsx # Browser speech recognition input
│   │   ├── GlossyBackdrop.tsx  # Decorative background component
│   │   └── NotificationCenter.tsx # Real-time notification drawer
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Auth state, JWT, feature flags
│   │   ├── LanguageContext.tsx # i18n (English / Telugu)
│   │   ├── AppSettingsContext.tsx # Simple mode toggle
│   │   └── NotificationContext.tsx # Unread count and alert stream
│   ├── services/
│   │   └── api.ts              # All HTTP client calls to backend API
│   └── utils/
│       ├── alertEngine.ts      # Local alert deduplication and storage
│       └── browserNotifications.ts # Web Push / Notification API helper
│
├── backend/                    # Backend (Node.js + Express)
│   ├── src/
│   │   ├── server.js           # HTTP server, DB bootstrap, scheduler start
│   │   ├── app.js              # Express app, middleware, route mounts
│   │   ├── db/
│   │   │   ├── mongo.js        # MongoDB connection
│   │   │   └── state.js        # DB health state
│   │   ├── lib/
│   │   │   ├── errors.js       # AppError class and helpers
│   │   │   └── metrics.js      # Request metrics snapshot
│   │   ├── realtime/
│   │   │   └── socket.js       # Socket.IO server initialisation
│   │   └── modules/            # Feature modules (route + logic)
│   │       ├── auth/           # JWT login/register/refresh
│   │       ├── otp/            # OTP generation and email verification
│   │       ├── profile/        # Farmer profile CRUD
│   │       ├── weather/        # Weather data + advisory engine
│   │       ├── crops/          # Crop recommendation engine
│   │       ├── disease/        # AI disease analysis + fallback
│   │       ├── market/         # Market price intelligence
│   │       ├── schemes/        # Government schemes listing
│   │       ├── alerts/         # Alert ingestion + scheduler
│   │       ├── admin/          # User, role, feature flag management
│   │       ├── ai/             # Gemini AI assistant endpoint
│   │       ├── assistant/      # AI assistant history
│   │       ├── digitalTwin/    # Digital twin farm model
│   │       ├── lifecycle/      # Crop lifecycle tracking
│   │       ├── risk/           # Risk scoring
│   │       ├── marketplace/    # Peer marketplace
│   │       ├── community/      # Community forum
│   │       ├── iot/            # IoT sensor data ingestion
│   │       ├── transparency/   # Data transparency / audit
│   │       ├── data/           # Generic data export
│   │       └── owner/          # Owner-only system control
│   ├── data/                   # Seed / static data files
│   ├── tests/                  # Vitest integration tests
│   └── .env.example            # Environment variable template
│
├── docs/                       # Architecture blueprints
├── public/                     # Static assets
├── index.html                  # Vite HTML entry point
├── vite.config.ts              # Vite + Tailwind + proxy config
├── vercel.json                 # Vercel deployment config
└── package.json                # Root workspace (frontend scripts)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **MongoDB** 6+ (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A **Gemini API key** ([Google AI Studio](https://aistudio.google.com/))
- An **OpenWeatherMap API key** (optional, Open-Meteo is used as a free fallback)
- SMTP credentials for OTP emails (Gmail, Mailgun, etc.)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/BUSANAMONI-PAVAN/Smart-Agriculture-Assistant.git
cd Smart-Agriculture-Assistant

# 2. Install root (frontend) dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..
```

### Environment Configuration

Copy the backend environment template and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and configure each variable:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Backend port (default: `4000`) |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Strong random string for JWT signing |
| `OTP_TOKEN_SECRET` | **Yes** | Strong random string for OTP tokens |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-1.5-flash`) |
| `OPENWEATHER_API_KEY` | No | OpenWeatherMap key (Open-Meteo is free fallback) |
| `WEATHER_PROVIDER` | No | `auto`, `openweather`, or `openmeteo` |
| `EMAIL_FROM` | **Yes** | Sender address for OTP emails |
| `SMTP_HOST` | **Yes** | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default: `587`) |
| `SMTP_USER` | **Yes** | SMTP username |
| `SMTP_PASS` | **Yes** | SMTP password |
| `AI_DISEASE_ENDPOINT` | No | External disease AI model URL |
| `AI_DISEASE_API_KEY` | No | API key for external disease model |
| `OWNER_MODULE_ENABLED` | No | Enable hidden owner panel (`false` by default) |

### Running the Application

#### Development (frontend + backend together)

```bash
# From the project root — starts both Vite dev server and Node backend concurrently
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000

#### Run separately

```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

#### Production build

```bash
# Build frontend into dist/
npm run build

# Start backend (serves API; frontend is served by Vercel or a static host)
cd backend && npm start
```

---

## Frontend Pages & Functions

### Dashboard (`/`)

- Personalized welcome with the farmer's name and role
- Live weather snapshot (temperature + 24-hour rain chance) via Geolocation
- Real-time active alert count
- Land size and location summary from the farmer profile
- Voice query input — speak to navigate to Weather, Disease, Market, or Crop Recommendation
- Feature card grid that adapts to the user's role and enabled feature flags

### AI Farming Assistant (`/ai-assistant`)

- Powered by **Google Gemini** with weather context injected automatically
- Chat history loaded from the backend (last 30 conversations)
- **Quick prompts** for common questions (rain planning, cotton heat plan, disease prevention)
- **Filters**: severity level (low / medium / high), crop, and date range
- **Export**: download filtered chat history as JSON or CSV
- Location badge shows coordinates when geolocation is granted

### Crop Recommendation (`/crop-recommend`)

**Inputs**:
- Soil type: Black, Red, Loamy, Sandy, Clay, Silt
- Season: Kharif, Rabi, Zaid
- Temperature (°C) and Seasonal Rainfall (mm) — can be auto-filled from current GPS location
- Land size (acres)

**Output**:
- Ranked crop recommendations with suitability percentage and risk level
- Net profit estimate (gross income minus estimated cost)
- Expected yield per acre
- Water and fertilizer requirements
- Actionable advisory notes
- Recommendation history panel

### Disease Detection (`/disease-detect`)

1. Upload a plant leaf photo (or take a photo on mobile)
2. Image is pre-processed and resized to 512 px max before upload
3. Backend AI model analyses the image; **local pixel-analysis fallback** runs if the backend is unavailable
4. Result shows: disease name, confidence %, observations, recommended cure, treatment list, prevention tips
5. Detections trigger browser push notifications and optional manager webhook alerts
6. Scan history panel shows the last 8 scans

**Supported disease classes**: Healthy, Leaf Blight, Rust, Powdery Mildew, Unknown

### Weather Forecast (`/weather`)

- 7-day forecast with daily temperature range, rain probability, and precipitation
- Irrigation advisory based on soil moisture predictions
- Frost and heat-stress warnings
- Rain alerts that trigger in-app notifications

### Market Prices (`/market-prices`)

**Supported commodities**: Rice, Cotton, Chilli, Soybean, Maize, Onion, Turmeric, Banana

- Current modal price and trend direction indicator
- SVG price trend chart: historical average (solid) vs. predicted price (dashed)
- Market query history
- Price change alerts stored in the notification system

### Profit Estimator (`/profit-estimator`)

**Inputs**: Crop selection, land size (acres), cost per acre (₹), market price adjustment

**Output**:
- Gross income = yield per acre × acres × adjusted price
- Net profit = gross − total cost
- Return on Investment (ROI %)
- Sale timing advisory based on profit/loss outcome

**Supported crops**: Rice, Cotton, Maize, Chilli, Banana, Marigold

### Fertilizer Calculator (`/fertilizer-calc`)

- Enter land size (acres) and select crop
- Calculates recommended quantities of:
  - **Urea** (nitrogen)
  - **DAP** (diammonium phosphate)
  - **MOP** (muriate of potash)

### Government Schemes (`/govt-schemes`)

12 national and state agricultural schemes with descriptions and direct portal links:

| Scheme | Portal |
|---|---|
| PM-KISAN | pmkisan.gov.in |
| Rythu Bandhu | rythubandhu.telangana.gov.in |
| PMFBY (Crop Insurance) | pmfby.gov.in |
| Kisan Credit Card (KCC) | RBI portal |
| Soil Health Card (SHC) | soilhealth.dac.gov.in |
| e-NAM (National Market) | enam.gov.in |
| PMKSY (Irrigation) | pmksy.gov.in |
| RKVY (Agriculture Dev.) | rkvy.da.gov.in |
| Agri Infrastructure Fund | agriinfra.dac.gov.in |
| NFSM (Food Security) | nfsm.gov.in |
| SMAM (Farm Machinery) | farmech.dac.gov.in |
| State Horticulture | horticulture.telangana.gov.in |

### Farmer Profile (`/profile`)

- Set location, land size (acres), and primary crops
- Profile data is used across all features for personalised recommendations
- Stored in localStorage and synced to backend

### Admin Panel (`/admin`) — Admin only

- **User management**: view all registered users, update roles
- **Feature flags**: enable or disable individual features per deployment
- **Live alerts**: view, create, and clear system alerts
- **Notifications debug**: test notification delivery

---

## Backend API Reference

All API endpoints are prefixed with `/api/v1`. All routes except auth and OTP require a valid **JWT Bearer token**.

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | No | Service and database health check |
| GET | `/api/v1/metrics` | Admin | Request metrics snapshot |

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create a new farmer account |
| POST | `/api/v1/auth/login` | Login and receive JWT access token |
| POST | `/api/v1/auth/refresh` | Refresh an expired access token |
| POST | `/api/v1/auth/logout` | Invalidate the current session |

### OTP (`/api/v1/otp`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/otp/send` | Send OTP to registered email |
| POST | `/api/v1/otp/verify` | Verify OTP and activate account |

### Profile (`/api/v1/profile`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/profile` | Fetch current farmer profile |
| PUT | `/api/v1/profile` | Update location, land size, crops |

### Weather (`/api/v1/weather`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/weather/decision` | Weather summary + rain advisory for lat/lng |
| GET | `/api/v1/weather/forecast` | 7-day forecast for lat/lng |

### Crops (`/api/v1/crops`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/crops/recommend` | Get crop recommendations for given soil/season/weather |
| GET | `/api/v1/crops/history` | Retrieve past recommendation queries |

### Disease (`/api/v1/disease`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/disease/analyze` | Submit leaf image for AI disease detection |
| GET | `/api/v1/disease/history` | Retrieve scan history |

### Market (`/api/v1/market`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/market/intelligence` | Prices, trends, and predictions for a commodity |
| GET | `/api/v1/market/history` | Past market queries |

### Schemes (`/api/v1/schemes`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/schemes` | List all government schemes |

### Alerts (`/api/v1/alerts`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/alerts/ingest` | Ingest an alert event from the frontend |
| GET | `/api/v1/alerts` | List active alerts |
| DELETE | `/api/v1/alerts/:id` | Dismiss an alert |

### AI Assistant (`/api/v1/ai`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/ai/chat` | Send a farming question to Gemini AI |
| GET | `/api/v1/ai/history` | Fetch AI chat history |

### Admin (`/api/v1/admin`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/admin/users` | List all users |
| PUT | `/api/v1/admin/users/:id/role` | Update a user's role |
| GET | `/api/v1/admin/features` | List feature flags |
| PUT | `/api/v1/admin/features/:key` | Toggle a feature flag |

---

## Authentication & Roles

The platform uses **JWT-based authentication** with two roles:

| Role | Access |
|---|---|
| `farmer` | All standard features enabled by admin |
| `admin` | All features + Admin Panel, Notifications Debug, Metrics |

Feature flags allow admins to **selectively enable or disable** individual features (crop recommendation, weather, disease detection, market prices, profit estimator, fertilizer calculator, government schemes, farmer profile) without code deployments.

The `ProtectedRoute` component enforces:
1. The user is authenticated (`isAuthenticated`)
2. The user has the required role (e.g., `admin`)
3. The required feature flag is enabled (`isFeatureEnabled`)

---

## Real-time Features

The backend runs a **Socket.IO** server on the same HTTP port. The frontend connects automatically after login to receive:

- **Live alert pushes** when crop, disease, weather, or market thresholds are breached
- **Notification count updates** reflected in the header bell icon

An **alert scheduler** runs on the backend to periodically check conditions and push alerts to connected clients.

---

## Multilingual Support

The app ships with complete **English** and **Telugu (తెలుగు)** translations via `LanguageContext`. A language toggle in the header switches the entire UI instantly without a page reload. All feature labels, form placeholders, result messages, alerts, and advisory text are translated.

---

## Deployment

### Vercel (Frontend)

The repository is pre-configured for Vercel via `vercel.json`:

- **Framework**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **SPA rewrites**: all routes → `index.html`

Set the environment variable `VITE_API_PROXY_TARGET` to point to your deployed backend URL.

### Backend (Any Node.js Host)

Recommended platforms: [Render](https://render.com), [Railway](https://railway.app), [Fly.io](https://fly.io)

```bash
cd backend
npm install
npm start
```

Ensure all required environment variables are set in your host's dashboard before starting.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and add tests where applicable
4. Run backend tests: `cd backend && npm test`
5. Commit and push: `git push origin feature/your-feature-name`
6. Open a Pull Request describing your changes

---

## License

This project is open source. See the repository for license details.

---

> Built with ❤️ to empower Indian farmers with data-driven decisions.
