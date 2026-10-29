import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 5001;

createApp().listen(PORT, () => {
  console.log(`BayPulse API listening on http://localhost:${PORT}`);
  if (!process.env.TICKETMASTER_API_KEY) {
    console.warn("Warning: TICKETMASTER_API_KEY is not set; event searches will fail.");
  }
});
