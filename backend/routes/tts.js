import { Router } from "express";

const router = Router();

// English + Hindi: ElevenLabs (server-side API key).
// Marathi: Sarvam Bulbul v3, which is purpose-built for Indian languages.
// The browser never receives either API key.
const LANGUAGE_CODES = {
  en: "en",
  "en-IN": "en",
  hi: "hi",
  "hi-IN": "hi",
  mr: "mr-IN",
  "mr-IN": "mr-IN",
};

function normalizeLang(lang) {
  const value = String(lang || "mr").toLowerCase();
  const base = value.split("-")[0];
  return ["en", "hi", "mr"].includes(base) ? base : "mr";
}

function cleanForSpeech(text) {
  return String(text || "")
    .replace(/\[NEED_EXPERT\]/gi, "")
    .replace(/[*_`#>]/g, "")
    .replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F\u200D]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickElevenVoiceId(lang) {
  return (
    process.env[`ELEVENLABS_VOICE_ID_${lang.toUpperCase()}`] ||
    process.env.ELEVENLABS_VOICE_ID ||
    ""
  ).trim();
}

async function elevenLabsTts(text, lang) {
  const apiKey = String(process.env.ELEVENLABS_API_KEY || "").trim();
  const voiceId = pickElevenVoiceId(lang);
  const modelId = String(process.env.ELEVENLABS_MODEL_ID || "eleven_v3").trim();
  if (!apiKey || !voiceId) return null;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      text,
      model_id: modelId,
      // ElevenLabs determines language primarily from the text; this parameter
      // also helps normalization for short/ambiguous inputs.
      language_code: lang,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.25,
        use_speaker_boost: true,
      },
    }),
  });

  if (!r.ok) {
    const providerError = await r.text();
    console.error("ElevenLabs error:", providerError);
    throw new Error(`ElevenLabs ${r.status}`);
  }

  return Buffer.from(await r.arrayBuffer());
}

async function sarvamMarathiTts(text) {
  const apiKey = String(process.env.SARVAM_API_KEY || "").trim();
  if (!apiKey) return null;

  const body = {
    text: text.slice(0, 2500),
    language_code: "mr-IN",
    model: String(process.env.SARVAM_TTS_MODEL || "bulbul:v3"),
    speaker: String(process.env.SARVAM_MR_SPEAKER || "priya"),
    speech_sample_rate: 24000,
    output_audio_codec: "wav",
  };

  // Sarvam's current REST API uses /text-to-speech and the
  // api-subscription-key header. The request returns base64 audio.
  const r = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Sarvam TTS error:", data);
    throw new Error(`Sarvam ${r.status}`);
  }

  const audioBase64 = data?.audios?.[0];
  if (!audioBase64) throw new Error("Sarvam returned no audio");
  return Buffer.from(audioBase64, "base64");
}

// POST /api/tts
// Body: { text, lang }
// en/hi -> ElevenLabs; mr -> Sarvam Bulbul v3.
router.post("/", async (req, res) => {
  const { text, lang } = req.body || {};
  const selectedLang = normalizeLang(lang);
  const speechText = cleanForSpeech(text);

  if (!speechText) return res.status(400).json({ error: "text is required" });

  try {
    let audio;
    let contentType;
    let provider;

    if (selectedLang === "mr") {
      audio = await sarvamMarathiTts(speechText);
      contentType = "audio/wav";
      provider = "sarvam";
      if (!audio) {
        return res.status(501).json({
          error: "Marathi TTS is not configured. Add SARVAM_API_KEY to backend/.env.",
        });
      }
    } else {
      audio = await elevenLabsTts(speechText, selectedLang);
      contentType = "audio/mpeg";
      provider = "elevenlabs";
      if (!audio) {
        return res.status(501).json({
          error: "English/Hindi ElevenLabs TTS is not configured. Add ELEVENLABS_API_KEY and an available voice ID to backend/.env.",
        });
      }
    }

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "no-store");
    res.set("X-TTS-Provider", provider);
    res.send(audio);
  } catch (err) {
    console.error("TTS proxy error:", err);
    res.status(502).json({
      error: "TTS request failed",
      provider: selectedLang === "mr" ? "sarvam" : "elevenlabs",
    });
  }
});

export default router;
