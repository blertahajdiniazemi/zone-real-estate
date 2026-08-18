/* =====================================================================
   PRONAT
   =====================================================================

   Moduli më i përdorur i panelit: lista, kërkimi, filtrat, renditja dhe
   veprimet mbi një pronë.

   Dy pika që ndryshojnë nga versioni i mëparshëm:

   • Renditja e listës NUK përcakton më se cila pronë është e veçuar.
     «E veçuar» është fushë e vetën, me çelës të qartë.

   • Fshirja kalon nga një modal i vërtetë, jo nga `confirm()` i
     shfletuesit.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as model from "../core/model.js";
import * as store from "../core/store.js";
import * as fmt from "../core/format.js";
import { openPropertyEditor, openPreview } from "./property-form.js";

const PAGE_SIZE = 25;

/* Gjendja e pamjes — jeton sa është e hapur faqja, jo më gjatë. */
const view = {
  search: "",
  lifecycle: "",
  transactionType: "",
  category: "",
  city: "",
  featured: "",
  sort: "order",
  dir: "asc",
  page: 1,
  showFilters: false
};

/** Lejon që kartelat e panelit kryesor të hapin listën tashmë të filtruar. */
export function applyPreset(preset) {
  Object.assign(view, {
    search: "", lifecycle: "", transactionType: "", category: "",
    city: "", featured: "", page: 1
  }, preset || {});
  if (preset && Object.keys(preset).length) view.showFilters = true;
}

/* ------------------------------------------------------------------ */
/* Filtrimi                                                            */
/* ------------------------------------------------------------------ */

function matches(p, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  /* Kërkimi mbulon titullin, kodin, lokacionin dhe përshkrimin —
     pikërisht ato që administratori mban mend për një pronë. */
  return [
    p.title, p.code, model.composeLocation(p), p.city, p.neighborhood,
    p.address, p.summary, p.details
  ].some((f) => String(f || "").toLowerCase().includes(q));
}

function filtered() {
  const all = store.get().properties;

  let rows = all.filter((p) =>
    matches(p, view.search) &&
    (!view.lifecycle || p.lifecycle === view.lifecycle) &&
    (!view.transactionType || p.transactionType === view.transactionType) &&
    (!view.category || p.category === view.category) &&
    (!view.city || p.city === view.city) &&
    (view.featured === "" ||
      (view.featured === "yes" ? p.featured : !p.featured))
  );

  const dir = view.dir === "desc" ? -1 : 1;
  const by = {
    order: (a, b) => a._order - b._order,
    title: (a, b) => String(a.title).localeCompare(String(b.title), "sq"),
    code: (a, b) => String(a.code).localeCompare(String(b.code), "sq"),
    price: (a, b) => (a.priceValue ?? -1) - (b.priceValue ?? -1),
    size: (a, b) => (a.sizeValue ?? -1) - (b.sizeValue ?? -1),
    city: (a, b) => String(a.city).localeCompare(String(b.city), "sq"),
    updated: (a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)
  }[view.sort] || ((a, b) => a._order - b._order);

  rows = rows.slice().sort((a, b) => by(a, b) * dir);
  return rows;
}

function hasActiveFilters() {
  return !!(view.lifecycle || view.transactionType || view.category || view.city || view.featured);
}

function clearFilters(rerender) {
  Object.assign(view, {
    lifecycle: "", transactionType: "", category: "", city: "", featured: "", page: 1
  });
  rerender();
}

/* ------------------------------------------------------------------ */
/* Veprimet                                                            */
/* ------------------------------------------------------------------ */

async function deleteProperty(p, rerender) {
  const ok = await ui.confirmDialog({
    title: "Fshi pronën?",
    message: "A jeni të sigurt që dëshironi ta fshini <b>" + ui.esc(p.title) + "</b>?",
    note: "Ky veprim nuk mund të kthehet pas publikimit të radhës.",
    confirmLabel: "Fshi Pronën",
    cancelLabel: "Anulo",
    danger: true
  });
  if (!ok) return;

  store.removeProperty(p.id);
  store.prunePendingImages();
  ui.toast("Prona u fshi.", { text: "Ndryshimi zbatohet në uebfaqe pas publikimit." });
  rerender();
}

function duplicateProperty(p, rerender) {
  const copy = model.duplicateProperty(p, store.get().properties);
  store.upsertProperty(copy);
  ui.toast("Prona u dublikua.", { text: copy.code + " u krijua si draft." });
  rerender();
  openPropertyEditor(copy, rerender);
}

function toggleFeatured(p, rerender) {
  const result = store.setFeatured(p.id, !p.featured);
  if (result && result.error) {
    ui.toast("Prona nuk mund të veçohet.", { type: "warning", text: result.error });
    return;
  }
  ui.toast(p.featured ? "Prona u veçua në ballinë." : "Prona u hoq nga ballina.");
  rerender();
}

async function changeLifecycle(p, lifecycle, rerender) {
  const meta = model.LIFECYCLES.find((l) => l.value === lifecycle);
  const willHide = !meta.public && model.lifecycleIsPublic(p.lifecycle);

  if (willHide) {
    const ok = await ui.confirmDialog({
      title: meta.label + " pronën?",
      message: "Prona <b>" + ui.esc(p.title) + "</b> nuk do të shfaqet më në uebfaqe pas publikimit.",
      confirmLabel: meta.label,
      cancelLabel: "Anulo",
      tone: "warning"
    });
    if (!ok) return;
  }

  store.setLifecycle(p.id, lifecycle);
  ui.toast("Statusi u ndryshua në «" + meta.label + "».");
  rerender();
}

function actionsFor(p, rerender) {
  const items = [
    { label: "Shiko Paraprakisht", icon: "eye", onClick: () => openPreview(p) },
    { label: "Ndrysho", icon: "edit", onClick: () => openPropertyEditor(p, rerender) },
    { label: "Dubliko", icon: "copy", onClick: () => duplicateProperty(p, rerender) },
    { separator: true },
    {
      label: p.featured ? "Hiq nga ballina" : "Vendos në ballinë",
      icon: "star",
      onClick: () => toggleFeatured(p, rerender)
    }
  ];

  if (p.lifecycle !== "active") {
    items.push({ label: "Aktivizo", icon: "checkCircle", onClick: () => changeLifecycle(p, "active", rerender) });
  }
  if (p.lifecycle !== "inactive") {
    items.push({ label: "Çaktivizo", icon: "pause", onClick: () => changeLifecycle(p, "inactive", rerender) });
  }
  if (p.lifecycle !== "archived") {
    items.push({ label: "Arkivo", icon: "archive", onClick: () => changeLifecycle(p, "archived", rerender) });
  }

  items.push({ separator: true });
  items.push({ label: "Fshi", icon: "trash", danger: true, onClick: () => deleteProperty(p, rerender) });

  return items;
}

/* ------------------------------------------------------------------ */
/* Elemente të përsëritura                                             */
/* ------------------------------------------------------------------ */

function lifecycleBadge(p) {
  return ui.badge(model.lifecycleLabel(p.lifecycle), model.lifecycleTone(p.lifecycle));
}

function thumbFor(p) {
  const base = (window.ZONE_ADMIN_CONFIG || {}).SITE_BASE;
  return ui.el("img", {
    class: "thumb",
    src: store.imageSource(p.coverImage, ui.PLACEHOLDER, base),
    alt: "",
    loading: "lazy",
    onerror: function () { this.onerror = null; this.src = ui.PLACEHOLDER; }
  });
}

function moreButton(p, rerender) {
  return ui.dropdown(
    ui.el("button", { class: "btn btn--quiet btn--icon", type: "button", "aria-label": "Veprime për " + p.title },
      [ui.icon("more")]),
    actionsFor(p, rerender)
  );
}

/* ------------------------------------------------------------------ */
/* Pamja                                                               */
/* ------------------------------------------------------------------ */

export function render(context) {
  const root = ui.el("div", { class: "view" });
  const rerender = () => context.refresh();

  const rows = filtered();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (view.page > totalPages) view.page = totalPages;
  const pageRows = rows.slice((view.page - 1) * PAGE_SIZE, view.page * PAGE_SIZE);

  /* ---------- Koka ---------- */
  root.appendChild(ui.el("div", { class: "view__head" }, [
    ui.el("div", {}, [
      ui.el("p", { class: "view__lede", text: "Të gjitha pronat e sistemit. Ndryshimet publikohen kur ju e vendosni." })
    ]),
    ui.el("button", {
      class: "btn btn--primary", type: "button",
      onclick: () => openPropertyEditor(null, rerender)
    }, [ui.icon("plus"), "Shto Pronë"])
  ]));

  /* ---------- Shiriti i mjeteve ---------- */
  const search = ui.searchField({
    placeholder: "Kërko sipas titullit, kodit ose lokacionit…",
    value: view.search,
    onInput: (v) => { view.search = v; view.page = 1; rerender(); }
  });

  const filterBtn = ui.el("button", {
    class: "btn " + (hasActiveFilters() ? "btn--secondary" : "btn--ghost"), type: "button",
    "aria-expanded": view.showFilters ? "true" : "false",
    onclick: () => { view.showFilters = !view.showFilters; rerender(); }
  }, [
    ui.icon("filter"), "Filtro",
    hasActiveFilters() ? ui.el("span", { class: "badge badge--primary", text: String(activeFilterCount()) }) : null
  ]);

  const viewToggle = ui.el("div", { class: "segmented", role: "group", "aria-label": "Mënyra e shfaqjes" }, [
    ui.el("button", {
      class: store.get().ui.propertiesView === "table" ? "is-active" : "", type: "button",
      "aria-pressed": store.get().ui.propertiesView === "table" ? "true" : "false",
      onclick: () => { store.setUi({ propertiesView: "table" }); rerender(); }
    }, [ui.icon("list"), "Tabelë"]),
    ui.el("button", {
      class: store.get().ui.propertiesView === "grid" ? "is-active" : "", type: "button",
      "aria-pressed": store.get().ui.propertiesView === "grid" ? "true" : "false",
      onclick: () => { store.setUi({ propertiesView: "grid" }); rerender(); }
    }, [ui.icon("grid"), "Rrjetë"])
  ]);

  root.appendChild(ui.el("div", { class: "toolbar" }, [
    ui.el("div", { class: "toolbar__search" }, [search]),
    filterBtn,
    ui.el("div", { class: "toolbar__spacer" }),
    ui.el("span", { class: "text-xs muted nowrap", text: fmt.plural(rows.length, "pronë", "prona") }),
    viewToggle
  ]));

  /* ---------- Filtrat ---------- */
  if (view.showFilters) root.appendChild(filterPanel(rerender));

  /* ---------- Gjendjet boshe ---------- */
  if (!store.get().properties.length) {
    root.appendChild(ui.emptyState({
      iconName: "building",
      title: "Nuk ka prona",
      text: "Ende nuk është shtuar asnjë pronë.",
      actionLabel: "Shto Pronë",
      onAction: () => openPropertyEditor(null, rerender)
    }));
    return root;
  }

  if (!rows.length) {
    root.appendChild(ui.emptyState({
      iconName: "search",
      title: "Nuk u gjet asnjë pronë",
      text: "Provoni të ndryshoni kërkimin ose filtrat.",
      secondaryLabel: "Pastro filtrat",
      onSecondary: () => { view.search = ""; clearFilters(rerender); }
    }));
    return root;
  }

  /* ---------- Lista ---------- */
  root.appendChild(
    store.get().ui.propertiesView === "grid"
      ? gridView(pageRows, rerender, rows.length, totalPages)
      : tableView(pageRows, rerender, rows.length, totalPages)
  );

  return root;
}

function activeFilterCount() {
  return [view.lifecycle, view.transactionType, view.category, view.city, view.featured]
    .filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/* Paneli i filtrave                                                   */
/* ------------------------------------------------------------------ */

function filterPanel(rerender) {
  const cities = store.groupBy((p) => p.city).map((r) => ({ value: r.name, label: r.name + " (" + r.count + ")" }));

  const make = (key, label, options) => {
    const sel = ui.select({ id: "flt_" + key },
      [{ value: "", label: "Të gjitha" }, ...options], view[key]);
    sel.addEventListener("change", () => { view[key] = sel.value; view.page = 1; rerender(); });
    return ui.field({ label, id: "flt_" + key, control: sel });
  };

  const panel = ui.el("div", { class: "filters" }, [
    make("lifecycle", "Statusi", model.LIFECYCLES.map((l) => ({ value: l.value, label: l.label }))),
    make("transactionType", "Shitje / Qira", model.TRANSACTION_TYPES.map((t) => ({ value: t.value, label: t.label }))),
    make("category", "Kategoria", model.CATEGORIES.map((c) => ({ value: c.value, label: c.label }))),
    make("city", "Qyteti", cities),
    make("featured", "E Veçuar", [{ value: "yes", label: "Vetëm të veçuara" }, { value: "no", label: "Jo të veçuara" }])
  ]);

  if (hasActiveFilters()) {
    panel.appendChild(ui.el("div", { class: "field", style: "display:flex;align-items:flex-end" }, [
      ui.el("button", {
        class: "btn btn--ghost btn--sm", type: "button",
        onclick: () => clearFilters(rerender)
      }, [ui.icon("close", 14), "Pastro filtrat"])
    ]));
  }

  return panel;
}

/* ------------------------------------------------------------------ */
/* Pamja tabelare                                                      */
/* ------------------------------------------------------------------ */

function tableView(rows, rerender, totalRows, totalPages) {
  const wrap = ui.el("div", { class: "table-wrap responsive" });

  const COLUMNS = [
    { key: "", label: "Foto", cls: "td-shrink" },
    { key: "code", label: "Kodi", sortable: true, cls: "col-l3" },
    { key: "title", label: "Titulli", sortable: true },
    { key: "city", label: "Lokacioni", sortable: true, cls: "col-l2" },
    { key: "", label: "Lloji", cls: "col-l3" },
    { key: "price", label: "Çmimi", sortable: true },
    { key: "size", label: "Sipërfaqja", sortable: true, cls: "col-l3" },
    { key: "", label: "Statusi" },
    { key: "", label: "E Veçuar", cls: "col-l2" },
    { key: "updated", label: "Ndryshuar", sortable: true, cls: "col-l3" },
    { key: "", label: "Veprimet", cls: "td-actions" }
  ];

  const head = ui.el("tr");
  for (const col of COLUMNS) {
    const isSorted = col.sortable && view.sort === col.key;
    const th = ui.el("th", {
      class: [col.cls, col.sortable ? "is-sortable" : "", isSorted ? "is-sorted" : ""].filter(Boolean).join(" "),
      scope: "col",
      "aria-sort": isSorted ? (view.dir === "asc" ? "ascending" : "descending") : null,
      onclick: col.sortable ? () => {
        if (view.sort === col.key) view.dir = view.dir === "asc" ? "desc" : "asc";
        else { view.sort = col.key; view.dir = "asc"; }
        rerender();
      } : null
    }, [
      col.label,
      col.sortable ? ui.el("span", { class: "sort-arrow", text: view.dir === "asc" ? "↑" : "↓" }) : null
    ]);
    head.appendChild(th);
  }

  const body = ui.el("tbody");
  for (const p of rows) {
    body.appendChild(ui.el("tr", {}, [
      ui.el("td", { class: "td-shrink" }, [thumbFor(p)]),
      ui.el("td", { class: "td-code col-l3", text: p.code }),
      ui.el("td", {}, [
        ui.el("div", { class: "cell-title", text: p.title || "Pa titull" }),
        ui.el("div", { class: "cell-sub", text: fmt.truncate(p.summary, 58) })
      ]),
      ui.el("td", { class: "col-l2" }, [
        ui.el("div", { class: "text-sm", text: p.city || "—" }),
        p.neighborhood ? ui.el("div", { class: "cell-sub", text: p.neighborhood }) : null
      ]),
      ui.el("td", { class: "col-l3" }, [
        ui.badge(model.transactionLabel(p.transactionType),
          p.transactionType === "rent" ? "info" : "primary")
      ]),
      ui.el("td", { class: "td-num", text: model.displayPrice(p) || "—" }),
      ui.el("td", { class: "td-num col-l3", text: model.displaySize(p) || "—" }),
      ui.el("td", {}, [lifecycleBadge(p)]),
      ui.el("td", { class: "col-l2" }, [
        p.featured
          ? ui.badge("E veçuar", "featured")
          : ui.el("span", { class: "muted text-xs", text: "—" })
      ]),
      ui.el("td", { class: "td-num col-l3 muted", text: fmt.relative(p.updatedAt) || "—" }),
      ui.el("td", { class: "td-actions" }, [
        ui.el("div", { class: "row row--tight row--end" }, [
          ui.el("button", {
            class: "btn btn--quiet btn--icon", type: "button", "aria-label": "Ndrysho " + p.title,
            onclick: () => openPropertyEditor(p, rerender)
          }, [ui.icon("edit")]),
          moreButton(p, rerender)
        ])
      ])
    ]));
  }

  wrap.appendChild(ui.el("div", { class: "table-scroll" }, [
    ui.el("table", { class: "table" }, [ui.el("thead", {}, [head]), body])
  ]));

  /* Në telefon të njëjtat rreshta shfaqen si kartela, jo si tabelë e ngushtuar. */
  wrap.appendChild(mobileCards(rows, rerender));
  wrap.appendChild(pagination(totalRows, totalPages, rerender));
  return wrap;
}

function mobileCards(rows, rerender) {
  const list = ui.el("div", { class: "rowcards" });

  for (const p of rows) {
    list.appendChild(ui.el("div", { class: "rowcard" }, [
      ui.el("div", { class: "rowcard__top" }, [
        thumbFor(p),
        ui.el("div", { class: "rowcard__body" }, [
          ui.el("div", { class: "rowcard__title", text: p.title || "Pa titull" }),
          ui.el("div", { class: "rowcard__meta", text: p.code + " · " + (model.composeLocation(p) || "—") }),
          ui.el("div", { class: "rowcard__meta", text: model.displayPrice(p) || "—" })
        ]),
        moreButton(p, rerender)
      ]),
      ui.el("div", { class: "rowcard__tags" }, [
        lifecycleBadge(p),
        ui.badge(model.transactionLabel(p.transactionType), p.transactionType === "rent" ? "info" : "primary"),
        p.featured ? ui.badge("E veçuar", "featured") : null,
        !p.images.length ? ui.badge("Pa foto", "warning") : null
      ]),
      ui.el("div", { class: "rowcard__foot" }, [
        ui.el("span", { class: "text-xs muted", text: fmt.relative(p.updatedAt) || "—" }),
        ui.el("button", {
          class: "btn btn--ghost btn--sm", type: "button",
          onclick: () => openPropertyEditor(p, rerender)
        }, [ui.icon("edit"), "Ndrysho"])
      ])
    ]));
  }

  return list;
}

/* ------------------------------------------------------------------ */
/* Pamja me rrjetë                                                     */
/* ------------------------------------------------------------------ */

function gridView(rows, rerender, totalRows, totalPages) {
  const grid = ui.el("div", { class: "prop-grid" });

  for (const p of rows) {
    const base = (window.ZONE_ADMIN_CONFIG || {}).SITE_BASE;

    grid.appendChild(ui.el("article", { class: "prop-card" }, [
      ui.el("div", { class: "prop-card__figure" }, [
        ui.el("img", {
          class: "prop-card__img",
          src: store.imageSource(p.coverImage, ui.PLACEHOLDER, base),
          alt: "", loading: "lazy",
          onerror: function () { this.onerror = null; this.src = ui.PLACEHOLDER; }
        }),
        ui.el("div", { class: "prop-card__tags" }, [
          lifecycleBadge(p),
          p.featured ? ui.badge("E veçuar", "featured") : null
        ]),
        p.images.length > 1 ? ui.el("span", { class: "prop-card__count" }, [
          ui.icon("image", 11), String(p.images.length)
        ]) : null
      ]),
      ui.el("div", { class: "prop-card__body" }, [
        ui.el("h3", { class: "prop-card__title", text: p.title || "Pa titull" }),
        ui.el("div", { class: "prop-card__loc", text: model.composeLocation(p) || "—" }),
        ui.el("div", { class: "prop-card__price", text: model.displayPrice(p) || "—" }),
        ui.el("div", {
          class: "prop-card__specs",
          text: [
            p.beds != null ? p.beds + " dh" : null,
            p.baths != null ? p.baths + " bnj" : null,
            model.displaySize(p) || null
          ].filter(Boolean).join(" · ") || "—"
        })
      ]),
      ui.el("div", { class: "prop-card__foot" }, [
        ui.el("span", { class: "td-code", text: p.code }),
        ui.el("div", { class: "row row--tight" }, [
          ui.el("button", {
            class: "btn btn--quiet btn--icon", type: "button", "aria-label": "Ndrysho " + p.title,
            onclick: () => openPropertyEditor(p, rerender)
          }, [ui.icon("edit")]),
          moreButton(p, rerender)
        ])
      ])
    ]));
  }

  return ui.el("div", {}, [grid, pagination(totalRows, totalPages, rerender)]);
}

/* ------------------------------------------------------------------ */
/* Faqosja                                                             */
/* ------------------------------------------------------------------ */

function pagination(totalRows, totalPages, rerender) {
  if (totalPages <= 1) return ui.el("div", { hidden: true });

  const from = (view.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(view.page * PAGE_SIZE, totalRows);

  const pages = ui.el("div", { class: "pagination__pages" });

  const go = (n) => { view.page = n; rerender(); };

  pages.appendChild(ui.el("button", {
    class: "page-btn", type: "button", disabled: view.page === 1,
    "aria-label": "Faqja e mëparshme", onclick: () => go(view.page - 1)
  }, [ui.icon("chevronLeft", 14)]));

  /* Numrat rreth faqes aktuale, me pika kur ka boshllëk. */
  const window_ = new Set([1, totalPages, view.page, view.page - 1, view.page + 1]);
  let last = 0;
  for (let n = 1; n <= totalPages; n++) {
    if (!window_.has(n)) continue;
    if (n - last > 1) pages.appendChild(ui.el("span", { class: "muted text-xs", text: "…" }));
    pages.appendChild(ui.el("button", {
      class: "page-btn" + (n === view.page ? " is-active" : ""), type: "button",
      "aria-current": n === view.page ? "page" : null,
      onclick: () => go(n)
    }, [String(n)]));
    last = n;
  }

  pages.appendChild(ui.el("button", {
    class: "page-btn", type: "button", disabled: view.page === totalPages,
    "aria-label": "Faqja tjetër", onclick: () => go(view.page + 1)
  }, [ui.icon("chevronRight", 14)]));

  return ui.el("div", { class: "pagination" }, [
    ui.el("span", { class: "pagination__info", text: from + "–" + to + " nga " + totalRows }),
    pages
  ]);
}

/* ------------------------------------------------------------------ */
/* Pronat e veçuara — renditja e ballinës                              */
/* ------------------------------------------------------------------ */

/** Faqe e vogël e veçantë: cilat prona janë në ballinë dhe në ç'radhë. */
export function renderFeatured(context) {
  const root = ui.el("div", { class: "view" });
  const rerender = () => context.refresh();

  const featured = store.get().properties
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999));

  root.appendChild(ui.el("div", { class: "view__head" }, [
    ui.el("p", {
      class: "view__lede",
      text: "Pronat që shfaqen në pjesën kryesore të uebfaqes. Renditja këtu është renditja atje."
    })
  ]));

  if (!featured.length) {
    root.appendChild(ui.emptyState({
      iconName: "star",
      title: "Asnjë pronë e veçuar",
      text: "Hapni një pronë dhe ndizni «E veçuar në ballinë».",
      secondaryLabel: "Shko te Pronat",
      onSecondary: () => context.navigate("properties")
    }));
    return root;
  }

  const list = ui.el("div", { class: "stack" });

  featured.forEach((p, index) => {
    list.appendChild(ui.el("div", { class: "rowcard" }, [
      ui.el("div", { class: "rowcard__top" }, [
        ui.el("span", {
          class: "avatar", style: "border-radius:var(--r-sm)", text: String(index + 1)
        }),
        thumbFor(p),
        ui.el("div", { class: "rowcard__body" }, [
          ui.el("div", { class: "rowcard__title", text: p.title }),
          ui.el("div", { class: "rowcard__meta", text: p.code + " · " + model.displayPrice(p) })
        ]),
        ui.el("div", { class: "row row--tight" }, [
          ui.el("button", {
            class: "btn btn--quiet btn--icon", type: "button", "aria-label": "Lëviz lart",
            disabled: index === 0,
            onclick: () => { store.moveFeatured(p.id, index - 1); rerender(); }
          }, [ui.icon("chevronLeft", 15)]),
          ui.el("button", {
            class: "btn btn--quiet btn--icon", type: "button", "aria-label": "Lëviz poshtë",
            disabled: index === featured.length - 1,
            onclick: () => { store.moveFeatured(p.id, index + 1); rerender(); }
          }, [ui.icon("chevronRight", 15)]),
          ui.el("button", {
            class: "btn btn--ghost btn--sm", type: "button",
            onclick: () => { store.setFeatured(p.id, false); ui.toast("Prona u hoq nga ballina."); rerender(); }
          }, ["Hiq"])
        ])
      ])
    ]));
  });

  root.appendChild(list);
  return root;
}
