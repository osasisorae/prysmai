import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { registerCustomAuthRoutes } from "../customAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { proxyRouter } from "../proxy";
import { resendWebhookRouter } from "../resendWebhook";
import { handleStripeWebhook } from "../stripe/webhook";
import { startMetricsScheduler } from "../metrics-scheduler";
import { initWebSocketServer } from "../ws-live-feed";
import { registerMcpRoutes } from "../mcp/index";

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
  // Stripe webhook needs raw body for signature verification — MUST be before express.json()
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Custom email/password auth routes
  registerCustomAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // Resend Inbound webhook for email forwarding
  app.use("/api/webhooks", resendWebhookRouter);
  // Prysm AI Governance MCP Server
  registerMcpRoutes(app);
  // Prysm AI Proxy Gateway — OpenAI-compatible reverse proxy
  // Must be under /api/* for deployment platform routing
  app.use("/api/v1", proxyRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Initialize WebSocket live feed BEFORE Vite so our upgrade handler
  // only claims /ws/live-feed and Vite HMR gets all other WS upgrades
  initWebSocketServer(server);

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
    // Start the metrics aggregation scheduler
    startMetricsScheduler();
  });
}

startServer().catch(console.error);
