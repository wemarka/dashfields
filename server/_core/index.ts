import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startCron } from "../cron";
import { runMissingMigrations } from "../migrations";
import { registerPlatformOAuthRoutes } from "../services/integrations/platformOAuth";
import { handleAIAgentChat } from "../app/services/aiAgent";
import rateLimit from "express-rate-limit";

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === "development";

// General API: 300 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: () => isDev,
});

// Auth endpoints: 15 requests per minute per IP (stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
  skip: () => isDev,
});

// AI endpoints: 30 requests per minute per IP (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit exceeded, please wait before making more requests." },
  skip: () => isDev,
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Apply general rate limiter to all API routes
  app.use("/api/", generalLimiter);
  // Stricter rate limiting for auth routes
  app.use("/api/oauth/", authLimiter);
  // AI-specific rate limiting
  app.use("/api/trpc/ai.", aiLimiter);
  app.use("/api/trpc/sentiment.", aiLimiter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Unified platform OAuth routes (Meta, TikTok, LinkedIn, YouTube, Twitter, Snapchat, Pinterest)
  registerPlatformOAuthRoutes(app);

  // AI Agent SSE streaming endpoint
  app.post("/api/ai-agent/chat", aiLimiter, (req, res) => { void handleAIAgentChat(req, res); });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start cron scheduler for reports and budget alerts
    startCron();
    // Run any missing DB migrations (non-blocking)
    runMissingMigrations().catch(err => console.warn("[Migrations] Non-fatal error:", err));
  });
}

startServer().catch(console.error);
