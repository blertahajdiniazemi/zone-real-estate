/* =====================================================================
   UI — pjesët e përbashkëta të ndërfaqes
   =====================================================================

   Toast, modale, konfirmime, ikona dhe ndihmësa DOM.
   Çdo modul i përdor këto; asnjë modul nuk shkruan HTML modali vetë.

   Rregull: asnjë tekst i dukshëm nuk shkruhet këtu në anglisht.
   ===================================================================== */

"use strict";

/* ==================================================================
   DOM
   ================================================================== */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Arratis tekstin para se të futet në HTML. Çdo vlerë që vjen nga të
 *  dhënat kalon nga këtu — ndryshe një titull me `<` e prish faqen. */
export function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Krijon një element.
 * el("div", { class: "card", onclick: fn }, [child, "tekst"])
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;

    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, value);
  }

  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Vonon një thirrje derisa përdoruesi të ndalojë së shkruari. */
export function debounce(fn, ms = 220) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ==================================================================
   Ikonat — një grup i vetëm, me vija, pa mbushje
   ================================================================== */

const PATHS = {
  dashboard: '<path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/>',
  building: '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 21V9h4a2 2 0 0 1 2 2v10"/><path d="M9 7h2M9 11h2M9 15h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  tag: '<path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  sparkle: '<path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6 8 15.6l1-4 9.4-9Z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.2-.9"/><path d="M2 2l20 20"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 9l5-5 5 5"/><path d="M12 4v12"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  publish: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  archive: '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>',
  pause: '<circle cx="12" cy="12" r="10"/><path d="M10 9v6M14 9v6"/>',
  star: '<path d="m12 3 2.9 5.8 6.4.9-4.6 4.5 1 6.4-5.7-3-5.7 3 1-6.4L3 9.7l6.4-.9L12 3Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  filter: '<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>',
  drag: '<circle cx="9" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l2.5 2.5M14.5 8.5 17 11"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1Z"/>'
};

/** Kthen një <svg> si element. */
export function icon(name, size) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  if (size) { svg.setAttribute("width", size); svg.setAttribute("height", size); }
  svg.innerHTML = PATHS[name] || PATHS.info;
  return svg;
}

/** E njëjta ikonë si varg HTML, për shabllonet me innerHTML. */
export function iconHtml(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (PATHS[name] || PATHS.info) + "</svg>";
}

/* ==================================================================
   Toast
   ================================================================== */

let toastRoot = null;

function ensureToastRoot() {
  if (toastRoot && document.body.contains(toastRoot)) return toastRoot;
  toastRoot = el("div", { class: "toast-root", role: "status", "aria-live": "polite" });
  document.body.appendChild(toastRoot);
  return toastRoot;
}

const TOAST_ICON = {
  success: "checkCircle", error: "alert", warning: "alert", info: "info"
};

/**
 * toast("Prona u ruajt me sukses.")
 * toast("Ndryshimet nuk mund të ruheshin.", { type: "error", text: "Provoni përsëri." })
 */
export function toast(title, options = {}) {
  const type = options.type || "success";
  const root = ensureToastRoot();

  const node = el("div", { class: "toast toast--" + type }, [
    (() => { const i = icon(TOAST_ICON[type] || "info"); i.classList.add("toast__icon"); return i; })(),
    el("div", { class: "toast__body" }, [
      el("div", { class: "toast__title", text: title }),
      options.text ? el("div", { class: "toast__text", text: options.text }) : null
    ]),
    el("button", {
      class: "toast__close", type: "button", "aria-label": "Mbyll njoftimin",
      onclick: () => dismiss()
    }, [icon("close", 13)])
  ]);

  let timer;
  function dismiss() {
    clearTimeout(timer);
    if (!node.isConnected) return;
    node.classList.add("is-leaving");
    setTimeout(() => node.remove(), 170);
  }

  root.appendChild(node);
  /* Gabimet rrinë më gjatë: ato kërkojnë veprim, jo vetëm vëmendje. */
  timer = setTimeout(dismiss, options.duration || (type === "error" ? 7000 : 4000));

  return dismiss;
}

/* ==================================================================
   Modalet
   ================================================================== */

const openModals = [];

/* Fokusi nuk duhet të dalë kurrë nga një modal i hapur. */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(root, event) {
  const items = $$(FOCUSABLE, root).filter((n) => n.offsetParent !== null || n === document.activeElement);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}

/**
 * openModal({ title, subtitle, body, footer, size, onClose, closeOnBackdrop })
 * `body` dhe `footer` janë elemente DOM.
 * Kthen { close, root, body }.
 */
export function openModal(config = {}) {
  const previouslyFocused = document.activeElement;

  const bodyNode = el("div", {
    class: "modal__body" + (config.flush ? " modal__body--flush" : "")
  }, config.body ? [config.body] : []);

  const titleId = "modal-title-" + Math.random().toString(36).slice(2, 8);

  const closeBtn = el("button", {
    class: "modal__close", type: "button", "aria-label": "Mbyll"
  }, [icon("close")]);

  const modal = el("div", {
    class: "modal" + (config.size ? " modal--" + config.size : ""),
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": titleId
  }, [
    config.title === undefined ? null : el("div", { class: "modal__head" }, [
      el("div", {}, [
        el("h2", { class: "modal__title", id: titleId, text: config.title }),
        config.subtitle ? el("p", { class: "modal__sub", text: config.subtitle }) : null
      ]),
      config.hideClose ? null : closeBtn
    ]),
    bodyNode,
    config.footer ? el("div", { class: "modal__foot" }, [config.footer]) : null
  ]);

  const backdrop = el("div", { class: "modal-root__backdrop" });
  const root = el("div", { class: "modal-root" }, [backdrop, modal]);

  let closed = false;
  function close(result) {
    if (closed) return;
    closed = true;

    document.removeEventListener("keydown", onKeydown, true);
    root.remove();
    openModals.splice(openModals.indexOf(handle), 1);
    if (!openModals.length) document.body.classList.remove("is-locked");

    if (previouslyFocused && previouslyFocused.focus) {
      try { previouslyFocused.focus(); } catch (_) {}
    }
    if (config.onClose) config.onClose(result);
  }

  function onKeydown(e) {
    /* Vetëm modali i sipërm reagon. */
    if (openModals[openModals.length - 1] !== handle) return;
    if (e.key === "Escape" && !config.disableEscape) { e.preventDefault(); close(); }
    else if (e.key === "Tab") trapFocus(modal, e);
  }

  closeBtn.addEventListener("click", () => close());
  if (config.closeOnBackdrop !== false) {
    backdrop.addEventListener("click", () => close());
  }
  document.addEventListener("keydown", onKeydown, true);

  document.body.classList.add("is-locked");
  document.body.appendChild(root);

  const handle = { close, root, body: bodyNode, modal };
  openModals.push(handle);

  /* Fokusi shkon te fusha e parë, ose te vetë modali. */
  requestAnimationFrame(() => {
    const target = config.autofocus
      ? $(config.autofocus, modal)
      : $$(FOCUSABLE, bodyNode)[0] || closeBtn;
    if (target && target.focus) target.focus();
  });

  return handle;
}

/**
 * Konfirmim i vërtetë — asnjëherë `confirm()` i shfletuesit.
 * Kthen Promise<boolean>.
 */
export function confirmDialog(config = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };

    const confirmBtn = el("button", {
      class: "btn " + (config.danger ? "btn--danger" : "btn--primary"),
      type: "button"
    }, [config.confirmLabel || "Vazhdo"]);

    const cancelBtn = el("button", {
      class: "btn btn--ghost", type: "button"
    }, [config.cancelLabel || "Anulo"]);

    const tone = config.danger ? "danger" : (config.tone || "info");

    const body = el("div", {}, [
      config.hideIcon ? null : el("div", { class: "confirm-icon confirm-icon--" + tone }, [
        icon(config.danger ? "trash" : tone === "warning" ? "alert" : "info")
      ]),
      el("p", { class: "text-sm secondary-text", style: "margin:0", html: config.message || "" }),
      config.note ? el("div", { class: "callout callout--warning mt-4" }, [
        icon("alert"), el("div", { html: config.note })
      ]) : null
    ]);

    const modal = openModal({
      title: config.title || "A jeni të sigurt?",
      body,
      footer: el("div", { class: "row row--end row--tight", style: "width:100%" }, [cancelBtn, confirmBtn]),
      onClose: () => done(false)
    });

    cancelBtn.addEventListener("click", () => { done(false); modal.close(); });
    confirmBtn.addEventListener("click", () => { done(true); modal.close(); });

    requestAnimationFrame(() => confirmBtn.focus());
  });
}

/* ==================================================================
   Menyja rrëzuese
   ================================================================== */

let openMenu = null;

document.addEventListener("click", (e) => {
  if (openMenu && !openMenu.contains(e.target)) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && openMenu) closeMenu();
});

export function closeMenu() {
  if (!openMenu) return;
  const panel = $(".menu__panel", openMenu);
  if (panel) panel.remove();
  const btn = $("[aria-expanded]", openMenu);
  if (btn) btn.setAttribute("aria-expanded", "false");
  openMenu = null;
}

/**
 * dropdown(triggerButton, items)
 * items: [{ label, icon, danger, onClick } | { separator: true } | { head: node }]
 */
export function dropdown(trigger, items) {
  const wrap = el("div", { class: "menu" }, [trigger]);
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = openMenu === wrap;
    closeMenu();
    if (wasOpen) return;

    const panel = el("div", { class: "menu__panel", role: "menu" });

    for (const item of items) {
      if (!item) continue;
      if (item.separator) { panel.appendChild(el("div", { class: "menu__sep" })); continue; }
      if (item.head) { panel.appendChild(item.head); continue; }

      panel.appendChild(el("button", {
        class: "menu__item" + (item.danger ? " menu__item--danger" : ""),
        type: "button",
        role: "menuitem",
        disabled: item.disabled,
        onclick: (ev) => { ev.stopPropagation(); closeMenu(); item.onClick && item.onClick(); }
      }, [item.icon ? icon(item.icon) : null, el("span", { text: item.label })]));
    }

    wrap.appendChild(panel);
    trigger.setAttribute("aria-expanded", "true");
    openMenu = wrap;

    /* Nëse menyja del jashtë ekranit poshtë, hapet lart. */
    const rect = panel.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) panel.classList.add("menu__panel--up");

    const first = $(".menu__item", panel);
    if (first) first.focus();
  });

  return wrap;
}

/* ==================================================================
   Blloqe të gatshme
   ================================================================== */

/** Gjendje boshe me një veprim të qartë — kurrë vetëm një mesazh. */
export function emptyState({ iconName, title, text, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return el("div", { class: "empty" }, [
    el("div", { class: "empty__icon" }, [icon(iconName || "inbox")]),
    el("h3", { class: "empty__title", text: title }),
    text ? el("p", { class: "empty__text", text }) : null,
    (actionLabel || secondaryLabel) ? el("div", { class: "row row--tight", style: "justify-content:center" }, [
      actionLabel ? el("button", { class: "btn btn--primary", type: "button", onclick: onAction },
        [icon("plus"), actionLabel]) : null,
      secondaryLabel ? el("button", { class: "btn btn--ghost", type: "button", onclick: onSecondary },
        [secondaryLabel]) : null
    ]) : null
  ]);
}

/** Rreshta skeleton për tabelat gjatë ngarkimit. */
export function skeletonRows(count, columns) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const tr = el("tr");
    for (let c = 0; c < columns; c++) {
      tr.appendChild(el("td", {}, [
        el("div", {
          class: "skeleton skeleton--text",
          style: "width:" + (c === 0 ? 54 : 40 + Math.random() * 45) + (c === 0 ? "px" : "%")
        })
      ]));
    }
    frag.appendChild(tr);
  }
  return frag;
}

export function skeletonCards(count) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) frag.appendChild(el("div", { class: "skeleton skeleton--card" }));
  return frag;
}

/** Distinktiv statusi: gjithmonë tekst + pikë, kurrë vetëm ngjyrë. */
export function badge(label, tone, options = {}) {
  return el("span", { class: "badge" + (tone ? " badge--" + tone : ""), title: options.title || null }, [
    options.noDot ? null : el("span", { class: "badge__dot" }),
    el("span", { text: label })
  ]);
}

/** Vendos butonin në gjendje pune pa e ngrirë ndërfaqen. */
export function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.classList.add("is-busy");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    if (busyLabel) button.textContent = busyLabel;
  } else {
    button.classList.remove("is-busy");
    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (button.dataset.label) {
      button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  }
}

/** Fusha e kërkimit me pastrim. */
export function searchField({ placeholder, value, onInput, id }) {
  const input = el("input", {
    class: "input", type: "search", id: id || null,
    placeholder: placeholder || "Kërko…",
    value: value || "",
    "aria-label": placeholder || "Kërko"
  });

  const clearBtn = el("button", {
    class: "search__clear", type: "button", "aria-label": "Pastro kërkimin",
    hidden: !value
  }, [icon("close", 13)]);

  const run = debounce((v) => onInput(v), 180);

  input.addEventListener("input", () => {
    clearBtn.hidden = !input.value;
    run(input.value);
  });
  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    onInput("");
    input.focus();
  });

  const wrap = el("div", { class: "search" }, [
    (() => { const i = icon("search"); i.classList.add("search__icon"); return i; })(),
    input, clearBtn
  ]);
  wrap.input = input;
  return wrap;
}

/** Fushë formulari me etiketë, ndihmë dhe vend për gabimin. */
export function field({ label, id, required, control, hint, full, error }) {
  const wrap = el("div", { class: "field" + (full ? " field--full" : "") + (error ? " is-invalid" : "") }, [
    label ? el("label", { class: "label", for: id }, [
      el("span", { text: label }),
      required ? el("span", { class: "req", text: " *" }) : null
    ]) : null,
    control,
    hint ? el("p", { class: "hint", text: hint }) : null,
    el("p", { class: "error-text", text: error || "" })
  ]);
  return wrap;
}

export function input(attrs = {}) {
  return el("input", { class: "input", ...attrs });
}
export function textarea(attrs = {}) {
  return el("textarea", { class: "textarea", ...attrs });
}

/** Zgjedhës me opsione { value, label }. */
export function select(attrs = {}, options = [], selected) {
  const node = el("select", { class: "select", ...attrs });
  for (const opt of options) {
    node.appendChild(el("option", {
      value: opt.value,
      selected: String(opt.value) === String(selected)
    }, [opt.label]));
  }
  return node;
}

export function switchControl({ label, hint, checked, onChange, id }) {
  const inputEl = el("input", { type: "checkbox", id: id || null, checked: !!checked });
  inputEl.addEventListener("change", () => onChange(inputEl.checked));

  const node = el("label", { class: "switch" }, [
    inputEl,
    el("span", { class: "switch__track" }),
    el("span", { class: "switch__text" }, [
      el("span", { text: label }),
      hint ? el("small", { text: hint }) : null
    ])
  ]);
  node.input = inputEl;
  return node;
}

export function checkbox({ label, checked, onChange, value }) {
  const inputEl = el("input", { type: "checkbox", checked: !!checked, value: value || "" });
  inputEl.addEventListener("change", () => onChange(inputEl.checked, value));

  return el("label", { class: "check" }, [
    inputEl,
    el("span", { class: "check__box" }),
    el("span", { text: label })
  ]);
}

/* ==================================================================
   Kalimi i të dhënave                                                 
   ================================================================== */

/** Base64 që i mbijeton shkronjave shqipe (btoa vetëm mbi bajtë). */
export function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function blobToB64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Fotoja nuk u lexua dot."));
    reader.readAsDataURL(blob);
  });
}

/** Vendmbajtësi kur një pronë nuk ka ende foto. */
export const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">' +
  '<rect width="120" height="90" fill="#211B25"/>' +
  '<path d="M60 34 L46 47 L51 47 L51 60 L69 60 L69 47 L74 47 Z" fill="none" ' +
  'stroke="#7E747C" stroke-width="1.8" stroke-linejoin="round"/></svg>'
);
