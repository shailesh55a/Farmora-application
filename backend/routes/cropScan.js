import { Router } from "express";

const router = Router();
const ALLOWED_CONDITIONS = new Set(["healthy", "early_blight", "nutrient_deficiency", "pest_damage", "unknown"]);

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, done: () => clearTimeout(timer) };
}

function cleanJsonText(text) {
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

router.post("/", async (req, res) => {
  const imageBase64 = String(req.body?.imageBase64 || "").trim();
  const mimeType = String(req.body?.mimeType || "image/jpeg").split(";")[0];
  const lang = ["en", "hi", "mr"].includes(req.body?.lang) ? req.body.lang : "en";
  const fieldCrop = String(req.body?.fieldCrop || "").trim();
  if (!imageBase64) return res.status(400).json({ error: "Crop image is required." });
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) return res.status(400).json({ error: "Please upload a JPG, PNG or WebP crop image." });

  const language = { en: "English", hi: "Hindi", mr: "Marathi" }[lang];
  const prompt = `You are Farmora Crop Scan. Analyze this crop photo cautiously for an Indian farmer. Respond ONLY as valid JSON with no markdown. Use ${language} for all human-readable fields. Allowed conditionKey values: healthy, early_blight, nutrient_deficiency, pest_damage, unknown. Never claim certainty from an image alone. If unclear, use unknown and confidence <= 40. Do not invent pesticide brands, doses, concentrations, registration numbers, or product claims. Return exactly: {"crop":"","plantIdentification":"","leafDetails":"","healthStatus":"","conditionKey":"unknown","diagnosis":"","confidence":0,"uncertainty":"","visualEvidence":[],"symptoms":[],"nextActions":[],"prevention":[],"treatmentNote":""}. Keep arrays <=4. ${fieldCrop ? `Known field crop context: ${fieldCrop}.` : ""}`;
  const apiKey = String(process.env.GROQ_API_KEY || "").trim();
  const model = String(process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL || "qwen/qwen3.6-27b").trim();
  if (!apiKey) return res.status(503).json({ error: "AI is not configured. Add GROQ_API_KEY to the backend environment." });

  const { controller, done } = withTimeout(35000);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }] }],
        temperature: 0.1,
        max_completion_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Groq crop scan error:", data);
      return res.status(response.status).json({ error: "Groq crop analysis failed." });
    }
    const raw = String(data.choices?.[0]?.message?.content || "").trim();
    let parsed;
    try { parsed = JSON.parse(cleanJsonText(raw)); } catch { return res.status(502).json({ error: "Groq returned an unreadable crop analysis." }); }

    const conditionKey = ALLOWED_CONDITIONS.has(parsed.conditionKey) ? parsed.conditionKey : "unknown";
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
    const safeArray = (value) => Array.isArray(value) ? value.slice(0, 4).map(String) : [];
    return res.json({
      crop: String(parsed.crop || "unknown"),
      plantIdentification: String(parsed.plantIdentification || parsed.crop || "unknown"),
      leafDetails: String(parsed.leafDetails || ""),
      healthStatus: String(parsed.healthStatus || ""),
      visualEvidence: safeArray(parsed.visualEvidence), conditionKey,
      diagnosis: String(parsed.diagnosis || "Visual diagnosis is uncertain."),
      confidence: conditionKey === "unknown" ? Math.min(confidence, 40) : confidence,
      uncertainty: String(parsed.uncertainty || "Image-based identification can be uncertain."),
      symptoms: safeArray(parsed.symptoms), nextActions: safeArray(parsed.nextActions), prevention: safeArray(parsed.prevention),
      treatmentNote: String(parsed.treatmentNote || "Consult a local agricultural expert before using chemical treatment."),
      model, provider: "groq",
    });
  } catch (error) {
    return res.status(error?.name === "AbortError" ? 504 : 502).json({ error: "Crop analysis service is unavailable." });
  } finally { done(); }
});

export default router;
