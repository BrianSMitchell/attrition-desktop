---
description: DEPRECATED - Development CORS strategy for multi-origin Vite clients and Socket.IO during local development
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["cors", "express", "socket.io", "vite", "development", "preflight", "DEPRECATED"]
globs: ["packages/server/src/**/*.ts", "packages/server/.env"]
---

# ⚠️ DEPRECATED - Development CORS Strategy (Multi-Origin, Vite)

**DEPRECATION NOTICE**: This rule is deprecated as of 2025-09-13. For desktop-only Electron applications, CORS is not relevant. Use `.clinerules/electron-security-strategy.md` instead for Electron-specific security patterns.

**Migration**: Replace CORS configuration with Electron IPC security, CSP policies, and secure server communication patterns.

---

## Original Content (Historical Reference Only)

## Objective

Provide a robust, repeatable pattern to avoid CORS preflight failures in development when Vite can run on varying ports (e.g., 5173 or 5174), and ensure both REST (Express) and WebSockets (Socket.IO) accept the same set of allowed origins.

Fixes issues like:
- `Access to XMLHttpRequest at ... has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'http://localhost:5173' that is not equal to the supplied origin.`

## Environment Configuration

Use a comma-separated environment variable for allowed origins:

`.env`
```
# Comma-separated list of allowed origins for development
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

Notes:
- Add/adjust ports as needed (e.g., 3000, 4173 if using preview, etc.).
- Keep this separate from production domain configuration.

## Server Bootstrap Pattern

Parse the multi-origin list once and reuse for both Express CORS and Socket.IO.

`packages/server/src/index.ts` (snippet)
```ts
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});
```

## Preflight and Credentials

- `credentials: true` enables cookies/auth headers; ensure the client also sends credentials if needed.
- Express `cors()` handles OPTIONS preflights automatically for routes using `app.use(cors(...))`.
- If you mount CORS only on specific routers, ensure preflight reaches them or add:
  ```ts
  app.options("*", cors({ origin: allowedOrigins, credentials: true }));
  ```

## Client Configuration (Vite)

No change required in typical setups. Vite might auto-switch ports if 5173 is busy. The server must accept all local dev ports listed in `CORS_ORIGIN`.

If you proxy API through Vite, ensure proxy target matches server port and CORS is either disabled via proxy or aligned accordingly.

## Socket.IO Notes

- Socket.IO must be configured with the same `origin` list as Express.
- Restart the server after changing `.env` so new origins take effect.

## Troubleshooting

- Error mentions different origin than expected (e.g., 5174): add that port to `CORS_ORIGIN`.
- Browser keeps failing after changes: hard refresh, clear dev tools cache, and confirm server restarted with updated env.
- Mixed credentials error: if using cookies, set `credentials: true` on both server and client, and ensure cookies have appropriate `SameSite` and `secure` flags for the environment.

## Checklist

- [ ] `.env` uses `CORS_ORIGIN` with comma-separated origins for dev
- [ ] `allowedOrigins` array parsed from env and reused for Express and Socket.IO
- [ ] `credentials: true` used where necessary
- [ ] Server restarted after changes
