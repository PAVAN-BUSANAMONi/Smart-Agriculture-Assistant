# Smart Agriculture Assistant - Developer Guide

## Project Context
This is a full-stack Web Application designed to support farmers in making data-driven agricultural decisions.
- **Frontend:** React, TailwindCSS, Vite
- **Backend:** Node.js, Express, Mongoose/MySQL
- **Core Features:** Crop Recommendation, Fertilizer Suggestions, Weather Insights, AI Assistant.

## Swarm Orchestration (Ruflo)
This project is configured for multi-agent swarm development using Ruflo (`claude-flow`). 
When you are executing complex workflows, refer to `AGENTS.md` and adopt the appropriate agent roles, or establish consensus when multiple domains (Frontend + Backend + Agronomy) overlap.

## Code Standards
- Use TailwindCSS for all frontend styling. Keep the UI premium with glassmorphism effects (`.glass-card`, `.glass-panel`).
- Backend modules are strictly contained within `backend/src/modules/`.
- Prioritize asynchronous data fetching and robust error handling.
