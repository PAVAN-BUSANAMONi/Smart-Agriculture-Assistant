What's in the README
Overview — What the project is, who it's for, and what AI/data sources it uses.

Features table — All 12 features at a glance (AI assistant, crop recommendation, disease detection, weather, market prices, profit estimator, fertilizer calculator, govt schemes, notifications, profile, admin panel, multilingual + voice).

Tech Stack — Full frontend (React 19, TypeScript, Vite 7, Tailwind 4, Socket.IO) and backend (Express 5, MongoDB/Mongoose, Gemini AI, JWT, Nodemailer, Pino, Zod, Vitest) tables with versions.

Project Structure — Annotated directory tree for every meaningful file and folder in both src/ and backend/.

Getting Started — Step-by-step instructions: prerequisites, npm install, copying .env.example, a variable reference table, and commands for dev/production modes.

Frontend Pages & Functions — Detailed description of every page: inputs, outputs, and how each feature works (Dashboard, AI Assistant, Crop Recommendation, Disease Detection, Weather, Market Prices, Profit Estimator, Fertilizer Calculator, Govt Schemes, Profile, Admin Panel).

Backend API Reference — Full table of every REST endpoint grouped by module (Health, Auth, OTP, Profile, Weather, Crops, Disease, Market, Schemes, Alerts, AI, Admin).

Authentication & Roles — How JWT, farmer/admin roles, and feature flags work together via ProtectedRoute.

Real-time Features — Socket.IO alert push architecture and the background alert scheduler.

Multilingual Support — English/Telugu context system.

Deployment — Vercel config for the frontend and any Node.js host for the backend.
