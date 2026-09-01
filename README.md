# Farmora

Farmora is a multilingual farming assistant for Indian farmers.

## AI architecture
- **Groq is the only generative AI provider** for Sevak text answers and crop-image analysis.
- Default model: `qwen/qwen3.6-27b` (override with `GROQ_MODEL`).
- Vision model: `GROQ_VISION_MODEL` (defaults to `GROQ_MODEL`).
- Groq API keys stay on the Render backend and are never exposed to the browser.
- ElevenLabs and Sarvam are retained only for voice/text-to-speech features.

## Backend environment
```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
ALLOW_VERCEL_PREVIEWS=true
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.6-27b
GROQ_VISION_MODEL=qwen/qwen3.6-27b
AGMARKNET_API_KEY=optional
ELEVENLABS_API_KEY=optional
ELEVENLABS_MODEL_ID=eleven_v3
ELEVENLABS_VOICE_ID=optional
ELEVENLABS_VOICE_ID_EN=optional
ELEVENLABS_VOICE_ID_HI=optional
SARVAM_API_KEY=optional
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_MR_SPEAKER=priya
```

## Frontend environment
```env
VITE_API_BASE_URL=http://localhost:5000/api
```
In Vercel, set `VITE_API_BASE_URL` to your Render backend URL ending in `/api`.

## Deployment
- Frontend: Vercel, Vite build, output `dist`.
- Backend: Render, root directory `backend`, `npm ci`, `npm start`.
- Set the Render environment variables above before testing Sevak or Crop Scan.
