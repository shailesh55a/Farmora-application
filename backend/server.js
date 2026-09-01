import "dotenv/config";
import express from "express";
import cors from "cors";

import assistantRouter from "./routes/assistant.js";
import pricesRouter from "./routes/prices.js";
import ttsRouter from "./routes/tts.js";
import weatherRouter from "./routes/weather.js";
import treatmentsRouter from "./routes/treatments.js";
import agricultureRouter from "./routes/agriculture.js";
import cropScanRouter from "./routes/cropScan.js";
import imagesRouter from "./routes/images.js";

const app = express();
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((x) => x.trim().replace(/\/$/, ""))
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = String(origin).replace(/\/$/, "");
  if (allowedOrigins.length === 0) return true;
  if (allowedOrigins.includes(normalized)) return true;
  // Allow Vercel preview deployments without requiring a Render redeploy for
  // every generated preview URL. Production can still be restricted by setting
  // FRONTEND_ORIGIN to the exact production domain and disabling previews.
  if (process.env.ALLOW_VERCEL_PREVIEWS !== "false") {
    try {
      const url = new URL(normalized);
      if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) return true;
    } catch {}
  }
  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" })); // 10mb to allow base64 leaf photos through to /api/assistant

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "farmora-backend",
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    aiProvider: process.env.GROQ_API_KEY ? "groq" : "none",
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    groqModel: process.env.GROQ_MODEL || "qwen/qwen3.6-27b",
    groqVisionModel: process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL || "qwen/qwen3.6-27b",
    agmarknetConfigured: Boolean(process.env.AGMARKNET_API_KEY),
    ttsConfigured: Boolean(
      process.env.SARVAM_API_KEY ||
      (process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_VOICE_ID_HI || process.env.ELEVENLABS_VOICE_ID_EN))
    ),
    ttsModel: process.env.ELEVENLABS_MODEL_ID || "eleven_v3",
  });
});

app.use("/api/assistant", assistantRouter);
app.use("/api/prices", pricesRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/treatments", treatmentsRouter);
app.use("/api/agriculture", agricultureRouter);
app.use("/api/crop-scan", cropScanRouter);
app.use("/api/images", imagesRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Farmora backend running on port ${PORT}`);
  if (!process.env.GROQ_API_KEY) {
    console.warn("⚠️  No Groq API key is set — Sevak and Crop Scan will be unavailable until GROQ_API_KEY is configured.");
  }
});
