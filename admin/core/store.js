/* =====================================================================
   GJENDJA E APLIKACIONIT
   =====================================================================

   Një gjendje e vetme, e ndryshueshme vetëm përmes funksioneve këtu.
   Pamjet nuk e ndryshojnë njëra-tjetrën — ato ndryshojnë gjendjen dhe
   dëgjojnë njoftimin.

   Detyra kryesore e këtij skedari është të dijë, në çdo çast, SA dhe
   CILAT prona ndryshojnë nga ato që janë publikuar në uebfaqe. Pa këtë,
   administratori duhet të hamendësojë nëse puna e tij ka dalë live —
   dhe hamendësimi është pikërisht ajo që humbet punë.
   ===================================================================== */

"use strict";

import * as model from "./model.js";

/* ------------------------------------------------------------------ */
/* Gjendja                                                             */
/* ------------------------------------------------------------------ */

const state = {
  /* Kush jam unë */
  me: null,                    // { email, full_name, role, active, canPublish }

  /* Të dhënat e ngarkuara */
  loaded: false,
  loading: false,
  loadError: "",

  /* Prona */
  properties: [],              // modeli i normalizuar
  site: {                      // cilësimet e faqes publike
    DISPLAY_PHONE: "", CALL_PHONE: "", CITY: "", LAST_UPDATED: "", TEXT: null
  },

  /* Fotografitë e reja që presin publikim: emri → { blob, dataUrl, … } */
  pendingImages: {},

  /* Versioni i depos, për kontrollin e konfliktit */
  repo: { branch: "", sha: null },

  /* Fotografia e gjendjes në momentin e ngarkimit / publikimit të fundit.
     Krahasimi me të jep numrin e vërtetë të ndryshimeve të papublikuara. */
  baseline: { properties: "", site: "" },

  /* Publikimi i fundit i njohur, nga regjistri i aktivitetit */
  lastPublish: null,           // { at, email, count }

  /* Preferencat e ndërfaqes */
  ui: {
    sidebarCollapsed: false,
    propertiesView: "table"    // "table" | "grid"
  }
};

/* ------------------------------------------------------------------ */
/* Abonimi                                                             */
/* ------------------------------------------------------------------ */

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error("Dëgjuesi dështoi:", e); }
  }
}

export function get() { return state; }

/* ------------------------------------------------------------------ */
/* Preferencat — ruhen kur shfletuesi e lejon                          */
/* ------------------------------------------------------------------ */

const PREF_KEY = "zone-admin-ui";

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) Object.assign(state.ui, JSON.parse(raw));
  } catch (_) {
    /* Safari privat ose ruajtje e bllokuar — preferencat thjesht
       nuk mbahen mend. Kjo nuk duhet ta ndalojë panelin. */
  }
}

export function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(state.ui)); } catch (_) {}
}

export function setUi(patch) {
  Object.assign(state.ui, patch);
  savePrefs();
  notify();
}

/* ------------------------------------------------------------------ */
/* Ngarkimi                                                            */
/* ------------------------------------------------------------------ */

export function setProfile(profile) {
  state.me = profile;
  notify();
}

export function canPublish() {
  const me = state.me;
  if (!me) return false;
  return me.canPublish === true || me.role === "admin" || me.role === "editor";
}

export function isAdmin() {
  return !!state.me && state.me.role === "admin";
}

/** Merr përgjigjen e `load` dhe e kthen në gjendje pune. */
export function hydrate({ branch, sha, content }) {
  const cfg = model.parseListingsFile(content);

  state.repo.branch = branch;
  state.repo.sha = sha;

  state.site = {
    DISPLAY_PHONE: cfg.DISPLAY_PHONE || "",
    CALL_PHONE: cfg.CALL_PHONE || "",
    CITY: cfg.CITY || "",
    LAST_UPDATED: cfg.LAST_UPDATED || "",
    TEXT: cfg.TEXT || null
  };

  state.properties = model.normalizeAll(cfg.listings);
  state.pendingImages = {};
  state.loaded = true;
  state.loadError = "";

  markPublished();
  notify();
}

/* ------------------------------------------------------------------ */
/* Ndjekja e ndryshimeve                                               */
/* ------------------------------------------------------------------ */

/* Vetëm fushat që përfundojnë vërtet në uebfaqe krahasohen. Ndryshimi
   i renditjes së brendshme, p.sh., nuk duhet të llogaritet si ndryshim
   i papublikuar nëse rezultati publik mbetet i njëjti. */
function fingerprint(p) {
  return JSON.stringify([
    p.code, p.title, p.transactionType, p.lifecycle, p.category,
    p.priceValue, p.currency, p.negotiable, p.priceText,
    p.city, p.municipality, p.neighborhood, p.address, p.latitude, p.longitude,
    p.sizeValue, p.plotSize, p.rooms, p.beds, p.baths, p.floor, p.totalFloors,
    p.yearBuilt, p.parking, p.garage, p.orientation, p.condition,
    p.summary, p.details, p.features,
    p.coverImage, p.images,
    p.featured, p.featuredOrder,
    p.slug, p.metaTitle, p.metaDescription
  ]);
}

function propertiesSnapshot() {
  return JSON.stringify(state.properties.map((p) => [p.id, fingerprint(p)]));
}
function siteSnapshot() {
  return JSON.stringify(state.site);
}

/** Thirret pas ngarkimit dhe pas çdo publikimi të suksesshëm. */
export function markPublished() {
  state.baseline.properties = propertiesSnapshot();
  state.baseline.site = siteSnapshot();
}

/**
 * Numri dhe lloji i ndryshimeve që NUK janë ende në uebfaqe.
 * Ky është treguesi që administratori sheh gjithmonë në header.
 */
export function changeSummary() {
  if (!state.loaded) return { total: 0, added: 0, edited: 0, removed: 0, site: false, images: 0 };

  let base;
  try { base = JSON.parse(state.baseline.properties || "[]"); } catch (_) { base = []; }

  const baseMap = new Map(base);
  const nowMap = new Map(state.properties.map((p) => [p.id, fingerprint(p)]));

  let added = 0, edited = 0, removed = 0;
  for (const [id, fp] of nowMap) {
    if (!baseMap.has(id)) added++;
    else if (baseMap.get(id) !== fp) edited++;
  }
  for (const [id] of baseMap) if (!nowMap.has(id)) removed++;

  const siteChanged = siteSnapshot() !== state.baseline.site;
  const images = Object.keys(state.pendingImages).length;

  return {
    added, edited, removed,
    site: siteChanged,
    images,
    total: added + edited + removed + (siteChanged ? 1 : 0)
  };
}

export function isDirty() {
  const c = changeSummary();
  return c.total > 0 || c.images > 0;
}

/* ------------------------------------------------------------------ */
/* Veprimet mbi pronat                                                 */
/* ------------------------------------------------------------------ */

export function findProperty(id) {
  return state.properties.find((p) => p.id === id) || null;
}

function reindex() {
  state.properties.forEach((p, i) => { p._order = i; });
}

export function upsertProperty(property) {
  const idx = state.properties.findIndex((p) => p.id === property.id);
  const stamped = { ...property, updatedAt: new Date().toISOString() };

  if (idx >= 0) state.properties[idx] = stamped;
  else state.properties.push(stamped);

  reindex();
  enforceSingleFeaturedOrder();
  notify();
  return stamped;
}

export function removeProperty(id) {
  state.properties = state.properties.filter((p) => p.id !== id);
  reindex();
  notify();
}

export function setLifecycle(id, lifecycle) {
  const p = findProperty(id);
  if (!p) return;
  p.lifecycle = lifecycle;
  p.updatedAt = new Date().toISOString();
  /* Një pronë e arkivuar ose joaktive nuk duhet të mbetet në ballinë. */
  if (!model.lifecycleIsPublic(lifecycle)) p.featured = false;
  enforceSingleFeaturedOrder();
  notify();
}

export function setFeatured(id, featured) {
  const p = findProperty(id);
  if (!p) return;

  if (featured && !model.lifecycleIsPublic(p.lifecycle)) {
    /* Një draft nuk mund të jetë në ballinë — ai nuk ekziston publikisht. */
    return { error: "Vetëm pronat që shfaqen në uebfaqe mund të veçohen." };
  }

  p.featured = !!featured;
  if (featured && p.featuredOrder == null) {
    p.featuredOrder = state.properties.filter((x) => x.featured).length - 1;
  }
  if (!featured) p.featuredOrder = null;

  p.updatedAt = new Date().toISOString();
  enforceSingleFeaturedOrder();
  notify();
  return {};
}

/** Rendit pronat e veçuara 0,1,2… pa boshllëqe. */
function enforceSingleFeaturedOrder() {
  state.properties
    .filter((p) => p.featured)
    .sort((a, b) => {
      const ao = a.featuredOrder == null ? 9999 : a.featuredOrder;
      const bo = b.featuredOrder == null ? 9999 : b.featuredOrder;
      return ao - bo || a._order - b._order;
    })
    .forEach((p, i) => { p.featuredOrder = i; });
}

/** Zhvendos një pronë në një pozitë tjetër të listës (drag & drop). */
export function moveProperty(fromId, toIndex) {
  const from = state.properties.findIndex((p) => p.id === fromId);
  if (from < 0) return;
  const [item] = state.properties.splice(from, 1);
  state.properties.splice(Math.max(0, Math.min(toIndex, state.properties.length)), 0, item);
  reindex();
  notify();
}

/** Zhvendos një pronë të veçuar brenda renditjes së ballinës. */
export function moveFeatured(id, toIndex) {
  const featured = state.properties
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999));

  const from = featured.findIndex((p) => p.id === id);
  if (from < 0) return;
  const [item] = featured.splice(from, 1);
  featured.splice(Math.max(0, Math.min(toIndex, featured.length)), 0, item);
  featured.forEach((p, i) => { p.featuredOrder = i; });
  notify();
}

export function setSite(patch) {
  Object.assign(state.site, patch);
  notify();
}

/* ------------------------------------------------------------------ */
/* Fotografitë në pritje                                               */
/* ------------------------------------------------------------------ */

export function addPendingImage(name, payload) {
  state.pendingImages[name] = payload;
  notify();
}

export function removePendingImage(name) {
  delete state.pendingImages[name];
  notify();
}

/** Fotot që nuk përdoren më nga asnjë pronë nuk duhet të ngarkohen. */
export function prunePendingImages() {
  const used = new Set();
  for (const p of state.properties) {
    for (const img of p.images) used.add(img.replace(/^images\//, ""));
  }
  for (const name of Object.keys(state.pendingImages)) {
    if (!used.has(name)) delete state.pendingImages[name];
  }
}

/** Burimi i shfaqjes së një fotoje: e reja nga memoria, e vjetra nga faqja. */
export function imageSource(path, placeholder, siteBase) {
  if (!path) return placeholder;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;

  const name = path.replace(/^images\//, "");
  const pending = state.pendingImages[name];
  if (pending) return pending.dataUrl;

  const base = String(siteBase || "").replace(/\/+$/, "");
  return base ? base + "/" + path : path;
}

/* ------------------------------------------------------------------ */
/* Statistikat — vetëm nga të dhëna reale                              */
/* ------------------------------------------------------------------ */

export function stats() {
  const p = state.properties;
  const by = (fn) => p.filter(fn).length;

  return {
    total: p.length,
    active: by((x) => x.lifecycle === "active"),
    draft: by((x) => x.lifecycle === "draft"),
    forSale: by((x) => x.transactionType === "sale" && model.lifecycleIsPublic(x.lifecycle)),
    forRent: by((x) => x.transactionType === "rent" && model.lifecycleIsPublic(x.lifecycle)),
    sold: by((x) => x.lifecycle === "sold"),
    rented: by((x) => x.lifecycle === "rented"),
    reserved: by((x) => x.lifecycle === "reserved"),
    inactive: by((x) => x.lifecycle === "inactive"),
    archived: by((x) => x.lifecycle === "archived"),
    featured: by((x) => x.featured),
    published: by((x) => model.lifecycleIsPublic(x.lifecycle)),
    noPhoto: by((x) => !x.images.length)
  };
}

/** Grupon sipas një çelësi dhe kthen listën e renditur zbritshëm. */
export function groupBy(keyFn, limit) {
  const map = new Map();
  for (const p of state.properties) {
    const key = keyFn(p);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const rows = [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "sq"));
  return limit ? rows.slice(0, limit) : rows;
}

/* ------------------------------------------------------------------ */
/* Pastrimi                                                            */
/* ------------------------------------------------------------------ */

export function reset() {
  state.me = null;
  state.loaded = false;
  state.loading = false;
  state.loadError = "";
  state.properties = [];
  state.pendingImages = {};
  state.repo = { branch: "", sha: null };
  state.baseline = { properties: "", site: "" };
  state.lastPublish = null;
  notify();
}
