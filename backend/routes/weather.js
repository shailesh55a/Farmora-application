import { Router } from "express";

const router = Router();

// GET /api/weather?lat=..&lon=..
// Optional proxy. Open-Meteo is free and needs no key, so the frontend
// currently calls it directly from the browser (see fetchWeather() in
// src/App.jsx) — this route exists if you'd rather route everything
// through the backend for consistency/logging.
router.get("/", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon query params required" });
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,apparent_temperature&daily=precipitation_probability_max,precipitation_sum,temperature_2m_max,temperature_2m_min,weather_code&forecast_days=4&timezone=auto`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Weather proxy error:", err);
    res.status(500).json({ error: "Weather request failed" });
  }
});

export default router;
