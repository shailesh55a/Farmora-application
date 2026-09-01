import { Router } from "express";

const router = Router();

// Speech-to-text is intentionally handled in the browser (Web Speech API with
// the local Whisper fallback). No third-party speech API key is required.
router.post("/", (_req, res) => {
  res.status(501).json({
    error: "Server transcription is not enabled. Use the browser voice input in Farmora."
  });
});

export default router;
