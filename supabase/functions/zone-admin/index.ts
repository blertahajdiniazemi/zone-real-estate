/* =====================================================================
   ZONE REAL ESTATE — FUNKSIONI I SIGURT (Supabase Edge Function)
   =====================================================================

   E vetmja pjesë e sistemit që e njeh GitHub token-in.

   Rrjedha:
     admin.html  →  JWT i Supabase  →  ky funksion  →  GitHub API

   Ai:
     1. verifikon përdoruesin e kyçur të Supabase (JWT)
     2. verifikon rolin ('admin' ose 'editor') dhe që llogaria është aktive
     3. pranon ndryshimet e pronave / cilësimeve nga admin.html
     4. përdor GITHUB_TOKEN nga variablat e mjedisit — kurrë nga shfletuesi
     5. përditëson listings.js
     6. ngarkon fotot e reja në /images
     7. trajton gabimet dhe konfliktet e GitHub-it qartë
     8. nuk ekspozon asnjë sekret te shfletuesi

   Variablat e mjedisit që duhen (Edge Functions → Secrets):
     GITHUB_TOKEN      — fine-grained PAT, Contents: Read and write
     GITHUB_OWNER      — p.sh. blertahajdiniazemi
     GITHUB_REPO       — p.sh. zone-real-estate
     GITHUB_BRANCH     — opsionale; parazgjedhje: dega kryesore e depos
     ALLOWED_ORIGINS   — lista me presje e adresave që lejohen, p.sh.
                         https://zonerealestate.com,https://blertahajdiniazemi.github.io

   SUPABASE_URL dhe SUPABASE_SERVICE_ROLE_KEY i vendos vetë Supabase.
   ===================================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

/* ------------------------------------------------------------------ */
/* Konfigurimi                                                         */
/* ------------------------------------------------------------------ */

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GITHUB_TOKEN      = Deno.env.get("GITHUB_TOKEN") ?? "";
const GITHUB_OWNER      = Deno.env.get("GITHUB_OWNER") ?? "";
const GITHUB_REPO       = Deno.env.get("GITHUB_REPO") ?? "";
const GITHUB_BRANCH_ENV = Deno.env.get("GITHUB_BRANCH") ?? "";
const ALLOWED_ORIGINS   = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

/** Rolet që lejohen të publikojnë. Kjo listë është burimi i vërtetës. */
const PUBLISH_ROLES = ["admin", "editor"];
/** Rolet që lejohen të hapin panelin fare. */
const PANEL_ROLES   = ["admin", "editor"];

const LISTINGS_PATH   = "listings.js";
const IMAGES_DIR      = "images";
const MAX_LISTINGS_JS = 1_000_000;              // 1 MB
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;        // 3 MB pas zvogëlimit
const IMAGE_NAME_RE   = /^[a-z0-9][a-z0-9._-]{0,80}\.(jpg|jpeg|png|webp)$/;

/* ------------------------------------------------------------------ */
/* Ndihmësa                                                            */
/* ------------------------------------------------------------------ */

class HttpError extends Error {
  status: number;
  /** Kod i lexueshëm nga programi. Frontend-i vendos me të nëse duhet
   *  nxjerrë përdoruesi nga paneli apo vetëm t'i tregohet një mesazh.
   *  "inactive" | "no_profile" | "role" bllokojnë panelin;
   *  "action_role" ndalon vetëm një veprim. */
  code: string;
  constructor(status: number, message: string, code = "") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    ALLOWED_ORIGINS.length === 0 ? "*"
    : (origin && ALLOWED_ORIGINS.includes(origin)) ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ------------------------------------------------------------------ */
/* 1 + 2. Kush po e bën kërkesën, dhe a ka leje?                       */
/* ------------------------------------------------------------------ */

interface Profile {
  id: string;
  email: string;
  role: string;
  active: boolean;
  full_name: string | null;
}

/** Rolet krahasohen gjithmonë të pastruara. Një rol i ruajtur si
 *  "Admin", "ADMIN" ose "editor " në bazën e të dhënave është i njëjti
 *  rol — më parë çdo ndryshim i vogël bllokonte një përdorues të vlefshëm. */
function normRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

/** Vetëm `false` e qartë do të thotë i çaktivizuar. Nëse kolona mungon
 *  ose është NULL (profile të vjetra), llogaria trajtohet si aktive. */
function isActive(profile: { active?: unknown }): boolean {
  return profile.active !== false;
}

async function authenticate(req: Request): Promise<Profile> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Nuk jeni i kyçur.", "expired");

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError(401, "Sesioni ka skaduar. Kyçuni sërish.", "expired");
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, email, role, active, full_name")
    .eq("id", data.user.id)
    .maybeSingle();

  if (pErr) {
    console.error("profiles read failed:", pErr.message);
    throw new HttpError(500, "Gabim nga serveri. Provoni sërish pas pak.");
  }
  if (!profile) {
    throw new HttpError(403,
      "Llogaria juaj nuk ka profil. Kontaktoni një administrator.", "no_profile");
  }
  if (!isActive(profile)) {
    throw new HttpError(403, "Përdorues joaktiv. Kontaktoni administratorin.", "inactive");
  }

  /* Roli kthehet i normalizuar, që të gjitha kontrollet më poshtë të
     punojnë mbi të njëjtën formë. */
  return {
    ...(profile as Profile),
    role: normRole(profile.role),
    email: profile.email ?? data.user.email ?? "",
  };
}

/** Kontroll roli për një veprim të vetëm. Nuk e mbyll panelin. */
function requireRole(profile: Profile, allowed: string[]): void {
  if (!allowed.map(normRole).includes(normRole(profile.role))) {
    throw new HttpError(403, "Roli juaj nuk lejon këtë veprim.", "action_role");
  }
}

/** Kontroll roli për hapjen e vetë panelit. Ky e mbyll panelin. */
function requirePanelRole(profile: Profile): void {
  if (!PANEL_ROLES.map(normRole).includes(normRole(profile.role))) {
    throw new HttpError(403, "Roli juaj nuk lejon qasje në këtë panel.", "role");
  }
}

async function audit(profile: Profile, action: string, detail: unknown): Promise<void> {
  try {
    await admin.from("activity_log").insert({
      user_id: profile.id,
      user_email: profile.email,
      action,
      detail: detail ?? {},
    });
  } catch (_) {
    /* regjistri nuk duhet ta bllokojë kurrë publikimin */
  }
}

/* ------------------------------------------------------------------ */
/* GitHub — vetëm serveri e prek                                       */
/* ------------------------------------------------------------------ */

let cachedBranch = "";

async function gh(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "zone-real-estate-admin",
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }

  if (!res.ok) {
    // 7. Gabimet e GitHub-it përkthehen në mesazhe që punonjësi i kupton.
    let m = body?.message || `Gabim GitHub (${res.status}).`;
    if (res.status === 401) m = "Tokeni i GitHub-it është i pavlefshëm ose ka skaduar. Njoftoni administratorin.";
    if (res.status === 403 && /rate limit/i.test(String(body?.message))) {
      m = "GitHub e kufizoi përkohësisht qasjen. Provoni pas disa minutash.";
    } else if (res.status === 403) {
      m = "Tokenit të GitHub-it i mungon leja «Contents: Read and write».";
    }
    if (res.status === 404) m = "Depoja ose skedari nuk u gjet. Kontrolloni GITHUB_OWNER dhe GITHUB_REPO.";
    if (res.status === 409) m = "Konflikt — dikush e ndryshoi skedarin ndërkohë. Ringarkoni dhe provoni sërish.";
    if (res.status === 422) m = "GitHub e refuzoi ndryshimin (mospërputhje versioni). Ringarkoni dhe provoni sërish.";
    if (res.status >= 500) m = "GitHub nuk po përgjigjet. Provoni pas disa minutash.";
    throw new HttpError(res.status === 404 ? 502 : (res.status === 409 || res.status === 422) ? 409 : 502, m);
  }
  return body;
}

async function resolveBranch(): Promise<string> {
  if (GITHUB_BRANCH_ENV) return GITHUB_BRANCH_ENV;
  if (cachedBranch) return cachedBranch;
  const info = await gh("");
  cachedBranch = info?.default_branch || "main";
  return cachedBranch;
}

/** Kthen { content, sha } ose null nëse skedari nuk ekziston. */
async function getFile(path: string, branch: string): Promise<{ content: string; sha: string } | null> {
  try {
    const file = await gh(`/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`);
    const bin = atob(String(file.content || "").replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { content: new TextDecoder("utf-8").decode(bytes), sha: file.sha };
  } catch (e) {
    if (e instanceof HttpError && /nuk u gjet/i.test(e.message)) return null;
    throw e;
  }
}

/** Vetëm sha-ja, pa e shkarkuar përmbajtjen. */
async function getSha(path: string, branch: string): Promise<string | null> {
  try {
    const file = await gh(`/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`);
    return file?.sha ?? null;
  } catch (e) {
    if (e instanceof HttpError && /nuk u gjet/i.test(e.message)) return null;
    throw e;
  }
}

async function putFile(
  path: string, contentB64: string, message: string, branch: string, sha: string | null,
): Promise<any> {
  const body: Record<string, unknown> = { message, content: contentB64, branch };
  if (sha) body.sha = sha;
  return await gh(`/contents/${encodeURI(path)}`, { method: "PUT", body: JSON.stringify(body) });
}

function utf8ToB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/* ------------------------------------------------------------------ */
/* Veprimet                                                            */
/* ------------------------------------------------------------------ */

/** Kush jam unë? Frontend-i e përdor për të shfaqur email-in dhe rolin. */
function actionMe(profile: Profile) {
  requirePanelRole(profile);
  return {
    profile: {
      email: profile.email,
      full_name: profile.full_name,
      role: normRole(profile.role),
      active: isActive(profile),
      canPublish: PUBLISH_ROLES.includes(normRole(profile.role)),
    },
  };
}

/** 5a. Lexo listings.js aktual bashkë me sha-në për kontrollin e konfliktit. */
async function actionLoad(profile: Profile) {
  requirePanelRole(profile);
  const branch = await resolveBranch();
  const file = await getFile(LISTINGS_PATH, branch);
  if (!file) throw new HttpError(502, "listings.js nuk u gjet në depo.");
  return { branch, sha: file.sha, content: file.content };
}

/** 6. Ngarko një foto të re në /images. */
async function actionUploadImage(profile: Profile, payload: any) {
  requireRole(profile, PUBLISH_ROLES);

  const name = String(payload?.name ?? "");
  const b64  = String(payload?.contentBase64 ?? "").replace(/\s/g, "");

  if (!IMAGE_NAME_RE.test(name)) {
    throw new HttpError(400, "Emri i fotos nuk lejohet. Përdorni vetëm shkronja latine, shifra, - dhe _.");
  }
  if (!b64) throw new HttpError(400, "Fotoja erdhi bosh.");

  const approxBytes = Math.floor(b64.length * 3 / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new HttpError(413, "Fotoja është shumë e madhe (mbi 3 MB).");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    throw new HttpError(400, "Fotoja nuk u lexua dot.");
  }

  const branch = await resolveBranch();
  const path = `${IMAGES_DIR}/${name}`;
  const existingSha = await getSha(path, branch);   // lejon rifillimin pas një dështimi

  const res = await putFile(path, b64, `Shto foton ${name}`, branch, existingSha);
  await audit(profile, "upload_image", { path, bytes: approxBytes, branch });

  return { path, sha: res?.content?.sha ?? null };
}

/** 5b. Shkruaj listings.js. Kontrollon konfliktin para se të prekë GitHub-in. */
async function actionPublishListings(profile: Profile, payload: any) {
  requireRole(profile, PUBLISH_ROLES);

  const content = String(payload?.content ?? "");
  const baseSha = payload?.baseSha ? String(payload.baseSha) : null;
  const count   = Number(payload?.listingCount ?? 0);

  if (!content) throw new HttpError(400, "Përmbajtja erdhi bosh.");
  if (content.length > MAX_LISTINGS_JS) throw new HttpError(413, "listings.js është shumë i madh.");
  if (!content.includes("window.ZONE_CONFIG")) {
    throw new HttpError(400, "listings.js nuk duket i vlefshëm — asgjë nuk u dërgua.");
  }

  const branch = await resolveBranch();
  const currentSha = await getSha(LISTINGS_PATH, branch);

  // 7. Konflikti kapet këtu, para shkrimit, me mesazh të qartë.
  if (baseSha && currentSha && baseSha !== currentSha) {
    throw new HttpError(409,
      "Konflikt — dikush tjetër e publikoi ndërkohë. Klikoni «Ringarko» dhe provoni sërish.");
  }

  const message = `Përditëso pronat (${count || "?"}) — ${profile.email}`;
  const res = await putFile(LISTINGS_PATH, utf8ToB64(content), message, branch, currentSha);

  await audit(profile, "publish_listings", {
    branch,
    listingCount: count,
    commit: res?.commit?.sha ?? null,
  });

  return {
    sha: res?.content?.sha ?? null,
    commit: res?.commit?.sha ?? null,
    branch,
  };
}

/* ------------------------------------------------------------------ */
/* Veprime vetëm për ADMIN                                             */
/* Skeleti është gati; UI-ja në admin.html mund të shtohet më vonë.    */
/* ------------------------------------------------------------------ */

/** Lista e punonjësve. */
async function actionAdminListUsers(profile: Profile) {
  requireRole(profile, ["admin"]);
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, role, active, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new HttpError(500, "Lista e punonjësve nuk u lexua dot.");
  return { users: data };
}

/** Ndrysho rolin e një punonjësi. */
async function actionAdminSetRole(profile: Profile, payload: any) {
  requireRole(profile, ["admin"]);
  const userId = String(payload?.userId ?? "");
  const role   = String(payload?.role ?? "");

  if (!userId) throw new HttpError(400, "Mungon punonjësi.");
  if (!["admin", "editor"].includes(role)) throw new HttpError(400, "Roli duhet 'admin' ose 'editor'.");
  if (userId === profile.id) throw new HttpError(400, "Nuk mund ta ndryshoni rolin tuaj.");

  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new HttpError(500, "Roli nuk u ndryshua dot.");

  await audit(profile, "set_role", { userId, role });
  return { ok: true };
}

/** Aktivizo / çaktivizo një punonjës. Çaktivizimi e bllokon menjëherë kyçjen. */
async function actionAdminSetActive(profile: Profile, payload: any) {
  requireRole(profile, ["admin"]);
  const userId = String(payload?.userId ?? "");
  const active = payload?.active === true;

  if (!userId) throw new HttpError(400, "Mungon punonjësi.");
  if (userId === profile.id) throw new HttpError(400, "Nuk mund ta çaktivizoni veten.");

  const { error } = await admin.from("profiles").update({ active }).eq("id", userId);
  if (error) throw new HttpError(500, "Statusi nuk u ndryshua dot.");

  // Bllokon edhe kyçjen te Supabase Auth, jo vetëm panelin.
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",   // ~100 vjet
  });

  await audit(profile, active ? "enable_user" : "disable_user", { userId });
  return { ok: true };
}

/** Regjistri i veprimeve. */
async function actionAdminActivityLog(profile: Profile, payload: any) {
  requireRole(profile, ["admin"]);
  const limit = Math.min(Math.max(Number(payload?.limit ?? 100), 1), 500);
  const { data, error } = await admin
    .from("activity_log")
    .select("id, user_email, action, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new HttpError(500, "Regjistri nuk u lexua dot.");
  return { entries: data };
}

/* ------------------------------------------------------------------ */
/* Hyrja                                                               */
/* ------------------------------------------------------------------ */

const HANDLERS: Record<string, (p: Profile, payload: any) => Promise<any> | any> = {
  "me":                   (p)    => actionMe(p),
  "load":                 (p)    => actionLoad(p),
  "upload_image":         (p, x) => actionUploadImage(p, x),
  "publish_listings":     (p, x) => actionPublishListings(p, x),
  "admin_list_users":     (p)    => actionAdminListUsers(p),
  "admin_set_role":       (p, x) => actionAdminSetRole(p, x),
  "admin_set_active":     (p, x) => actionAdminSetActive(p, x),
  "admin_activity_log":   (p, x) => actionAdminActivityLog(p, x),
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Vetëm POST lejohet." }, 405, origin);
  }

  // Refuzo adresat e panjohura kur lista është e konfiguruar.
  if (ALLOWED_ORIGINS.length > 0 && origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: "Kjo adresë nuk lejohet." }, 403, origin);
  }

  for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE_KEY, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO })) {
    if (!v) {
      console.error(`Missing environment variable: ${k}`);
      return json({ error: "Serveri nuk është konfiguruar plotësisht. Njoftoni administratorin." }, 500, origin);
    }
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action ?? "");

    const handler = HANDLERS[action];
    if (!handler) return json({ error: "Veprim i panjohur." }, 400, origin);

    const profile = await authenticate(req);      // 1 + 2
    const result = await handler(profile, payload);
    return json(result ?? { ok: true }, 200, origin);

  } catch (e) {
    if (e instanceof HttpError) {
      return json({ error: e.message, code: e.code }, e.status, origin);
    }
    // Asnjë detaj i brendshëm nuk shkon te shfletuesi.
    console.error("Unhandled error:", e);
    return json({ error: "Gabim i papritur në server." }, 500, origin);
  }
});
