# Farmora final build fixes

- Groq is now the single generative-AI provider for Sevak and Crop Scan.
- Removed Gemini/Google AI provider selection and fallback logic.
- Default Groq model is `qwen/qwen3.6-27b`.
- Crop Scan uses `GROQ_VISION_MODEL` (falling back to `GROQ_MODEL`).
- Fixed the assistant message normalization path so chat messages are always converted to valid Groq OpenAI-compatible messages.
- Removed the obsolete `App.jsx.bak` file.
- Updated Render environment configuration to require `GROQ_API_KEY` instead of Gemini.
- Updated health endpoint to report Groq provider/model information.
- Kept ElevenLabs and Sarvam for voice output only.
- Kept Agmarknet/Open-Meteo integrations for market/weather data.
- Kept API secrets backend-only.
- Kept Vercel frontend build configuration and Vite output unchanged.
