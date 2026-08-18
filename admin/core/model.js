/* =====================================================================
   MODELI I PRONËS
   =====================================================================

   Ky skedar bën tri gjëra:

     1. Përcakton fjalorin  (statuset, kategoritë, karakteristikat)
     2. NORMALIZON pronat e vjetra në modelin e ri
     3. GJENERON listings.js që lexon faqja publike

   ---------------------------------------------------------------------
   PËRPUTHSHMËRIA — lexojeni para se të ndryshoni diçka
   ---------------------------------------------------------------------

   Pronat ekzistuese kanë vetëm këto fusha:

     title · status · price · beds · baths · size
     location · summary · details · features · image

   ku `status` është teksti shqip "Për shitje" / "Me qira".

   Modeli i ri i ndan dy koncepte që ishin ngatërruar në një fushë:

     transactionType   sale | rent          — çfarë bëhet me pronën
     lifecycle         draft | active | …   — ku ndodhet prona në proces

   Që faqja publike të mos prishet asnjë sekondë, listings.js i shkruan
   TË DYJA format:

     status: "Për shitje"     ← fusha e vjetër, e llogaritur
     transactionType: "sale"  ← fusha e re
     image: "images/x.jpg"    ← fusha e vjetër, = coverImage
     coverImage / images[]    ← fushat e reja

   Kështu, edhe nëse një shfletues ka ende script.js të vjetër në cache,
   faqja punon. Fushat e vjetra do të hiqen vetëm pasi çdo pronë të jetë
   ripublikuar dhe faqja të jetë verifikuar.
   ===================================================================== */

"use strict";

import * as fmt from "./format.js";

/* ==================================================================
   1. FJALORI
   ================================================================== */

/** Çfarë bëhet me pronën. */
export const TRANSACTION_TYPES = [
  { value: "sale", label: "Për shitje", publicLabel: "Për shitje" },
  { value: "rent", label: "Me qira", publicLabel: "Me qira" }
];

/** Ku ndodhet prona në procesin e punës.
 *  `public: true` do të thotë që prona shfaqet në uebfaqe. */
export const LIFECYCLES = [
  { value: "draft",    label: "Draft",          tone: "muted",   public: false },
  { value: "active",   label: "Aktive",         tone: "success", public: true },
  { value: "reserved", label: "Rezervuar",      tone: "warning", public: true },
  { value: "sold",     label: "Shitur",         tone: "info",    public: true },
  { value: "rented",   label: "Dhënë me Qira",  tone: "info",    public: true },
  { value: "inactive", label: "Joaktive",       tone: "muted",   public: false },
  { value: "archived", label: "Arkivuar",       tone: "muted",   public: false }
];

export const CATEGORIES = [
  { value: "banese",  label: "Banesë" },
  { value: "shtepi",  label: "Shtëpi" },
  { value: "vile",    label: "Vilë" },
  { value: "lokal",   label: "Lokal" },
  { value: "zyre",    label: "Zyrë" },
  { value: "toke",    label: "Tokë / Parcelë" },
  { value: "objekt",  label: "Objekt biznesi" },
  { value: "garazh",  label: "Garazh" }
];

export const CONDITIONS = [
  { value: "e-re",         label: "E re" },
  { value: "shume-e-mire", label: "Shumë e mirë" },
  { value: "e-mire",       label: "E mirë" },
  { value: "per-rinovim",  label: "Për rinovim" },
  { value: "ne-ndertim",   label: "Në ndërtim" }
];

export const ORIENTATIONS = [
  { value: "veri",     label: "Veri" },
  { value: "jug",      label: "Jug" },
  { value: "lindje",   label: "Lindje" },
  { value: "perendim", label: "Perëndim" },
  { value: "veri-lindje",     label: "Verilindje" },
  { value: "veri-perendim",   label: "Veriperëndim" },
  { value: "jug-lindje",      label: "Juglindje" },
  { value: "jug-perendim",    label: "Jugperëndim" }
];

export const FEATURES = [
  "Ballkon", "Tarracë", "Ashensor", "Parking", "Garazh", "Klimë",
  "Ngrohje qendrore", "Internet", "Kamera", "Sistem sigurie", "Interfon",
  "Depo", "Kopsht", "Pishinë", "Mobiluar", "Pamje panoramike",
  "Qasje për persona me aftësi të kufizuara"
];

/** Kategoritë ku dhomat e gjumit nuk kanë kuptim. Formulari i fsheh
 *  fushat përkatëse në vend që ta detyrojë përdoruesin të shkruajë 0. */
export const LAND_CATEGORIES = ["toke", "garazh"];

export const CURRENCIES = [
  { value: "EUR", label: "Euro (€)" },
  { value: "CHF", label: "Franga (CHF)" },
  { value: "USD", label: "Dollar ($)" }
];

/* Ndihmësa për etiketat */
const labelFrom = (list, value, fallback) => {
  const hit = list.find((x) => x.value === value);
  return hit ? hit.label : (fallback !== undefined ? fallback : value || "");
};

export const lifecycleLabel = (v) => labelFrom(LIFECYCLES, v, "—");
export const lifecycleTone = (v) => (LIFECYCLES.find((x) => x.value === v) || {}).tone || "muted";
export const lifecycleIsPublic = (v) => !!(LIFECYCLES.find((x) => x.value === v) || {}).public;
export const transactionLabel = (v) => labelFrom(TRANSACTION_TYPES, v, "—");
export const categoryLabel = (v) => labelFrom(CATEGORIES, v, "—");
export const conditionLabel = (v) => labelFrom(CONDITIONS, v, "");
export const orientationLabel = (v) => labelFrom(ORIENTATIONS, v, "");

/* ==================================================================
   2. NORMALIZIMI
   ================================================================== */

const IMAGES_PREFIX = "images/";

/** Siguron që një shteg fotoje të jetë gjithmonë "images/emri.jpg". */
export function normalizeImagePath(path) {
  const s = String(path == null ? "" : path).trim();
  if (!s) return "";
  if (/^(https?:)?\/\//i.test(s) || s.startsWith("data:")) return s;
  return IMAGES_PREFIX + s.replace(/^\/*/, "").replace(/^images\//i, "");
}

/** "Për shitje" / "Me qira" / "rent" → "sale" | "rent" */
function inferTransactionType(raw) {
  const explicit = String(raw.transactionType || "").trim().toLowerCase();
  if (explicit === "sale" || explicit === "rent") return explicit;

  /* Bie te fusha e vjetër `status`, e cila mbante tekstin shqip. */
  const legacy = String(raw.status || "").toLowerCase();
  if (/qira/.test(legacy)) return "rent";
  return "sale";
}

/** Statusi i vjetër ishte një fushë e vetme. Nëse `lifecycle` mungon,
 *  prona e vjetër konsiderohet aktive — ajo ka qenë live deri tani. */
function inferLifecycle(raw) {
  const explicit = String(raw.lifecycle || "").trim().toLowerCase();
  if (LIFECYCLES.some((l) => l.value === explicit)) return explicit;
  if (raw.published === false) return "draft";
  return "active";
}

/** "Arbëri, Prishtinë" → { neighborhood: "Arbëri", city: "Prishtinë" } */
function splitLocation(text) {
  const parts = String(text || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { neighborhood: "", city: "" };
  if (parts.length === 1) return { neighborhood: "", city: parts[0] };
  return { neighborhood: parts.slice(0, -1).join(", "), city: parts[parts.length - 1] };
}

/** Rindërton tekstin e lokacionit që pret faqja publike. */
export function composeLocation(p) {
  return [p.neighborhood, p.city].map((s) => String(s || "").trim()).filter(Boolean).join(", ");
}

const intOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

let seq = 0;
const makeId = () => "p_" + Date.now().toString(36) + "_" + (seq++).toString(36);

/**
 * Shndërron një regjistrim çfarëdo — të vjetër ose të ri — në modelin e plotë.
 * Asnjë fushë nuk mbetet `undefined`: kodi që vjen pas kësaj nuk duhet të
 * merret me mungesa.
 */
export function normalizeProperty(raw, index) {
  const r = raw || {};
  const transactionType = inferTransactionType(r);
  const lifecycle = inferLifecycle(r);

  /* --- Fotografitë ------------------------------------------------
     E vjetra kishte një fushë të vetme `image`. E reja ka `coverImage`
     dhe `images[]`. Të dyja rrjedhat mbështeten njëkohësisht. */
  let images = Array.isArray(r.images)
    ? r.images.map(normalizeImagePath).filter(Boolean)
    : [];

  let coverImage = normalizeImagePath(r.coverImage || r.image || "");

  if (!images.length && coverImage) images = [coverImage];
  if (!coverImage && images.length) coverImage = images[0];
  /* Fotoja kryesore duhet të jetë gjithmonë pjesë e galerisë. */
  if (coverImage && !images.includes(coverImage)) images.unshift(coverImage);
  images = [...new Set(images)];

  /* --- Çmimi ------------------------------------------------------
     E vjetra e mbante si tekst ("185.000 €", "420 €/muaj"). E ruajmë
     tekstin origjinal si rezervë, por nxjerrim edhe numrin që na duhet
     për renditje, filtra dhe statistika. */
  const priceValue = r.priceValue != null ? Number(r.priceValue) : fmt.parseNum(r.price);
  const sizeValue = r.sizeValue != null ? Number(r.sizeValue) : fmt.parseNum(r.size);

  const loc = splitLocation(r.location);

  return {
    /* Identiteti */
    id: r.id || makeId(),
    code: String(r.code || "").trim(),

    /* Bazat */
    title: String(r.title || "").trim(),
    transactionType,
    lifecycle,
    category: String(r.category || "").trim(),

    /* Çmimi */
    priceValue: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : null,
    currency: String(r.currency || "EUR").toUpperCase(),
    negotiable: r.negotiable === true,
    deposit: r.deposit != null ? fmt.parseNum(r.deposit) : null,
    /* Teksti i lirë ruhet vetëm nëse administratori e ka vendosur vetë,
       ose nëse çmimi i vjetër nuk u lexua dot si numër. */
    priceText: String(r.priceText || (priceValue == null ? (r.price || "") : "")).trim(),

    /* Lokacioni */
    country: String(r.country || "Kosovë").trim(),
    city: String(r.city || loc.city || "").trim(),
    municipality: String(r.municipality || "").trim(),
    neighborhood: String(r.neighborhood || loc.neighborhood || "").trim(),
    address: String(r.address || "").trim(),
    latitude: r.latitude != null && r.latitude !== "" ? Number(r.latitude) : null,
    longitude: r.longitude != null && r.longitude !== "" ? Number(r.longitude) : null,

    /* Detajet */
    sizeValue: Number.isFinite(sizeValue) && sizeValue > 0 ? sizeValue : null,
    plotSize: r.plotSize != null ? fmt.parseNum(r.plotSize) : null,
    rooms: intOrNull(r.rooms),
    beds: intOrNull(r.beds),
    baths: intOrNull(r.baths),
    floor: intOrNull(r.floor),
    totalFloors: intOrNull(r.totalFloors),
    yearBuilt: intOrNull(r.yearBuilt),
    parking: intOrNull(r.parking),
    garage: r.garage === true,
    orientation: String(r.orientation || "").trim(),
    condition: String(r.condition || "").trim(),

    /* Përshkrimi */
    summary: String(r.summary || "").trim(),
    details: String(r.details || "").trim(),
    features: Array.isArray(r.features)
      ? r.features.map((f) => String(f).trim()).filter(Boolean)
      : [],

    /* Media */
    coverImage,
    images,

    /* Ballina — fushë e qartë, JO më "e para në listë" */
    featured: r.featured === true,
    featuredOrder: intOrNull(r.featuredOrder),

    /* SEO */
    slug: String(r.slug || "").trim(),
    metaTitle: String(r.metaTitle || "").trim(),
    metaDescription: String(r.metaDescription || "").trim(),

    /* Gjurmët e kohës */
    createdAt: r.createdAt || null,
    updatedAt: r.updatedAt || null,
    publishedAt: r.publishedAt || null,
    expiresAt: r.expiresAt || null,

    /* Ruajtur vetëm për renditjen e listës; nuk ka lidhje me "e veçuar". */
    _order: index
  };
}

/* ------------------------------------------------------------------ */
/* Migrimi i grupit                                                    */
/* ------------------------------------------------------------------ */

/**
 * Normalizon të gjithë listën dhe kryen dy migrime një-herësh:
 *
 *   1. Kodet ZRE-#### u caktohen pronave që s'kanë kod.
 *   2. Nëse ASNJË pronë nuk ka `featured: true`, prona e parë shënohet
 *      si e veçuar — sepse ashtu ka qenë sjellja e vjetër e faqes.
 *      Pas ruajtjes së parë, fusha e qartë merr përsipër plotësisht.
 */
export function normalizeAll(rawList) {
  const list = (rawList || []).map((raw, i) => normalizeProperty(raw, i));

  /* 1. Kodet — kurrë të dyfishta. */
  const used = new Set(list.map((p) => p.code).filter(Boolean));
  let next = 1;
  for (const p of list) {
    if (p.code) continue;
    let candidate;
    do { candidate = makeCode(next++); } while (used.has(candidate));
    p.code = candidate;
    used.add(candidate);
  }

  /* 2. Prona e veçuar. */
  const anyExplicit = (rawList || []).some((r) => r && r.featured === true);
  if (!anyExplicit && list.length) {
    list[0].featured = true;
    list[0].featuredOrder = 0;
  }

  return list;
}

export function makeCode(n) {
  return "ZRE-" + String(n).padStart(4, "0");
}

/** Kodi i radhës që nuk përplaset me asnjë ekzistues. */
export function nextCode(list) {
  let max = 0;
  for (const p of list || []) {
    const m = /^ZRE-(\d+)$/.exec(String(p.code || ""));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  let n = max + 1;
  const used = new Set((list || []).map((p) => p.code));
  while (used.has(makeCode(n))) n++;
  return makeCode(n);
}

/** Krijon një pronë të re bosh, gati për formularin. */
export function blankProperty(list) {
  const p = normalizeProperty({
    lifecycle: "draft",
    transactionType: "sale",
    currency: "EUR",
    country: "Kosovë",
    createdAt: new Date().toISOString()
  }, (list || []).length);
  p.code = nextCode(list);
  return p;
}

/** Kopje e pronës, me kod dhe identitet të ri, gjithmonë si draft. */
export function duplicateProperty(source, list) {
  const copy = normalizeProperty({
    ...source,
    id: undefined,
    code: nextCode(list),
    title: source.title + " (kopje)",
    slug: "",
    featured: false,
    featuredOrder: null,
    lifecycle: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: null,
    publishedAt: null
  }, (list || []).length);
  return copy;
}

/* ==================================================================
   3. VLERAT E PARAQITJES
   ================================================================== */

/** Teksti i çmimit që del në faqe. Teksti i shkruar me dorë fiton. */
export function displayPrice(p) {
  if (p.priceText) return p.priceText;
  return fmt.priceLabel(p.priceValue, p.currency, p.transactionType);
}

export function displaySize(p) {
  return p.sizeValue ? fmt.area(p.sizeValue) : "";
}

/** Slug-u i SEO-s. Gjenerohet nga titulli nëse s'është vendosur me dorë. */
export function effectiveSlug(p) {
  return p.slug || fmt.slugify(p.title, 60) || fmt.slugify(p.code, 20);
}

/* ==================================================================
   4. VALIDIMI
   ================================================================== */

/**
 * Kthen { field: "mesazhi" } — bosh kur gjithçka është në rregull.
 * Të gjitha mesazhet janë shqip dhe i drejtohen njeriut, jo programit.
 */
export function validateProperty(p, allProperties) {
  const errors = {};
  const isLand = LAND_CATEGORIES.includes(p.category);

  if (!p.title) errors.title = "Titulli është i detyrueshëm.";
  else if (p.title.length < 3) errors.title = "Titulli duhet të ketë së paku 3 shkronja.";

  if (!p.code) {
    errors.code = "Kodi i pronës është i detyrueshëm.";
  } else if (!/^[A-Za-z0-9-]+$/.test(p.code)) {
    errors.code = "Kodi lejon vetëm shkronja latine, shifra dhe vizë.";
  } else {
    const clash = (allProperties || []).some(
      (o) => o.id !== p.id && String(o.code).toLowerCase() === String(p.code).toLowerCase()
    );
    if (clash) errors.code = "Ky kod përdoret tashmë nga një pronë tjetër.";
  }

  if (!p.category) errors.category = "Zgjidhni kategorinë e pronës.";
  if (!p.lifecycle) errors.lifecycle = "Ju lutemi zgjidhni një status.";

  /* Çmimi: ose numër i vlefshëm, ose tekst i shkruar me dorë. */
  if (!p.priceText) {
    if (p.priceValue == null) errors.priceValue = "Çmimi është i detyrueshëm.";
    else if (p.priceValue <= 0) errors.priceValue = "Çmimi duhet të jetë më i madh se zero.";
  }

  if (!p.city) errors.city = "Qyteti është i detyrueshëm.";

  if (p.sizeValue != null && p.sizeValue <= 0) {
    errors.sizeValue = "Sipërfaqja duhet të jetë më e madhe se zero.";
  }
  if (!isLand && p.sizeValue == null) {
    errors.sizeValue = "Sipërfaqja është e detyrueshme.";
  }

  if (p.latitude != null && (p.latitude < -90 || p.latitude > 90)) {
    errors.latitude = "Gjerësia gjeografike duhet të jetë mes -90 dhe 90.";
  }
  if (p.longitude != null && (p.longitude < -180 || p.longitude > 180)) {
    errors.longitude = "Gjatësia gjeografike duhet të jetë mes -180 dhe 180.";
  }

  const year = new Date().getFullYear();
  if (p.yearBuilt != null && (p.yearBuilt < 1800 || p.yearBuilt > year + 6)) {
    errors.yearBuilt = "Viti i ndërtimit nuk duket i saktë.";
  }

  if (p.floor != null && p.totalFloors != null && p.floor > p.totalFloors) {
    errors.floor = "Kati nuk mund të jetë më i lartë se numri i kateve.";
  }

  if (!p.summary) errors.summary = "Përshkrimi i shkurtër është i detyrueshëm.";
  else if (p.summary.length > 320) errors.summary = "Përshkrimi i shkurtër duhet nën 320 shkronja.";

  if (p.metaDescription && p.metaDescription.length > 180) {
    errors.metaDescription = "Meta përshkrimi duhet nën 180 shkronja.";
  }

  return errors;
}

/** Cila skedë e formularit e përmban secilën fushë — që skeda me gabim
 *  të shënohet pa e kërkuar administratori me sy. */
export const FIELD_TAB = {
  title: 0, code: 0, category: 0, transactionType: 0, lifecycle: 0,
  summary: 0, details: 0,
  country: 1, city: 1, municipality: 1, neighborhood: 1, address: 1,
  latitude: 1, longitude: 1,
  sizeValue: 2, plotSize: 2, rooms: 2, beds: 2, baths: 2, floor: 2,
  totalFloors: 2, yearBuilt: 2, parking: 2, garage: 2, orientation: 2, condition: 2,
  priceValue: 3, currency: 3, negotiable: 3, deposit: 3, priceText: 3,
  features: 4,
  coverImage: 5, images: 5,
  slug: 6, metaTitle: 6, metaDescription: 6,
  featured: 7, featuredOrder: 7, publishedAt: 7, expiresAt: 7
};

/* ==================================================================
   5. GJENERIMI I listings.js
   ================================================================== */

const DEFAULT_TEXT = {
  statusShitje: "Për shitje", statusQira: "Me qira",
  butoniThirr: "Telefono për këtë", butoniDetajet: "Detajet", eVecuar: "E veçuar",
  "specÇmimi": "Çmimi", specDhoma: "Dhoma gjumi", specBanjo: "Banjo",
  specSiperfaqja: "Sipërfaqja", shkurtDhoma: "dh", shkurtBanjo: "bnj",
  karakteristikat: "Karakteristikat", telefono: "Telefono",
  shenimiThirrjes: "Pyetni për këtë pronë me emër —",
  shikoDetajet: "Shiko detajet për", prona: "prona", pronaNjejes: "pronë",
  aktive: "aktive",
  bosh: "Asnjë pronë në këtë kategori për momentin. Telefononi",
  boshFund: "dhe pyesni çfarë vjen së shpejti.", shtoFoto: "SHTO FOTO"
};

export { DEFAULT_TEXT };

/* JSON.stringify e bën arratisjen e saktë të thonjëzave, prapaviçave dhe
   rreshtave të rinj. Gjenerimi me dorë e humbte rreshtin e ri. */
const j = (v) => JSON.stringify(v == null ? "" : v);

/**
 * Fushat që dërgohen te listings.js.
 *
 * KUJDES: listings.js është skedar PUBLIK në një depo publike.
 * Asgjë private nuk guxon të kalojë këtej — as shënime të brendshme,
 * as të dhëna klientësh, as kontrata, as komisione. Lista më poshtë
 * është e qëllimshme dhe e mbyllur: fushat shtohen me dorë, kurrë me
 * një cikël mbi objektin.
 */
function publicShape(p, featuredRank) {
  const out = {};

  /* --- Fushat e vjetra, për përputhshmëri --- */
  out.title = p.title;
  out.status = transactionLabel(p.transactionType);   // "Për shitje" / "Me qira"
  out.price = displayPrice(p);
  out.beds = p.beds || 0;
  out.baths = p.baths || 0;
  out.size = displaySize(p);
  out.location = composeLocation(p);
  out.summary = p.summary;
  out.details = p.details || p.summary;
  out.features = p.features;
  out.image = p.coverImage;                            // = coverImage

  /* --- Fushat e reja --- */
  out.id = p.id;
  out.code = p.code;
  out.transactionType = p.transactionType;
  out.lifecycle = p.lifecycle;
  out.published = lifecycleIsPublic(p.lifecycle);
  out.category = p.category;

  out.priceValue = p.priceValue;
  out.currency = p.currency;
  out.negotiable = p.negotiable;

  out.city = p.city;
  out.municipality = p.municipality;
  out.neighborhood = p.neighborhood;
  out.address = p.address;
  out.latitude = p.latitude;
  out.longitude = p.longitude;

  out.sizeValue = p.sizeValue;
  out.plotSize = p.plotSize;
  out.rooms = p.rooms;
  out.floor = p.floor;
  out.totalFloors = p.totalFloors;
  out.yearBuilt = p.yearBuilt;
  out.parking = p.parking;
  out.garage = p.garage;
  out.orientation = p.orientation;
  out.condition = p.condition;

  out.coverImage = p.coverImage;
  out.images = p.images;

  out.featured = p.featured === true;
  out.featuredOrder = p.featured ? featuredRank : null;

  out.slug = effectiveSlug(p);
  out.metaTitle = p.metaTitle;
  out.metaDescription = p.metaDescription;

  out.publishedAt = p.publishedAt;
  out.updatedAt = p.updatedAt;

  return out;
}

/** Renditja e pronave të veçuara: featuredOrder, pastaj renditja e listës. */
export function featuredRanking(properties) {
  const rank = new Map();
  properties
    .filter((p) => p.featured)
    .slice()
    .sort((a, b) => {
      const ao = a.featuredOrder == null ? 9999 : a.featuredOrder;
      const bo = b.featuredOrder == null ? 9999 : b.featuredOrder;
      return ao - bo || a._order - b._order;
    })
    .forEach((p, i) => rank.set(p.id, i));
  return rank;
}

/**
 * Ndërton përmbajtjen e plotë të listings.js.
 * Rezultati duhet të përmbajë "window.ZONE_CONFIG" — funksioni serverik
 * e refuzon çdo skedar që nuk e ka, si mbrojtje kundër publikimit të
 * një skedari të prishur.
 */
export function buildListingsFile(site, properties) {
  const text = site.TEXT || DEFAULT_TEXT;
  const rank = featuredRanking(properties);
  const L = [];

  L.push("/* =====================================================================");
  L.push("   ZONE REAL ESTATE — SKEDARI I PRONAVE");
  L.push("   =====================================================================");
  L.push("   Gjeneruar nga Paneli Administrativ më " + fmt.dateTime(new Date()));
  L.push("");
  L.push("   MOS E NDRYSHONI ME DORË. Ndryshimet do të mbishkruhen te");
  L.push("   publikimi i radhës nga paneli.");
  L.push("");
  L.push("   Ky skedar është PUBLIK. Ai përmban vetëm informacion që lejohet");
  L.push("   të shfaqet në uebfaqe — asnjë e dhënë klienti, kontrate apo");
  L.push("   shënim i brendshëm nuk ruhet këtu.");
  L.push("   ===================================================================== */");
  L.push("");

  L.push("const DISPLAY_PHONE = " + j(site.DISPLAY_PHONE) + ";");
  L.push("const CALL_PHONE    = " + j(site.CALL_PHONE) + ";");
  L.push("");
  L.push("const CITY         = " + j(site.CITY) + ";");
  L.push("const LAST_UPDATED = " + j(site.LAST_UPDATED) + ";");
  L.push("");

  L.push("const TEXT = {");
  const keys = Object.keys(text);
  keys.forEach((k, i) => {
    const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : j(k);
    L.push("  " + safeKey + ": " + j(text[k]) + (i < keys.length - 1 ? "," : ""));
  });
  L.push("};");
  L.push("");

  L.push("const listings = [");
  properties.forEach((p, idx) => {
    const o = publicShape(p, rank.has(p.id) ? rank.get(p.id) : null);
    L.push("");
    L.push("  {");

    const entries = Object.entries(o);
    entries.forEach(([key, value], i) => {
      const comma = i < entries.length - 1 ? "," : "";

      if (Array.isArray(value)) {
        if (!value.length) { L.push("    " + key + ": []" + comma); return; }
        L.push("    " + key + ": [");
        value.forEach((v, k) => L.push("      " + j(v) + (k < value.length - 1 ? "," : "")));
        L.push("    ]" + comma);
        return;
      }

      if (value === null) { L.push("    " + key + ": null" + comma); return; }
      if (typeof value === "number" || typeof value === "boolean") {
        L.push("    " + key + ": " + value + comma);
        return;
      }
      L.push("    " + key + ": " + j(value) + comma);
    });

    L.push("  }" + (idx < properties.length - 1 ? "," : ""));
  });
  L.push("");
  L.push("];");
  L.push("");
  L.push("window.ZONE_CONFIG = { DISPLAY_PHONE, CALL_PHONE, CITY, LAST_UPDATED, TEXT, listings };");
  L.push("");

  return L.join("\n");
}

/**
 * Lexon një listings.js ekzistues pa e ekzekutuar në faqen tonë.
 * Skedari vjen nga depoja jonë përmes funksionit serverik, por
 * gjithsesi ekzekutohet me një objekt `window` bosh, që të mos prekë
 * asnjë gjendje reale të panelit.
 */
export function parseListingsFile(content) {
  const fn = new Function("window", content + "\nreturn window.ZONE_CONFIG;");
  const cfg = fn({});
  if (!cfg || !Array.isArray(cfg.listings)) {
    throw new Error("listings.js nuk u lexua dot.");
  }
  return cfg;
}

/** Verifikon që kodi i gjeneruar është i vlefshëm PARA se të dërgohet.
 *  Një skedar i prishur do ta linte faqen publike pa asnjë pronë. */
export function verifyGenerated(code, expectedCount) {
  const cfg = parseListingsFile(code);
  if (cfg.listings.length !== expectedCount) {
    throw new Error("Numri i pronave nuk përputhet me atë që u gjenerua.");
  }
  return cfg;
}
