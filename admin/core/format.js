/* =====================================================================
   FORMATIMI — një vend i vetëm për data, numra, çmime dhe sipërfaqe
   =====================================================================

   Formati është ai i Kosovës:
     data      18.08.2026
     çmimi     125.000 €
     sipërfaqja 124 m²

   Çdo pjesë e panelit e përdor këtë skedar. Nëse formati duhet
   ndryshuar, ndryshohet vetëm këtu.
   ===================================================================== */

"use strict";

const MONTHS_SQ = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"
];

/* ------------------------------------------------------------------ */
/* Numrat                                                              */
/* ------------------------------------------------------------------ */

/** 125000 → "125.000". Ndarësi i mijësheve në Kosovë është pika. */
export function num(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Lexon një numër nga tekst i lirë: "185.000 €" → 185000, "1,5" → 1.5
 *
 *  Kjo është e nevojshme sepse pronat ekzistuese e kanë çmimin të ruajtur
 *  si tekst. Pa këtë, asnjë renditje, filtër apo statistikë nuk do të
 *  punonte mbi të dhënat e vjetra. */
export function parseNum(text) {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  let s = String(text == null ? "" : text).trim();
  if (!s) return null;

  /* Hiq gjithçka që nuk është shifër, presje, pikë ose minus. */
  s = s.replace(/[^\d.,-]/g, "");
  if (!s) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    /* Të dyja shenjat janë prezente: e fundit është presja dhjetore. */
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    /* Vetëm presje. "1,5" është dhjetore; "125,000" është ndarës mijësh. */
    s = /,\d{3}(?!\d)/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot !== -1) {
    /* Vetëm pika. "125.000" është ndarës mijësh; "1.5" është dhjetore. */
    if (/\.\d{3}(?!\d)/.test(s)) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Çmimi dhe sipërfaqja                                                */
/* ------------------------------------------------------------------ */

const CURRENCY_SIGN = { EUR: "€", CHF: "CHF", USD: "$" };

export function currencySign(code) {
  return CURRENCY_SIGN[String(code || "EUR").toUpperCase()] || "€";
}

/** 125000, "EUR" → "125.000 €" */
export function price(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return num(n) + " " + currencySign(currency);
}

/** Teksti që del në faqen publike. Qiraja e mban "/muaj". */
export function priceLabel(value, currency, transactionType) {
  const base = price(value, currency);
  if (!base) return "";
  return transactionType === "rent" ? base + "/muaj" : base;
}

/** 124 → "124 m²" */
export function area(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 100) / 100;
  return num(Math.floor(rounded)) + (rounded % 1 ? String(rounded % 1).slice(1) : "") + " m²";
}

/** Çmimi për m². Kthen null kur njëri prej dy numrave nuk ka kuptim —
 *  një llogaritje e rreme është më keq se asnjë llogaritje. */
export function pricePerSqm(priceValue, sizeValue) {
  const p = Number(priceValue);
  const s = Number(sizeValue);
  if (!Number.isFinite(p) || !Number.isFinite(s) || p <= 0 || s <= 0) return null;
  return Math.round(p / s);
}

/* ------------------------------------------------------------------ */
/* Datat                                                               */
/* ------------------------------------------------------------------ */

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, "0");

/** "18.08.2026" */
export function date(value) {
  const d = toDate(value);
  if (!d) return "";
  return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
}

/** "18.08.2026, 14:32" */
export function dateTime(value) {
  const d = toDate(value);
  if (!d) return "";
  return date(d) + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/** "14:32" */
export function time(value) {
  const d = toDate(value);
  if (!d) return "";
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}

/** "Gusht 2026" — përdoret te fusha "Përditësuar" e faqes publike. */
export function monthYear(value) {
  const d = toDate(value) || new Date();
  return MONTHS_SQ[d.getMonth()] + " " + d.getFullYear();
}

/** "para 5 minutash" — për rrjedhën e aktivitetit. */
export function relative(value) {
  const d = toDate(value);
  if (!d) return "";
  const secs = Math.round((Date.now() - d.getTime()) / 1000);

  if (secs < 45) return "tani";
  if (secs < 90) return "para një minute";

  const mins = Math.round(secs / 60);
  if (mins < 60) return "para " + mins + " minutash";

  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "para një ore" : "para " + hours + " orësh";

  const days = Math.round(hours / 24);
  if (days === 1) return "dje";
  if (days < 7) return "para " + days + " ditësh";

  return date(d);
}

/* ------------------------------------------------------------------ */
/* Teksti                                                              */
/* ------------------------------------------------------------------ */

/** Numërimi shqip: 1 pronë / 5 prona */
export function plural(count, one, many) {
  return num(count) + " " + (Number(count) === 1 ? one : many);
}

/** Shkurton pa e prerë fjalën në mes. */
export function truncate(text, max) {
  const s = String(text == null ? "" : text);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Inicialet për avatarin. */
export function initials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "?";
  const local = s.includes("@") ? s.split("@")[0] : s;
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

/* Shkronjat shqipe kthehen në ASCII para se të bëhen emër skedari ose
   slug. Serveri i pranon vetëm emrat me [a-z0-9._-]. */
const TRANSLIT = {
  "ë": "e", "Ë": "e", "ç": "c", "Ç": "c",
  "á": "a", "à": "a", "â": "a", "ä": "a", "å": "a", "ã": "a",
  "é": "e", "è": "e", "ê": "e", "í": "i", "ì": "i", "î": "i", "ï": "i",
  "ó": "o", "ò": "o", "ô": "o", "ö": "o", "õ": "o",
  "ú": "u", "ù": "u", "û": "u", "ü": "u",
  "ñ": "n", "š": "s", "ž": "z", "ć": "c", "č": "c", "đ": "d", "ř": "r", "ý": "y"
};

export function slugify(text, maxLen) {
  const s = String(text == null ? "" : text).toLowerCase();
  let out = "";
  for (const ch of s) out += TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch;
  return out
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen || 60);
}
