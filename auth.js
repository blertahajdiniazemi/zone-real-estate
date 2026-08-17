/* =====================================================================
   ZONE REAL ESTATE — MODULI I PËRBASHKËT I AUTENTIKIMIT
   =====================================================================

   Një vend i vetëm për:
     - krijimin e klientit Supabase (version i fiksuar, jo "latest")
     - ruajtjen e sesionit që nuk prishet në Safari privat
     - përkthimin e gabimeve teknike në shqip
     - adresën e saktë të rivendosjes së fjalëkalimit

   Ky skedar është PUBLIK. Këtu ka vetëm URL-në e projektit dhe çelësin
   publik "anon". Asnjë sekret. Asnjë "service_role". Asnjë token.

   Përdoret nga:  admin.html  dhe  reset-password.html
   ===================================================================== */

/* Versioni është i FIKSUAR me qëllim.
   Me "@2" shfletuesi merrte versionin më të fundit sa herë ngarkohej
   faqja — dhe një ndryshim i vogël te CDN-ja bënte që kyçja të dështonte
   herë pas here pa asnjë mesazh. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

/* Lexohet me vonesë, jo një herë kur ngarkohet moduli. Kështu renditja
   e <script>-eve nuk mund ta lërë kurrë konfigurimin bosh. */
export const CFG = new Proxy({}, {
  get: (_t, key) => (window.ZONE_ADMIN_CONFIG || {})[key],
  has: (_t, key) => key in (window.ZONE_ADMIN_CONFIG || {})
});

/* ------------------------------------------------------------------ */
/* Ruajtja e sesionit                                                  */
/* ------------------------------------------------------------------ */

/* Në Safari privat, ose kur cookies/storage janë të bllokuara,
   localStorage hedh gabim kur shkruan. Pa këtë mbrojtje, kyçja dukej se
   dështonte pa arsye. Këtu biem te një ruajtje në memorie: sesioni punon
   për sa është hapur skeda, dhe përdoruesi njoftohet. */
let storagePersistent = true;

function safeStorage() {
  try {
    const probe = "__zone_storage_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (_) {
    storagePersistent = false;
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); }
    };
  }
}

export function storageIsPersistent() { return storagePersistent; }

/* ------------------------------------------------------------------ */
/* Klienti                                                             */
/* ------------------------------------------------------------------ */

export const ADMIN_STORAGE_KEY    = "zone-admin-auth";
/* Faqja e rivendosjes përdor një çelës TJETËR ruajtjeje me qëllim:
   një sesion "recovery" nuk duhet të hapë kurrë panelin e administrimit. */
export const RECOVERY_STORAGE_KEY = "zone-recovery-auth";

export function makeClient({ storageKey, detectSessionInUrl }) {
  return createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: {
      /* "implicit" me qëllim: linku i rivendosjes duhet të funksionojë
         edhe kur emaili hapet në një pajisje TJETËR nga ajo ku u kërkua.
         PKCE do ta kërkonte "code_verifier" në të njëjtin shfletues. */
      flowType: "implicit",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !!detectSessionInUrl,
      storageKey,
      storage: safeStorage()
    }
  });
}

/* ------------------------------------------------------------------ */
/* Adresa e rivendosjes së fjalëkalimit                                */
/* ------------------------------------------------------------------ */

/* Kthen adresën e plotë të faqes reset-password.html në të njëjtën
   dosje ku ndodhet faqja aktuale. Punon në domenin e prodhimit, në
   github.io dhe në localhost pa asnjë ndryshim kodi. */
export function resetRedirectUrl() {
  const path = CFG.RESET_PATH || "reset-password.html";

  if (location.protocol === "http:" || location.protocol === "https:") {
    const dir = location.pathname.replace(/[^/]*$/, "");
    return location.origin + dir + path;
  }
  /* Hapur si skedar lokal (file://) — biem te adresa e prodhimit. */
  const site = String(CFG.SITE_URL || "").replace(/\/+$/, "");
  return site ? site + "/" + path : "";
}

/* ------------------------------------------------------------------ */
/* Njohja e llojit të gabimit                                          */
/* ------------------------------------------------------------------ */

function textOf(error) {
  if (!error) return "";
  return String(error.message || error.error_description || error.error || "").toLowerCase();
}
function codeOf(error) {
  if (!error) return "";
  return String(error.code || error.error_code || "").toLowerCase();
}

export function isNetworkError(error) {
  if (!error) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error.name === "AuthRetryableFetchError") return true;
  if (error.name === "TypeError" && /fetch/i.test(String(error.message))) return true;
  if (error.name === "AbortError" || error.name === "ZoneTimeoutError") return true;
  const t = textOf(error);
  return t.includes("failed to fetch") || t.includes("networkerror") ||
         t.includes("network request failed") || t.includes("load failed") ||
         t.includes("nuk po përgjigjet");
}

export function isServerError(error) {
  if (!error) return false;
  const s = Number(error.status || 0);
  return s >= 500 && s <= 599;
}

/* ------------------------------------------------------------------ */
/* Mesazhet — vetëm shqip, kurrë teksti i papërpunuar i Supabase-it     */
/* ------------------------------------------------------------------ */

export const MSG = {
  wrongCredentials: "Email ose fjalëkalim i gabuar.",
  inactive:         "Përdorues joaktiv. Kontaktoni administratorin.",
  expired:          "Sesioni ka skaduar. Kyçuni sërish.",
  network:          "Problem me internetin. Kontrolloni lidhjen dhe provoni sërish.",
  server:           "Gabim nga serveri. Provoni sërish pas pak.",
  generic:          "Ndodhi një gabim. Ju lutemi provoni përsëri.",
  linkInvalid:      "Linku për rivendosjen e fjalëkalimit ka skaduar ose nuk është valid.",
  mismatch:         "Fjalëkalimet nuk përputhen.",
  changed:          "Fjalëkalimi u ndryshua me sukses.",
  tooMany:          "Shumë përpjekje. Prisni disa minuta dhe provoni sërish.",
  notConfirmed:     "Email-i nuk është konfirmuar ende. Kontrolloni kutinë postare.",
  weak:             "Fjalëkalimi është shumë i dobët. Zgjidhni një më të gjatë dhe më të përzier.",
  samePassword:     "Fjalëkalimi i ri duhet të jetë i ndryshëm nga i vjetri.",
  emailNotSent:     "Emaili nuk u dërgua dot për arsye teknike. Njoftoni administratorin."
};

/* Çdo gabim që del te përdoruesi kalon nga këtu. */
export function authMessage(error, fallback) {
  if (!error) return fallback || MSG.generic;

  const code = codeOf(error);
  const t    = textOf(error);
  const st   = Number(error.status || 0);

  if (isNetworkError(error)) return MSG.network;

  if (code === "invalid_credentials" || t.includes("invalid login credentials") ||
      t.includes("invalid email or password")) return MSG.wrongCredentials;

  if (code === "user_banned" || code === "user_disabled" || t.includes("banned") ||
      t.includes("user is disabled")) return MSG.inactive;

  if (code === "email_not_confirmed" || t.includes("email not confirmed")) return MSG.notConfirmed;

  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" ||
      st === 429 || t.includes("rate limit") || t.includes("too many requests") ||
      t.includes("for security purposes")) return MSG.tooMany;

  if (code === "otp_expired" || code === "session_expired" || code === "refresh_token_not_found" ||
      code === "refresh_token_already_used" || t.includes("token has expired") ||
      t.includes("invalid refresh token") || t.includes("refresh token not found") ||
      t.includes("session from session_id claim in jwt does not exist")) return MSG.expired;

  /* Ky kontroll duhet PARA atij të fjalëkalimit të dobët: mesazhi i
     Supabase-it "New password should be different from the old password"
     përmban "password should be" dhe përndryshe kapej si "i dobët". */
  if (code === "same_password" || t.includes("different from the old password"))
    return MSG.samePassword;

  if (code === "weak_password" || t.includes("password should be") ||
      t.includes("password is too weak")) return MSG.weak;

  if (code === "error_sending_recovery_email" || code === "error_sending_email" ||
      t.includes("error sending recovery email") || t.includes("error sending confirmation"))
    return MSG.emailNotSent;

  if (st === 401 || st === 403) return MSG.expired;
  if (isServerError(error)) return MSG.server;

  return fallback || MSG.generic;
}

/* ------------------------------------------------------------------ */
/* Ndihmësa                                                            */
/* ------------------------------------------------------------------ */

/* Asnjë kërkesë nuk lejohet të varet përgjithmonë. Pa këtë, një lidhje
   e ngecur e linte faqen te rrotullimi "Duke kontrolluar sesionin…"
   dhe përdoruesi mendonte se kyçja nuk punon fare. */
export function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error("Serveri nuk po përgjigjet.");
      e.name = "ZoneTimeoutError";
      reject(e);
    }, ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

/* Nxjerr sesionin pa e ngatërruar "s'ka sesion" me "s'ka internet".
   Kjo ndarje është arsyeja pse përdoruesit nuk nxirren më jashtë kur
   interneti bie për pak sekonda. */
export async function getSessionSafe(client, ms = 15000) {
  try {
    const { data, error } = await withTimeout(client.auth.getSession(), ms);
    if (error) {
      return { session: null, offline: isNetworkError(error), error };
    }
    return { session: (data && data.session) || null, offline: false, error: null };
  } catch (e) {
    return { session: null, offline: true, error: e };
  }
}

/* Dalja nuk duhet të dështojë kurrë. Nëse tokeni tashmë ka skaduar,
   serveri përgjigjet me gabim — por lokalisht duhet pastruar gjithsesi. */
export async function signOutSafe(client, scope = "local") {
  try {
    await withTimeout(client.auth.signOut({ scope }), 8000);
  } catch (_) {
    try { await client.auth.signOut({ scope: "local" }); } catch (_) { /* s'ka rëndësi */ }
  }
}

/* Rolet krahasohen gjithmonë të pastruara. Një rol i shkruar "Admin"
   ose "editor " në bazën e të dhënave nuk duhet ta bllokojë njeriun. */
export function normRole(role) {
  return String(role == null ? "" : role).trim().toLowerCase();
}

/* Vetëm "false" e qartë do të thotë i çaktivizuar. Nëse fusha mungon
   ose është NULL, llogaria trajtohet si aktive — përndryshe çdo profil
   i vjetër pa këtë fushë do të kyçej jashtë padrejtësisht. */
export function isActive(profile) {
  return !(profile && profile.active === false);
}

/* Parametrat e linkut vijnë herë te "#" e herë te "?", varësisht nga
   shablloni i emailit në Supabase. Lexohen të dyja. */
export function linkParams() {
  const hash  = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
  const query = new URLSearchParams(location.search || "");
  const get = (k) => hash.get(k) || query.get(k) || "";
  return {
    type:        get("type"),
    tokenHash:   get("token_hash"),
    code:        get("code"),
    accessToken: get("access_token"),
    error:       get("error"),
    errorCode:   get("error_code"),
    has(k) { return !!get(k); }
  };
}

/* A duket kjo adresë si ardhje nga një link rivendosjeje? */
export function looksLikeRecoveryLink(p) {
  const q = p || linkParams();
  return q.type === "recovery" || !!q.tokenHash || !!q.code ||
         !!q.accessToken || !!q.error || !!q.errorCode;
}

/* Heq tokenët nga shiriti i adresës sapo të përdoren. */
export function scrubUrl() {
  try {
    history.replaceState(null, "", location.pathname);
  } catch (_) { /* s'ka rëndësi */ }
}
