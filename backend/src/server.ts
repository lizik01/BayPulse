import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./middleware/errorHandler";
import eventRoutes from "./routes/eventRoutes";

const app = express();
const PORT = Number(process.env.PORT) || 5001;

const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

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

app.listen(PORT, () => {
  console.log(`BayPulse API listening on http://localhost:${PORT}`);
  if (!process.env.TICKETMASTER_API_KEY) {
    console.warn("Warning: TICKETMASTER_API_KEY is not set; event searches will fail.");
  }
});
