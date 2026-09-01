import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");

const CROP_ALIASES = {
  tomato: ["tomato", "टमाटर", "टोमॅटो"],
  onion: ["onion", "प्याज़", "प्याज", "कांदा"],
  potato: ["potato", "आलू", "बटाटा"],
  wheat: ["wheat", "गेहूं", "गहू"],
  rice: ["rice", "paddy", "चावल", "भात"],
  cotton: ["cotton", "कपास", "कापूस"],
  soybean: ["soybean", "soyabean", "सोयाबीन"],
  maize: ["maize", "corn", "मक्का", "मका"],
  chili: ["chili", "chilli", "मिर्च", "मिरची"],
  groundnut: ["groundnut", "peanut", "मूंगफली", "भुईमूग"],
  sugarcane: ["sugarcane", "गन्ना", "ऊस"],
  gram: ["gram", "chana", "chickpea", "चना", "हरभरा", "हरभरा"],
  jowar: ["jowar", "sorghum", "ज्वार", "ज्वारी"],
  bajra: ["bajra", "pearl millet", "बाजरा", "बाजरी"],
  pigeonpea: ["pigeonpea", "pigeon pea", "arhar", "tur", "tur dal", "तूर", "तुरी", "अरहर"],
  mustard: ["mustard", "सरसों", "मोहरी"],
  turmeric: ["turmeric", "हल्दी", "हळद"],
  mango: ["mango", "आम", "आंबा"],
  banana: ["banana", "केला", "केळी"],
  grapes: ["grapes", "अंगूर", "द्राक्षे"],
  pomegranate: ["pomegranate", "अनार", "डाळिंब"],
  orange: ["orange", "संतरा", "संत्रे"],
  guava: ["guava", "अमरूद", "पेरू"],
  papaya: ["papaya", "पपीता", "पपई"],
  watermelon: ["watermelon", "तरबूज", "कलिंगड"],
  apple: ["apple", "सेब", "सफरचंद"],
};

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

export function detectCrop(text, fallback = "") {
  const q = String(text || "").toLowerCase();
  for (const [crop, aliases] of Object.entries(CROP_ALIASES)) {
    if (aliases.some((a) => q.includes(a.toLowerCase()))) return crop;
  }
  return String(fallback || "").toLowerCase();
}

const PROBLEM_ALIASES = {
  pod_borer: ["pod borer", "gram pod borer", "शेंगा पोखरणारी", "शेंगा पोखरणारा", "फली छेदक"],
  early_blight: ["early blight", "अर्ली ब्लाइट", "अगेती झुलसा", "लवकर करपा", "लवकर करपा"],
  late_blight: ["late blight", "लेट ब्लाइट", "पछेती झुलसा", "उशीरा करपा", "उशिरा करपा"],
  fruit_borer: ["fruit borer", "फ्रूट बोरर", "फल छेदक", "फळ पोखरणारी", "फळ पोखरणारा"],
  shoot_fruit_borer: ["shoot and fruit borer", "shoot fruit borer", "शूट एंड फ्रूट बोरर", "शूट फल छेदक", "शेंडा व फळ पोखरणारी"],
  fall_armyworm: ["fall armyworm", "armyworm", "फॉल आर्मीवर्म", "लष्करी अळी"],
  stem_borer_leaf_folder: ["stem borer", "leaf folder", "stem borer and leaf folder", "तना छेदक", "पान गुंडाळणारी", "खोडकिडा"],
  girdle_beetle: ["girdle beetle", "गर्डल बीटल", "खोड पोखरणारा"],
  aerial_blight: ["aerial blight", "rhizoctonia aerial blight", "एरियल ब्लाइट"],
  blight: ["blight", "झुलसा", "करपा"],
  aphid_jassid: ["aphid", "jassid", "मावा", "तुडतुडे", "जॅसिड"],
  whitefly: ["whitefly", "white fly", "पांढरी माशी", "सफेद मक्खी"],
  leaf_spot: ["leaf spot", "पानावरील डाग", "पत्ती धब्बा"],
  rust: ["rust", "तांबेरा", "रस्ट"],
};

export function detectProblem(text, fallback = "") {
  const q = String(text || "").toLowerCase();
  for (const [problem, aliases] of Object.entries(PROBLEM_ALIASES)) {
    if (aliases.some((a) => q.includes(a.toLowerCase()))) return problem;
  }
  return String(fallback || "").toLowerCase();
}

export function loadFertilizers() {
  return readJson("fertilizers.json").entries || [];
}

export function loadTreatments() {
  return readJson("treatments.json").entries || [];
}

export function findVerifiedProducts({ question = "", crop = "", category = "", disease = "" } = {}) {
  const detectedCrop = detectCrop(question, crop);
  const q = String(question).toLowerCase();
  const detectedProblem = detectProblem(question, disease);
  const fertilizerIntent = /(fertili[sz]er|manure|npk|खत|उर्वरक|खाद|पोषण|nutrient)/i.test(q);
  const pesticideIntent = /(pesticide|fungicide|insecticide|कीटनाशक|कीटकनाशक|बुरशीनाशक|फफूंदनाशक|insect|कीड|कीट|pest)/i.test(q) || Boolean(detectedProblem);

  if (category === "fertilizer" || fertilizerIntent) {
    if (!detectedCrop) return [];
    return loadFertilizers().filter((x) => x.crop === detectedCrop);
  }

  if (category === "pesticide" || pesticideIntent) {
    if (!detectedCrop) return [];
    // An explicitly named problem in the latest question wins over an older scan diagnosis.
    const diseaseKey = detectedProblem;
    return loadTreatments().filter((x) =>
      x.crop === detectedCrop &&
      (!diseaseKey || x.disease === diseaseKey)
    );
  }

  return [];
}
