# Farmora deployment

Architecture: Firebase Authentication -> Vercel frontend -> Render backend -> Groq AI.
ElevenLabs/Sarvam remain backend voice providers.

## Render
Root directory: `backend`
Build: `npm ci`
Start: `npm start`

Set:
- `GROQ_API_KEY` = your Groq key
- `GROQ_MODEL` = `qwen/qwen3.6-27b`
- `GROQ_VISION_MODEL` = `qwen/qwen3.6-27b`
- `FRONTEND_ORIGIN` = your Vercel production URL
- `ALLOW_VERCEL_PREVIEWS` = `true` while testing previews
- Existing ElevenLabs/Sarvam variables if voice output is enabled
- `AGMARKNET_API_KEY` if live mandi prices are enabled

Check: `https://YOUR-RENDER-URL/api/health`
Expected AI fields: `aiConfigured: true`, `aiProvider: "groq"`.

## Vercel
Root directory: `frontend`
Build command: `npm run build`
Output directory: `dist`
Install command: `npm ci`

Set frontend variable:
`VITE_API_BASE_URL=https://YOUR-RENDER-URL/api`

Never put `GROQ_API_KEY`, ElevenLabs, Sarvam, or Agmarknet secrets in Vercel frontend variables or `VITE_*` variables.
