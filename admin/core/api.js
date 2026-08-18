/* =====================================================================
   API — pika e vetme e komunikimit me serverin
   =====================================================================

   Çdo kërkesë kalon nga këtu, që tokeni, koha e pritjes, përkthimi i
   gabimeve dhe trajtimi i sesionit të skaduar të shkruhen një herë të
   vetme.

   E RËNDËSISHME
   Shfletuesi dërgon VETËM tokenin e Supabase-it. Tokeni i GitHub-it
   rri te funksioni serverik dhe nuk kalon kurrë këtej.

   Veprimet janë ato që funksioni ekzistues i mbështet tashmë:
     me · load · upload_image · publish_listings
     admin_list_users · admin_set_role · admin_set_active
     admin_activity_log
   ===================================================================== */

"use strict";

import {
  CFG, MSG, isNetworkError, withTimeout, getSessionSafe
} from "../../auth.js";

const TIMEOUT_MS = 30000;
/* Ngarkimi i fotove pret më gjatë: një foto e madhe në një lidhje të
   ngadaltë e kalon lehtë kufirin e 30 sekondave. */
const UPLOAD_TIMEOUT_MS = 60000;

/** Kodet 403 që do të thonë vërtet "kjo llogari nuk e hap panelin".
 *  Çdo 403 tjetër ndalon një veprim, jo qasjen. */
export const PANEL_DENY_CODES = ["inactive", "no_profile", "role"];

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status || 0;
    this.code = code || "";
  }
  /** A duhet mbyllur paneli për shkak të këtij gabimi? */
  get isPanelDenial() {
    return this.status === 403 && PANEL_DENY_CODES.includes(this.code);
  }
  get isExpired() { return this.status === 401 || this.code === "expired"; }
  get isConflict() { return this.status === 409; }
  get isOffline() { return this.code === "offline" || this.code === "network"; }
}

/* ------------------------------------------------------------------ */
/* Krijimi                                                             */
/* ------------------------------------------------------------------ */

/**
 * @param {object} supabase        klienti i krijuar te auth.js
 * @param {object} hooks
 * @param {Function} hooks.onExpired  thirret kur sesioni ka rënë
 * @param {Function} hooks.onDenied   thirret kur llogaria s'e hap panelin
 */
export function createApi(supabase, hooks = {}) {
  const onExpired = hooks.onExpired || (() => {});
  const onDenied = hooks.onDenied || (() => {});

  async function call(action, payload, options = {}) {
    /* Dështimi i rinovimit të tokenit për shkak të internetit NUK është
       skadim sesioni. Përdoruesi nuk duhet nxjerrë jashtë për këtë. */
    const { session, offline } = await getSessionSafe(supabase);
    if (offline) throw new ApiError(MSG.network, 0, "offline");
    if (!session) {
      await onExpired();
      throw new ApiError(MSG.expired, 401, "expired");
    }

    let res;
    try {
      res = await withTimeout(fetch(CFG.FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + session.access_token,
          "apikey": CFG.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action, ...(payload || {}) })
      }), options.timeout || TIMEOUT_MS);
    } catch (e) {
      throw new ApiError(isNetworkError(e) ? MSG.network : MSG.server, 0, "network");
    }

    const text = await res.text().catch(() => "");
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { /* jo JSON */ }

    if (!res.ok) {
      const code = (body && body.code) || "";
      /* Funksioni ynë përgjigjet gjithmonë shqip. Nëse përgjigjja vjen
         nga diku tjetër (p.sh. platforma e ndaloi kërkesën para
         funksionit), teksti i saj nuk i tregohet përdoruesit. */
      const message = (body && body.error) ||
        (res.status === 401 ? MSG.expired : res.status >= 500 ? MSG.server : MSG.generic);

      const err = new ApiError(message, res.status, code);
      if (err.isExpired) await onExpired(message);
      else if (err.isPanelDenial) onDenied(message);
      throw err;
    }

    return body;
  }

  return {
    call,

    /* --- Profili ------------------------------------------------- */
    getProfile: () => call("me"),

    /* --- Pronat -------------------------------------------------- */
    /** Kthen { branch, sha, content } — sha përdoret për kontrollin e konfliktit. */
    getListings: () => call("load"),

    publishListings: ({ content, baseSha, listingCount }) =>
      call("publish_listings", { content, baseSha, listingCount }),

    uploadImage: ({ name, contentBase64 }) =>
      call("upload_image", { name, contentBase64 }, { timeout: UPLOAD_TIMEOUT_MS }),

    /* --- Përdoruesit (vetëm admin) ------------------------------- */
    listUsers: () => call("admin_list_users"),
    setUserRole: (userId, role) => call("admin_set_role", { userId, role }),
    setUserActive: (userId, active) => call("admin_set_active", { userId, active }),

    /* --- Regjistri i aktivitetit (vetëm admin) ------------------- */
    getActivityLog: (limit = 200) => call("admin_activity_log", { limit })
  };
}
