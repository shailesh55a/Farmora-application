import { Router } from "express";

const router = Router();
const AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

function clean(value) { return String(value ?? "").trim(); }
function matches(value, expected) {
  return !expected || clean(value).toLowerCase() === clean(expected).toLowerCase();
}
function toRecord(row) {
  const min = Number(row.min_price);
  const max = Number(row.max_price);
  const modal = Number(row.modal_price);
  const rawDate = clean(row.arrival_date);
  const dateMatch = rawDate.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  const arrivalDateISO = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : (/^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "");
  return {
    commodity: clean(row.commodity),
    market: clean(row.market),
    state: clean(row.state),
    district: clean(row.district),
    arrivalDate: rawDate,
    arrivalDateISO,
    minPrice: Number.isFinite(min) ? min : null,
    maxPrice: Number.isFinite(max) ? max : null,
    modalPrice: Number.isFinite(modal) ? modal : null,
    unit: "₹/quintal",
    source: "AGMARKNET / data.gov.in",
  };
}


const FRUIT_KEYWORDS = [
  "Apple","Banana","Mango","Orange","Papaya","Pomegranate","Guava","Grapes","Pineapple",
  "Water Melon","Watermelon","Muskmelon","Litchi","Lemon","Sweet Orange","Custard Apple",
  "Jack Fruit","Sapota","Ber","Coconut","Tamarind","Fig","Pear","Peach","Plum","Strawberry"
];
const FISH_KEYWORDS = [
  "Fish","Rohu","Katla","Mrigal","Hilsa","Pomfret","Prawn","Shrimp","Crab","Tuna","Sardine",
  "Mackerel","Seer","Surmai","Bombay Duck","Anchovy","Tilapia","Common Carp","Silver Carp",
  "Grass Carp","Magur","Singhi","Pangasius","Grouper","Snapper"
];
function categoryMatch(commodity, category) {
  const name = clean(commodity).toLowerCase();
  if (category === "fruits") return FRUIT_KEYWORDS.some(k => name.includes(k.toLowerCase()));
  if (category === "fisheries") return FISH_KEYWORDS.some(k => name.includes(k.toLowerCase()));
  if (category === "crops") return !FRUIT_KEYWORDS.some(k => name.includes(k.toLowerCase())) && !FISH_KEYWORDS.some(k => name.includes(k.toLowerCase()));
  return true;
}
async function fetchAllRecords({ apiKey, state, district, market, category }) {
  const records = [];
  const pageSize = 1000;
  // The OGD endpoint is paginated; collect several pages so the market screen can
  // show a broad direct list instead of requiring a commodity search.
  for (let offset = 0; offset < 5000; offset += pageSize) {
    const filters = new URLSearchParams();
    if (state) filters.set("filters[state]", state);
    if (district) filters.set("filters[district]", district);
    if (market) filters.set("filters[market]", market);
    const url = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=${pageSize}&offset=${offset}&${filters.toString()}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) break;
    const json = await r.json();
    const rows = Array.isArray(json.records) ? json.records : [];
    if (!rows.length) break;
    records.push(...rows.map(toRecord).filter(x => x.commodity && x.modalPrice != null && categoryMatch(x.commodity, category)));
    if (rows.length < pageSize) break;
  }
  const unique = new Map();
  for (const row of records) {
    const key = [row.commodity,row.market,row.state,row.district,row.arrivalDate].join("|");
    if (!unique.has(key)) unique.set(key,row);
  }
  return [...unique.values()].sort((a,b) =>
    String(b.arrivalDateISO || "").localeCompare(String(a.arrivalDateISO || "")) ||
    String(a.commodity).localeCompare(String(b.commodity))
  );
}

// GET /api/prices/all?category=crops|fruits|fisheries
router.get("/all", async (req, res) => {
  const apiKey = clean(process.env.AGMARKNET_API_KEY);
  const category = ["crops", "fruits", "fisheries", "all"].includes(clean(req.query.category)) ? clean(req.query.category) : "crops";
  const state = clean(req.query.state);
  const district = clean(req.query.district);
  const market = clean(req.query.market);
  const date = clean(req.query.date);
  if (!apiKey) return res.status(200).json({ live: false, records: [], category, source: "AGMARKNET / data.gov.in", reason: "API key not configured" });
  try {
    const fetched = (await fetchAllRecords({ apiKey, state, district, market, category })).filter(row => !date || row.arrivalDate === date || row.arrivalDateISO === date);
    // The UI needs a direct price list, so show the latest available market record
    // for each commodity instead of forcing the farmer to search commodity-by-commodity.
    const latestByCommodity = new Map();
    for (const row of fetched) {
      const key = clean(row.commodity).toLowerCase();
      const existing = latestByCommodity.get(key);
      if (!existing || String(row.arrivalDateISO || "").localeCompare(String(existing.arrivalDateISO || "")) > 0) {
        latestByCommodity.set(key, row);
      }
    }
    const records = [...latestByCommodity.values()];
    return res.json({ live: true, category, records, source: "AGMARKNET / data.gov.in", fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("AGMARKNET all-prices error:", err);
    return res.status(200).json({ live: false, records: [], category, source: "AGMARKNET / data.gov.in", reason: "network_error" });
  }
});

// GET /api/prices?commodity=Tomato&state=Maharashtra&district=Nashik&market=...
// The backend is the only place that receives the data.gov.in API key.
router.get("/", async (req, res) => {
  const apiKey = clean(process.env.AGMARKNET_API_KEY);
  const commodity = clean(req.query.commodity);
  const state = clean(req.query.state);
  const district = clean(req.query.district);
  const market = clean(req.query.market);
  const date = clean(req.query.date);

  if (!commodity) return res.status(400).json({ error: "commodity query param required" });
  if (!apiKey) return res.status(200).json({ live: false, records: [], source: "AGMARKNET / data.gov.in", reason: "API key not configured" });

  try {
    const filters = new URLSearchParams();
    filters.set("filters[commodity]", commodity);
    if (state) filters.set("filters[state]", state);
    if (district) filters.set("filters[district]", district);
    if (market) filters.set("filters[market]", market);
    if (date) filters.set("filters[arrival_date]", date);
    const url = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=100&${filters.toString()}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return res.status(200).json({ live: false, records: [], source: "AGMARKNET / data.gov.in", reason: `upstream_${r.status}` });
    const json = await r.json();
    const rows = Array.isArray(json.records) ? json.records : [];
    const records = rows.map(toRecord).filter((x) => x.commodity && x.modalPrice != null && matches(x.state, state) && matches(x.district, district) && matches(x.market, market) && (!date || x.arrivalDate === date));
    records.sort((a, b) => String(b.arrivalDateISO || "").localeCompare(String(a.arrivalDateISO || "")));
    return res.json({ live: true, records, source: "AGMARKNET / data.gov.in", fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("AGMARKNET proxy error:", err);
    return res.status(200).json({ live: false, records: [], source: "AGMARKNET / data.gov.in", reason: "network_error" });
  }
});

export default router;
