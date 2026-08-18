/* =====================================================================
   SHTRESA DEMONSTRUESE
   =====================================================================

   Ky skedar përdoret VETËM nga admin-preview.html.
   Ai nuk ngarkohet kurrë nga admin.html i vërtetë.

   Detyra e tij është një e vetme: të zërë vendin e serverit, që paneli
   të mund të shihet pa Supabase dhe pa GitHub.

   Çka është e vërtetë në pamjen demonstruese:
     · i gjithë CSS-i
     · modeli, validimi, gjendja, numërimi i ndryshimeve
     · të gjitha pamjet dhe formularët
     · auth.js — mesazhet, rolet, trajtimi i sesionit
     · pronat: lexohen nga listings.js i prodhimit

   Çka është e rreme:
     · përgjigjet e serverit (këtu poshtë)
     · lista e përdoruesve dhe regjistri i aktivitetit
     · publikimi — nuk shkruan asgjë askund

   Prandaj: ndryshimet këtu nuk ruhen. Rifreskimi i faqes i kthen të
   gjitha në gjendjen fillestare.
   ===================================================================== */

"use strict";

/* Konfigurimi publik — vlera demonstruese, asnjë sekret. */
window.ZONE_ADMIN_CONFIG = {
  SUPABASE_URL: "https://demo.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_demo",
  FUNCTION_URL: "https://demo.supabase.co/functions/v1/zone-admin",
  SITE_BASE: "",
  SITE_URL: "https://realestate.zonegroup-ks.com",
  RESET_PATH: "reset-password.html",
  PUBLISH_ROLES: ["admin", "editor"]
};

/* ------------------------------------------------------------------ */
/* Pronat — të njëjtat që ka faqja live                                */
/* ------------------------------------------------------------------ */

const DEMO_LISTINGS_JS = "__LISTINGS_JS__";   /* zëvendësohet nga build-preview.py */

/* ------------------------------------------------------------------ */
/* Profili                                                             */
/* ------------------------------------------------------------------ */

/* Roli mund të ndërrohet nga adresa e faqes: ?role=editor
   Kështu shihet edhe se çfarë NUK i shfaqet një redaktori. */
const DEMO_ROLE =
  new URLSearchParams(location.search).get("role") === "editor" ? "editor" : "admin";

const DEMO_PROFILE = {
  email: DEMO_ROLE === "admin" ? "administrator@zonegroup-ks.com" : "redaktor@zonegroup-ks.com",
  full_name: DEMO_ROLE === "admin" ? "Arben Krasniqi" : "Elira Gashi",
  role: DEMO_ROLE,
  active: true,
  canPublish: true
};

/* ------------------------------------------------------------------ */
/* Klienti i rremë i Supabase-it                                       */
/*                                                                     */
/* auth.js i vërtetë e thërret këtë përmes makeClient(). Forma e        */
/* përgjigjeve është ajo e Supabase-it, që auth.js të mos dallojë.      */
/* ------------------------------------------------------------------ */

let demoSession = null;

function createClient() {
  return {
    auth: {
      async getSession() {
        return { data: { session: demoSession }, error: null };
      },
      async signInWithPassword({ email }) {
        await wait(450);
        demoSession = {
          access_token: "demo-token",
          user: { email: email || DEMO_PROFILE.email }
        };
        return { data: { session: demoSession }, error: null };
      },
      async signOut() {
        demoSession = null;
        return { error: null };
      },
      async resetPasswordForEmail() {
        await wait(600);
        return { data: {}, error: null };
      },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      }
    }
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Përdoruesit dhe regjistri — të dhëna të shpikura për pamjen          */
/*                                                                     */
/* Në panelin e vërtetë këto vijnë nga tabelat `profiles` dhe           */
/* `activity_log`. Këtu janë të rreme sepse nuk ka server.              */
/* ------------------------------------------------------------------ */

const DEMO_USERS = [
  { id: "u1", email: "administrator@zonegroup-ks.com", full_name: "Arben Krasniqi",
    role: "admin", active: true, created_at: "2025-02-14T09:12:00Z" },
  { id: "u2", email: "redaktor@zonegroup-ks.com", full_name: "Elira Gashi",
    role: "editor", active: true, created_at: "2025-05-03T11:40:00Z" },
  { id: "u3", email: "agjent@zonegroup-ks.com", full_name: "Blerim Rexhepi",
    role: "editor", active: true, created_at: "2025-09-21T14:05:00Z" },
  { id: "u4", email: "praktikant@zonegroup-ks.com", full_name: "Rina Berisha",
    role: "editor", active: false, created_at: "2026-01-08T08:30:00Z" }
];

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();

const DEMO_ACTIVITY = [
  { id: 1, user_email: "administrator@zonegroup-ks.com", action: "publish_listings",
    detail: { listingCount: 6, branch: "main", commit: "a1f9c33e" }, created_at: hoursAgo(3) },
  { id: 2, user_email: "administrator@zonegroup-ks.com", action: "upload_image",
    detail: { path: "images/vile-matican-8k2x1.jpg" }, created_at: hoursAgo(3.1) },
  { id: 3, user_email: "administrator@zonegroup-ks.com", action: "upload_image",
    detail: { path: "images/vile-matican-8k2x2.jpg" }, created_at: hoursAgo(3.2) },
  { id: 4, user_email: "redaktor@zonegroup-ks.com", action: "login",
    detail: {}, created_at: hoursAgo(6) },
  { id: 5, user_email: "administrator@zonegroup-ks.com", action: "disable_user",
    detail: { userId: "u4" }, created_at: hoursAgo(26) },
  { id: 6, user_email: "administrator@zonegroup-ks.com", action: "set_role",
    detail: { userId: "u3", role: "editor" }, created_at: hoursAgo(52) },
  { id: 7, user_email: "redaktor@zonegroup-ks.com", action: "publish_listings",
    detail: { listingCount: 5, branch: "main", commit: "7d2b0091" }, created_at: hoursAgo(74) },
  { id: 8, user_email: "administrator@zonegroup-ks.com", action: "enable_user",
    detail: { userId: "u2" }, created_at: hoursAgo(120) }
];

/* ------------------------------------------------------------------ */
/* API e rreme                                                         */
/*                                                                     */
/* E njëjta ndërfaqe si admin/core/api.js, që app.js të mos dallojë.    */
/* ------------------------------------------------------------------ */

const PANEL_DENY_CODES = ["inactive", "no_profile", "role"];

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status || 0;
    this.code = code || "";
  }
  get isPanelDenial() { return this.status === 403 && PANEL_DENY_CODES.includes(this.code); }
  get isExpired() { return this.status === 401; }
  get isConflict() { return this.status === 409; }
  get isOffline() { return false; }
}

/* Sha-ja ndryshon pas çdo publikimi, njësoj si te GitHub. */
let demoSha = "3f8a1c9d2e5b7a04";

function createApi() {
  const guardAdmin = () => {
    if (DEMO_PROFILE.role !== "admin") {
      throw new ApiError("Nuk keni leje për këtë veprim.", 403, "forbidden");
    }
  };

  return {
    async getProfile() {
      await wait(280);
      return { profile: DEMO_PROFILE };
    },

    async getListings() {
      await wait(420);
      return { branch: "main", sha: demoSha, content: DEMO_LISTINGS_JS };
    },

    async publishListings() {
      /* Vonesa imiton ngarkimin e vërtetë te GitHub, që hapat e
         publikimit të mund të shihen duke ecur. */
      await wait(900);
      demoSha = Math.random().toString(16).slice(2, 18);
      return { sha: demoSha, commit: Math.random().toString(16).slice(2, 10), branch: "main" };
    },

    async uploadImage() {
      await wait(550);
      return { ok: true };
    },

    async listUsers() {
      await wait(380);
      guardAdmin();
      return { users: DEMO_USERS };
    },

    async setUserRole(userId, role) {
      await wait(400);
      guardAdmin();
      const user = DEMO_USERS.find((u) => u.id === userId);
      if (user) user.role = role;
      return { ok: true };
    },

    async setUserActive(userId, active) {
      await wait(400);
      guardAdmin();
      const user = DEMO_USERS.find((u) => u.id === userId);
      if (user) user.active = active;
      return { ok: true };
    },

    async getActivityLog(limit) {
      await wait(320);
      guardAdmin();
      return { entries: DEMO_ACTIVITY.slice(0, limit || 100) };
    }
  };
}

/* Hapësira e emrave që pret app.js — e njëjta formë si core/api.js. */
const __api = { createApi, PANEL_DENY_CODES, ApiError };

/* ------------------------------------------------------------------ */
/* Shiriti njoftues                                                    */
/* ------------------------------------------------------------------ */

window.addEventListener("DOMContentLoaded", () => {
  const note = document.createElement("p");
  note.style.cssText =
    "margin:var(--sp-4) 0 0;padding:var(--sp-3) var(--sp-4);border-radius:var(--r-md);" +
    "background:var(--info-soft);color:var(--info);font-size:var(--fs-xs);line-height:1.5";
  note.innerHTML =
    "<b>Pamje demonstruese.</b> Kredencialet janë të parambushura — shtypni <b>Kyçu</b>. " +
    "Pronat janë ato reale të faqes; përdoruesit dhe regjistri janë shembuj. " +
    "Asgjë nuk ruhet dhe asgjë nuk publikohet.";

  const box = document.querySelector("#screen-login .auth-box");
  if (box) box.appendChild(note);

  const email = document.getElementById("email");
  const pass = document.getElementById("password");
  if (email) email.value = DEMO_PROFILE.email;
  if (pass) pass.value = "demo1234";
});
