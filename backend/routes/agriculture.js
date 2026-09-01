import { Router } from "express";
import { detectCrop, findVerifiedProducts, loadFertilizers, loadTreatments } from "../lib/agriculture.js";

const router = Router();

router.get("/products", (req, res) => {
  try {
    const category = String(req.query.category || "").toLowerCase().trim();
    const crop = detectCrop(String(req.query.crop || ""), "");
    const disease = String(req.query.disease || "").toLowerCase().trim();
    const entries = findVerifiedProducts({ crop, category, disease });
    res.json({
      sourcePolicy: "Verified structured agricultural data only. Missing images are shown as unavailable.",
      entries
    });
  } catch (error) {
    console.error("Agriculture dataset error:", error);
    res.status(500).json({ error: "Verified agricultural information is unavailable." });
  }
});

router.get("/fertilizers", (_req, res) => {
  res.json({ entries: loadFertilizers() });
});

router.get("/treatments", (_req, res) => {
  res.json({ entries: loadTreatments() });
});

export default router;
