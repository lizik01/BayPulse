import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/errorHandler";
import eventRoutes from "./routes/eventRoutes";

export interface AppOptions {
  /** Allowed CORS origin(s), comma-separated. Defaults to FRONTEND_URL or the Vite dev server. */
  frontendUrl?: string;
}

export function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/** Builds the Express app without starting a server, so tests can drive it directly. */
export function createApp({ frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173" }: AppOptions = {}) {
  const app = express();
  const allowedOrigins = parseOrigins(frontendUrl);

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / curl requests (no Origin header) and configured frontends.
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(null, false);
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      ticketmasterConfigured: Boolean(process.env.TICKETMASTER_API_KEY),
      time: new Date().toISOString(),
    });
  });

  app.use("/api", eventRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
