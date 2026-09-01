const firebase = globalThis.firebase;

let app = null;
let auth = null;
let recaptchaVerifier = null;

function requiredConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  };
}

export function firebaseConfigured() {
  const c = requiredConfig();
  return Boolean(firebase && c.apiKey && c.authDomain && c.projectId && c.appId);
}

export function getFirebaseAuth() {
  if (!firebaseConfigured()) return null;
  if (!app) {
    app = firebase.apps.length ? firebase.app() : firebase.initializeApp(requiredConfig());
    auth = firebase.auth();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  }
  return auth;
}

export function observeAuth(callback) {
  const a = getFirebaseAuth();
  if (!a) return () => {};
  return a.onAuthStateChanged(callback);
}

async function signInWithProvider(provider) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured.");
  try {
    return await a.signInWithPopup(provider);
  } catch (error) {
    // Popup blockers/mobile browsers can prevent popup OAuth. Fall back to the
    // redirect flow; observeAuth() will complete the login after the redirect.
    const code = error?.code || "";
    if (["auth/popup-blocked", "auth/cancelled-popup-request"].includes(code)) {
      await a.signInWithRedirect(provider);
      return null;
    }
    throw error;
  }
}

export async function signInGoogle() {
  return signInWithProvider(new firebase.auth.GoogleAuthProvider());
}

export async function signInFacebook() {
  return signInWithProvider(new firebase.auth.FacebookAuthProvider());
}

export async function signInEmail(email, password) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured.");
  return a.signInWithEmailAndPassword(email.trim(), password);
}

export function getRecaptcha(containerId = "farmora-recaptcha", onSolved = () => {}) {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured.");
  if (!recaptchaVerifier) {
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
      size: "normal",
      callback: () => onSolved(true),
      "expired-callback": () => {
        onSolved(false);
        recaptchaVerifier = null;
      },
      "error-callback": () => onSolved(false),
    });
  }
  return recaptchaVerifier;
}

export async function renderPhoneRecaptcha(containerId, onSolved) {
  const verifier = getRecaptcha(containerId, onSolved);
  if (typeof verifier.render === "function") {
    await verifier.render();
  }
  return verifier;
}

export async function resetPhoneRecaptcha() {
  try {
    if (recaptchaVerifier?.clear) recaptchaVerifier.clear();
  } catch {}
  recaptchaVerifier = null;
}

export async function sendPhoneOtp(phoneNumber, containerId = "farmora-recaptcha") {
  const a = getFirebaseAuth();
  if (!a) throw new Error("Firebase is not configured.");
  const verifier = getRecaptcha(containerId);
  return a.signInWithPhoneNumber(phoneNumber, verifier);
}

export async function logoutFirebase() {
  const a = getFirebaseAuth();
  if (a) await a.signOut();
}

export function firebaseErrorMessage(error, lang = "en") {
  const code = error?.code || "";
  const messages = {
    "auth/popup-closed-by-user": {
      en: "Login was cancelled.",
      hi: "लॉगिन रद्द कर दिया गया।",
      mr: "लॉगिन रद्द केले.",
    },
    "auth/account-exists-with-different-credential": {
      en: "This email already uses another sign-in method. Try that method.",
      hi: "इस ईमेल से दूसरा लॉगिन तरीका जुड़ा है। वही तरीका आज़माएँ।",
      mr: "या ईमेलसाठी दुसरी लॉगिन पद्धत जोडलेली आहे. ती पद्धत वापरा.",
    },
    "auth/invalid-phone-number": {
      en: "Please enter a valid mobile number.",
      hi: "कृपया सही मोबाइल नंबर डालें।",
      mr: "कृपया योग्य मोबाईल नंबर टाका.",
    },
    "auth/too-many-requests": {
      en: "Too many attempts. Please wait and try again later.",
      hi: "बहुत ज्यादा प्रयास हुए हैं। थोड़ी देर बाद फिर कोशिश करें।",
      mr: "खूप प्रयत्न झाले. थोड्या वेळाने पुन्हा प्रयत्न करा.",
    },
    "auth/quota-exceeded": {
      en: "Phone verification quota has been reached. Please try again later.",
      hi: "फोन सत्यापन की सीमा पूरी हो गई है। बाद में फिर कोशिश करें।",
      mr: "फोन पडताळणीची मर्यादा पूर्ण झाली आहे. नंतर पुन्हा प्रयत्न करा.",
    },
    "auth/invalid-credential": {
      en: "Incorrect email or password.",
      hi: "ईमेल या पासवर्ड गलत है।",
      mr: "ईमेल किंवा पासवर्ड चुकीचा आहे.",
    },
    "auth/user-not-found": {
      en: "No account was found with this email.",
      hi: "इस ईमेल से कोई खाता नहीं मिला।",
      mr: "या ईमेलसाठी कोणतेही खाते सापडले नाही.",
    },
    "auth/wrong-password": {
      en: "Incorrect email or password.",
      hi: "ईमेल या पासवर्ड गलत है।",
      mr: "ईमेल किंवा पासवर्ड चुकीचा आहे.",
    },
    "auth/operation-not-allowed": {
      en: "This sign-in method is not enabled in Firebase yet.",
      hi: "यह लॉगिन तरीका अभी Firebase में चालू नहीं है।",
      mr: "ही लॉगिन पद्धत Firebase मध्ये अजून सुरू केलेली नाही.",
    },
  };
  return messages[code]?.[lang] || {
    en: "Login could not be completed. Please try again.",
    hi: "लॉगिन पूरा नहीं हो सका। कृपया फिर कोशिश करें।",
    mr: "लॉगिन पूर्ण होऊ शकले नाही. कृपया पुन्हा प्रयत्न करा.",
  }[lang] || "Login could not be completed. Please try again.";
}
