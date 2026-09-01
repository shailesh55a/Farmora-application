import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "../data/treatments.json");
router.get("/", (req,res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath,"utf8"));
    const crop = String(req.query.crop || "").toLowerCase().trim();
    const disease = String(req.query.disease || "").toLowerCase().trim();
    const entries = (data.entries || []).filter(x =>
      (!crop || x.crop.toLowerCase() === crop) &&
      (!disease || x.disease.toLowerCase() === disease)
    );
    res.json({version:data.version, entries});
  } catch (e) {
    console.error("Treatment dataset error:",e);
    res.status(500).json({error:"Verified treatment information is unavailable."});
  }
});
export default router;
