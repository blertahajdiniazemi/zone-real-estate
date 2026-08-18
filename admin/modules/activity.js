/* =====================================================================
   REGJISTRI I AKTIVITETIT
   =====================================================================

   Ndërfaqe mbi veprimin serverik `admin_activity_log`, i cili ekzistonte
   tashmë por nuk kishte asnjë pamje.

   Të gjitha rreshtat vijnë nga tabela `activity_log`. Asgjë nuk
   shpiket: nëse tabela është bosh, faqja e thotë këtë hapur.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as store from "../core/store.js";
import * as fmt from "../core/format.js";

const PAGE_SIZE = 25;
const FETCH_LIMIT = 500;   // kufiri i lejuar nga serveri

/* Veprimet që shkruan serveri, të përkthyera për njeriun. */
const ACTIONS = {
  publish_listings: { label: "Publikim", icon: "publish", tone: "success", module: "Pronat" },
  upload_image:     { label: "Ngarkim fotografie", icon: "image", tone: "info", module: "Media" },
  set_role:         { label: "Ndryshim roli", icon: "key", tone: "warning", module: "Përdoruesit" },
  enable_user:      { label: "Aktivizim përdoruesi", icon: "checkCircle", tone: "success", module: "Përdoruesit" },
  disable_user:     { label: "Çaktivizim përdoruesi", icon: "pause", tone: "warning", module: "Përdoruesit" },
  login:            { label: "Kyçje", icon: "logout", tone: "info", module: "Siguria" }
};

const ROLE_LABEL = { admin: "Administrator", editor: "Redaktor" };

/** Përshkrimi njerëzor i një rreshti të regjistrit. */
export function describeAction(entry) {
  const key = String(entry.action || "");
  const meta = ACTIONS[key] || { label: key || "Veprim", icon: "activity", tone: "muted", module: "—" };
  const detail = entry.detail || {};

  let text = meta.label;
  if (key === "publish_listings") {
    const count = detail.listingCount;
    text = "Publikimi u krye" + (count ? " — " + fmt.plural(count, "pronë", "prona") : "");
  } else if (key === "upload_image") {
    text = "Fotografia u ngarkua" + (detail.path ? " — " + String(detail.path).replace(/^images\//, "") : "");
  } else if (key === "set_role") {
    text = "Roli i përdoruesit u ndryshua" + (detail.role ? " në " + (ROLE_LABEL[detail.role] || detail.role) : "");
  } else if (key === "enable_user") {
    text = "Përdoruesi u aktivizua";
  } else if (key === "disable_user") {
    text = "Përdoruesi u çaktivizua";
  }

  return { ...meta, text };
}

/** Detajet teknike, të shfaqura vetëm kur ka diçka për të treguar. */
function detailSummary(entry) {
  const d = entry.detail || {};
  const bits = [];
  if (d.listingCount != null) bits.push(fmt.plural(d.listingCount, "pronë", "prona"));
  if (d.path) bits.push(String(d.path));
  if (d.branch) bits.push("dega " + d.branch);
  if (d.commit) bits.push("commit " + String(d.commit).slice(0, 7));
  if (d.role) bits.push("rol: " + (ROLE_LABEL[d.role] || d.role));
  return bits.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Gjendja e pamjes                                                    */
/* ------------------------------------------------------------------ */

const view = { search: "", user: "", action: "", from: "", to: "", page: 1 };

let cache = null;      // rreshtat e ngarkuar
let loading = false;
let loadError = "";

export function invalidate() { cache = null; }

/* ------------------------------------------------------------------ */
/* Pamja                                                               */
/* ------------------------------------------------------------------ */

export function render(context) {
  const root = ui.el("div", { class: "view" });
  const rerender = () => context.refresh();

  if (!store.isAdmin()) {
    root.appendChild(ui.emptyState({
      iconName: "key",
      title: "Nuk keni qasje",
      text: "Regjistri i aktivitetit është i disponueshëm vetëm për administratorët."
    }));
    return root;
  }

  root.appendChild(ui.el("div", { class: "view__head" }, [
    ui.el("p", { class: "view__lede", text: "Çdo veprim i regjistruar nga serveri, sipas përdoruesit dhe kohës." }),
    ui.el("button", {
      class: "btn btn--ghost", type: "button",
      onclick: () => { invalidate(); rerender(); }
    }, [ui.icon("refresh"), "Rifresko"])
  ]));

  const container = ui.el("div");
  root.appendChild(container);

  /* ---- Ngarkimi ---- */
  if (cache === null && !loading) {
    loading = true;
    loadError = "";
    context.api.getActivityLog(FETCH_LIMIT)
      .then((res) => { cache = (res && res.entries) || []; })
      .catch((e) => { loadError = e.message || "Regjistri nuk u ngarkua dot."; cache = []; })
      .finally(() => { loading = false; rerender(); });
  }

  if (loading || cache === null) {
    const table = ui.el("table", { class: "table" }, [
      ui.el("tbody", {}, [])
    ]);
    ui.$("tbody", table).appendChild(ui.skeletonRows(8, 5));
    container.appendChild(ui.el("div", { class: "table-wrap" }, [
      ui.el("div", { class: "table-scroll" }, [table])
    ]));
    return root;
  }

  if (loadError) {
    container.appendChild(ui.el("div", { class: "callout callout--error" }, [
      ui.icon("alert"),
      ui.el("div", { text: loadError })
    ]));
    return root;
  }

  /* ---- Filtrat ---- */
  container.appendChild(filterBar(rerender));

  /* ---- Filtrimi ---- */
  const rows = applyFilters(cache);

  if (!cache.length) {
    container.appendChild(ui.emptyState({
      iconName: "activity",
      title: "Nuk ka aktivitet",
      text: "Asnjë veprim nuk është regjistruar ende."
    }));
    return root;
  }

  if (!rows.length) {
    container.appendChild(ui.emptyState({
      iconName: "search",
      title: "Nuk u gjet asnjë veprim",
      text: "Provoni të ndryshoni kërkimin ose filtrat.",
      secondaryLabel: "Pastro filtrat",
      onSecondary: () => {
        Object.assign(view, { search: "", user: "", action: "", from: "", to: "", page: 1 });
        rerender();
      }
    }));
    return root;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (view.page > totalPages) view.page = totalPages;
  const pageRows = rows.slice((view.page - 1) * PAGE_SIZE, view.page * PAGE_SIZE);

  container.appendChild(table(pageRows, rows.length, totalPages, rerender));
  return root;
}

/* ------------------------------------------------------------------ */
/* Filtrat                                                             */
/* ------------------------------------------------------------------ */

function applyFilters(entries) {
  const from = view.from ? new Date(view.from + "T00:00:00").getTime() : null;
  const to = view.to ? new Date(view.to + "T23:59:59").getTime() : null;
  const q = view.search.toLowerCase();

  return entries.filter((e) => {
    if (view.user && e.user_email !== view.user) return false;
    if (view.action && e.action !== view.action) return false;

    const t = new Date(e.created_at).getTime();
    if (from && t < from) return false;
    if (to && t > to) return false;

    if (q) {
      const haystack = [
        e.user_email, describeAction(e).text, detailSummary(e)
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function filterBar(rerender) {
  const users = [...new Set((cache || []).map((e) => e.user_email).filter(Boolean))].sort();
  const actions = [...new Set((cache || []).map((e) => e.action).filter(Boolean))].sort();

  const search = ui.searchField({
    placeholder: "Kërko në regjistër…",
    value: view.search,
    onInput: (v) => { view.search = v; view.page = 1; rerender(); }
  });

  const userSel = ui.select({ id: "flt_user" },
    [{ value: "", label: "Të gjithë" }, ...users.map((u) => ({ value: u, label: u }))], view.user);
  userSel.addEventListener("change", () => { view.user = userSel.value; view.page = 1; rerender(); });

  const actionSel = ui.select({ id: "flt_action" },
    [{ value: "", label: "Të gjitha" },
     ...actions.map((a) => ({ value: a, label: (ACTIONS[a] || {}).label || a }))], view.action);
  actionSel.addEventListener("change", () => { view.action = actionSel.value; view.page = 1; rerender(); });

  const fromInput = ui.input({ type: "date", id: "flt_from", value: view.from });
  fromInput.addEventListener("change", () => { view.from = fromInput.value; view.page = 1; rerender(); });

  const toInput = ui.input({ type: "date", id: "flt_to", value: view.to });
  toInput.addEventListener("change", () => { view.to = toInput.value; view.page = 1; rerender(); });

  return ui.el("div", {}, [
    ui.el("div", { class: "toolbar" }, [ui.el("div", { class: "toolbar__search" }, [search])]),
    ui.el("div", { class: "filters" }, [
      ui.field({ label: "Përdoruesi", id: "flt_user", control: userSel }),
      ui.field({ label: "Veprimi", id: "flt_action", control: actionSel }),
      ui.field({ label: "Prej datës", id: "flt_from", control: fromInput }),
      ui.field({ label: "Deri më", id: "flt_to", control: toInput })
    ])
  ]);
}

/* ------------------------------------------------------------------ */
/* Tabela                                                              */
/* ------------------------------------------------------------------ */

function table(rows, totalRows, totalPages, rerender) {
  const body = ui.el("tbody");

  for (const entry of rows) {
    const info = describeAction(entry);
    const detail = detailSummary(entry);

    body.appendChild(ui.el("tr", {}, [
      ui.el("td", { class: "td-shrink" }, [
        ui.el("div", { class: "feed__icon feed__icon--" + info.tone }, [ui.icon(info.icon)])
      ]),
      ui.el("td", {}, [
        ui.el("div", { class: "cell-title", text: entry.user_email || "sistemi" })
      ]),
      ui.el("td", {}, [
        ui.el("div", { class: "text-sm", text: info.text })
      ]),
      ui.el("td", { class: "col-l2" }, [ui.badge(info.module, "muted", { noDot: true })]),
      ui.el("td", { class: "td-num col-l3 muted" }, [
        ui.el("div", { text: fmt.dateTime(entry.created_at) }),
        ui.el("div", { class: "cell-sub", text: fmt.relative(entry.created_at) })
      ]),
      ui.el("td", { class: "col-l3" }, [
        ui.el("span", { class: "text-xs muted", text: detail || "—" })
      ])
    ]));
  }

  const head = ui.el("tr", {}, [
    ui.el("th", { scope: "col", class: "td-shrink" }, [""]),
    ui.el("th", { scope: "col" }, ["Përdoruesi"]),
    ui.el("th", { scope: "col" }, ["Veprimi"]),
    ui.el("th", { scope: "col", class: "col-l2" }, ["Moduli"]),
    ui.el("th", { scope: "col", class: "col-l3" }, ["Koha"]),
    ui.el("th", { scope: "col", class: "col-l3" }, ["Detajet"])
  ]);

  const wrap = ui.el("div", { class: "table-wrap responsive" }, [
    ui.el("div", { class: "table-scroll" }, [
      ui.el("table", { class: "table" }, [ui.el("thead", {}, [head]), body])
    ])
  ]);

  /* Kartelat për telefon */
  const cards = ui.el("div", { class: "rowcards" });
  for (const entry of rows) {
    const info = describeAction(entry);
    cards.appendChild(ui.el("div", { class: "rowcard" }, [
      ui.el("div", { class: "rowcard__top" }, [
        ui.el("div", { class: "feed__icon feed__icon--" + info.tone }, [ui.icon(info.icon)]),
        ui.el("div", { class: "rowcard__body" }, [
          ui.el("div", { class: "rowcard__title", text: info.text }),
          ui.el("div", { class: "rowcard__meta", text: entry.user_email || "sistemi" }),
          ui.el("div", { class: "rowcard__meta", text: fmt.dateTime(entry.created_at) })
        ])
      ])
    ]));
  }
  wrap.appendChild(cards);

  /* Faqosja */
  if (totalPages > 1) {
    const from = (view.page - 1) * PAGE_SIZE + 1;
    const to = Math.min(view.page * PAGE_SIZE, totalRows);
    const pages = ui.el("div", { class: "pagination__pages" }, [
      ui.el("button", {
        class: "page-btn", type: "button", disabled: view.page === 1,
        "aria-label": "Faqja e mëparshme",
        onclick: () => { view.page--; rerender(); }
      }, [ui.icon("chevronLeft", 14)]),
      ui.el("span", { class: "pagination__info", text: view.page + " / " + totalPages }),
      ui.el("button", {
        class: "page-btn", type: "button", disabled: view.page === totalPages,
        "aria-label": "Faqja tjetër",
        onclick: () => { view.page++; rerender(); }
      }, [ui.icon("chevronRight", 14)])
    ]);

    wrap.appendChild(ui.el("div", { class: "pagination" }, [
      ui.el("span", { class: "pagination__info", text: from + "–" + to + " nga " + totalRows }),
      pages
    ]));
  }

  return wrap;
}

/* ------------------------------------------------------------------ */
/* Publikimi i fundit — lexohet nga regjistri për panelin kryesor      */
/* ------------------------------------------------------------------ */

export async function fetchLastPublish(api) {
  try {
    const res = await api.getActivityLog(50);
    const entries = (res && res.entries) || [];
    const hit = entries.find((e) => e.action === "publish_listings");
    if (!hit) return null;
    return {
      at: hit.created_at,
      email: hit.user_email,
      count: (hit.detail || {}).listingCount || null
    };
  } catch (_) {
    /* Redaktorët nuk kanë leje për regjistrin. Kjo nuk është gabim —
       thjesht nuk ka informacion për të shfaqur. */
    return null;
  }
}
