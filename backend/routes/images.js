import { Router } from "express";

const router = Router();

router.get("/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 6);
  if (!query) return res.status(400).json({ error: "q query param required" });

  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&format=json&origin=*`;
    const response = await fetch(url, { headers: { "User-Agent": "Farmora/1.0" } });
    if (!response.ok) return res.status(200).json({ images: [], source: "Wikimedia Commons", reason: `upstream_${response.status}` });
    const data = await response.json();
    const images = Object.values(data.query?.pages || {}).map((page) => ({
      title: String(page.title || "").replace(/^File:/, ""),
      thumbnailUrl: page.imageinfo?.[0]?.thumburl || null,
      url: page.imageinfo?.[0]?.url || null,
      sourceUrl: page.fullurl || null,
      source: "Wikimedia Commons",
    })).filter((image) => image.thumbnailUrl || image.url);
    return res.json({ images, source: "Wikimedia Commons" });
  } catch (error) {
    console.error("Reference image search error:", error);
    return res.status(200).json({ images: [], source: "Wikimedia Commons", reason: "network_error" });
  }
});

export default router;
