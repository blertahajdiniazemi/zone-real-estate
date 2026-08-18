/* =====================================================================
   PANELI KRYESOR
   =====================================================================

   Çdo numër këtu vjen nga të dhënat e vërteta të sistemit.

   Nuk ka të ardhura, nuk ka klientë, nuk ka konvertim shitjesh dhe nuk
   ka performancë agjentësh — sepse ato të dhëna ende nuk ekzistojnë.
   Kur një kategori është bosh, shfaqet 0. Një numër i trilluar do të
   ishte më i keq se një zero e ndershme.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as model from "../core/model.js";
import * as store from "../core/store.js";
import * as fmt from "../core/format.js";
import { describeAction } from "./activity.js";

export function render(context) {
  const root = ui.el("div", { class: "view" });
  const s = store.stats();
  const changes = store.changeSummary();

  /* ---------------- Koka ---------------- */
  root.appendChild(ui.el("div", { class: "view__head" }, [
    ui.el("div", {}, [
      ui.el("p", { class: "view__lede", text: greeting() })
    ]),
    ui.el("div", { class: "row row--tight" }, [
      ui.el("button", {
        class: "btn btn--ghost", type: "button",
        onclick: () => context.openSite()
      }, [ui.icon("external"), "Shiko Uebfaqen"]),
      ui.el("button", {
        class: "btn btn--primary", type: "button",
        onclick: () => context.navigate("property-new")
      }, [ui.icon("plus"), "Shto Pronë"])
    ])
  ]));

  /* ---------------- Gjendja e publikimit ----------------
     Pyetja e parë e çdo mëngjesi: a ka mbetur diçka pa dalë live? */
  root.appendChild(publishStatusCard(context, changes));

  /* ---------------- Statistikat ---------------- */
  const cards = [
    { label: "Gjithsej Prona", value: s.total, preset: {} },
    { label: "Prona Aktive", value: s.active, preset: { lifecycle: "active" } },
    { label: "Në Shitje", value: s.forSale, preset: { transactionType: "sale" } },
    { label: "Me Qira", value: s.forRent, preset: { transactionType: "rent" } },
    { label: "Të Shitura", value: s.sold, preset: { lifecycle: "sold" } },
    { label: "Të Dhëna me Qira", value: s.rented, preset: { lifecycle: "rented" } },
    { label: "Prona të Veçuara", value: s.featured, preset: { featured: "yes" } },
    { label: "Draft", value: s.draft, preset: { lifecycle: "draft" } }
  ];

  const grid = ui.el("div", { class: "stat-grid" });
  for (const card of cards) {
    grid.appendChild(ui.el("button", {
      class: "stat", type: "button",
      onclick: () => context.navigate("properties", card.preset)
    }, [
      ui.el("div", { class: "stat__label", text: card.label }),
      ui.el("div", {
        class: "stat__value" + (card.value === 0 ? " stat__value--muted" : ""),
        text: fmt.num(card.value)
      })
    ]));
  }

  root.appendChild(ui.el("div", { class: "section" }, [grid]));

  /* ---------------- Ato që kërkojnë vëmendje ---------------- */
  const attention = buildAttention(s, context);
  if (attention) root.appendChild(attention);

  /* ---------------- Shpërndarjet ---------------- */
  root.appendChild(ui.el("div", { class: "section" }, [
    ui.el("div", { class: "dash-grid" }, [
      distributionCard("Pronat sipas statusit",
        model.LIFECYCLES
          .map((l) => ({ name: l.label, count: store.get().properties.filter((p) => p.lifecycle === l.value).length, tone: l.tone }))
          .filter((r) => r.count > 0),
        s.total),

      distributionCard("Shitje kundrejt qirave", [
        { name: "Për shitje", count: s.forSale, tone: "primary" },
        { name: "Me qira", count: s.forRent, tone: "info" }
      ].filter((r) => r.count > 0), s.forSale + s.forRent),

      distributionCard("Pronat sipas lokacionit",
        store.groupBy((p) => p.city, 6).map((r) => ({ ...r, tone: "secondary" })),
        s.total),

      distributionCard("Pronat sipas kategorisë",
        store.groupBy((p) => model.categoryLabel(p.category), 6)
          .filter((r) => r.name !== "—")
          .map((r) => ({ ...r, tone: "primary" })),
        s.total)
    ])
  ]));

  /* ---------------- Aktiviteti i fundit ---------------- */
  root.appendChild(recentActivity(context));

  return root;
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "Mirëmëngjes" : h < 18 ? "Mirëdita" : "Mirëmbrëma";
  const me = store.get().me;
  const name = me && (me.full_name || (me.email || "").split("@")[0]);
  return part + (name ? ", " + name : "") + " — kjo është gjendja e sistemit sot.";
}

/* ------------------------------------------------------------------ */
/* Gjendja e publikimit                                                */
/* ------------------------------------------------------------------ */

function publishStatusCard(context, changes) {
  const dirty = changes.total > 0 || changes.images > 0;
  const last = store.get().lastPublish;

  const parts = [];
  if (changes.added) parts.push(fmt.plural(changes.added, "pronë e re", "prona të reja"));
  if (changes.edited) parts.push(fmt.plural(changes.edited, "pronë e ndryshuar", "prona të ndryshuara"));
  if (changes.removed) parts.push(fmt.plural(changes.removed, "pronë e fshirë", "prona të fshira"));
  if (changes.images) parts.push(fmt.plural(changes.images, "fotografi e re", "fotografi të reja"));
  if (changes.site) parts.push("cilësimet e faqes");

  const body = ui.el("div", { class: "card__body row", style: "justify-content:space-between" }, [
    ui.el("div", { class: "row row--tight grow" }, [
      ui.el("div", {
        class: "confirm-icon confirm-icon--" + (dirty ? "warning" : "info"),
        style: "margin:0;width:38px;height:38px"
      }, [ui.icon(dirty ? "alert" : "checkCircle")]),
      ui.el("div", { class: "grow" }, [
        ui.el("div", {
          class: "text-sm",
          style: "font-weight:500",
          text: dirty
            ? fmt.plural(changes.total + changes.images, "ndryshim i papublikuar", "ndryshime të papublikuara")
            : "Të gjitha ndryshimet janë publikuar"
        }),
        ui.el("div", {
          class: "text-xs muted",
          text: dirty
            ? parts.join(" · ")
            : (last
                ? "Publikimi i fundit: " + fmt.dateTime(last.at) + " nga " + last.email
                : "Uebfaqja përputhet me atë që keni këtu.")
        })
      ])
    ]),
    dirty
      ? ui.el("button", {
          class: "btn btn--primary", type: "button", onclick: () => context.openPublish()
        }, [ui.icon("publish"), "Publiko Ndryshimet"])
      : null
  ]);

  return ui.el("div", { class: "card section" }, [body]);
}

/* ------------------------------------------------------------------ */
/* Çfarë kërkon vëmendje                                               */
/* ------------------------------------------------------------------ */

function buildAttention(s, context) {
  const items = [];

  if (s.noPhoto) {
    items.push({
      text: fmt.plural(s.noPhoto, "pronë është pa fotografi", "prona janë pa fotografi"),
      action: "Shiko", preset: {}
    });
  }
  if (s.draft) {
    items.push({
      text: fmt.plural(s.draft, "pronë është ende draft", "prona janë ende draft"),
      action: "Shiko", preset: { lifecycle: "draft" }
    });
  }
  if (!s.featured && s.published) {
    items.push({
      text: "Asnjë pronë nuk është e veçuar në ballinë",
      action: "Rregullo", preset: {}, route: "featured"
    });
  }

  if (!items.length) return null;

  const list = ui.el("div", { class: "stack stack--sm" });
  for (const item of items) {
    list.appendChild(ui.el("div", { class: "callout callout--warning" }, [
      ui.icon("alert"),
      ui.el("div", { class: "grow", text: item.text }),
      ui.el("button", {
        class: "linkbtn nowrap", type: "button",
        onclick: () => context.navigate(item.route || "properties", item.preset)
      }, [item.action])
    ]));
  }

  return ui.el("div", { class: "section" }, [
    ui.el("div", { class: "section__head" }, [
      ui.el("h2", { class: "section__title", text: "Kërkojnë vëmendje" })
    ]),
    list
  ]);
}

/* ------------------------------------------------------------------ */
/* Shpërndarjet                                                        */
/* ------------------------------------------------------------------ */

const TONE_CLASS = {
  success: "bar__fill--success", info: "bar__fill--info",
  warning: "bar__fill--secondary", muted: "bar__fill--muted",
  primary: "", secondary: "bar__fill--secondary"
};

function distributionCard(title, rows, total) {
  const card = ui.el("div", { class: "card" }, [
    ui.el("div", { class: "card__head" }, [ui.el("h3", { class: "card__title", text: title })])
  ]);

  if (!rows.length) {
    card.appendChild(ui.el("div", { class: "card__body" }, [
      ui.el("p", { class: "muted text-sm", style: "margin:0", text: "Nuk ka të dhëna ende." })
    ]));
    return card;
  }

  const max = Math.max(...rows.map((r) => r.count), 1);
  const bars = ui.el("div", { class: "bars" });

  for (const row of rows) {
    const pct = Math.round((row.count / (total || 1)) * 100);
    bars.appendChild(ui.el("div", {}, [
      ui.el("div", { class: "bar__top" }, [
        ui.el("span", { class: "bar__name", text: row.name }),
        ui.el("span", { class: "bar__num", text: fmt.num(row.count) + " · " + pct + "%" })
      ]),
      ui.el("div", { class: "bar__track" }, [
        ui.el("div", {
          class: "bar__fill " + (TONE_CLASS[row.tone] || ""),
          style: "width:" + Math.round((row.count / max) * 100) + "%"
        })
      ])
    ]));
  }

  card.appendChild(ui.el("div", { class: "card__body" }, [bars]));
  return card;
}

/* ------------------------------------------------------------------ */
/* Aktiviteti i fundit                                                 */
/* ------------------------------------------------------------------ */

function recentActivity(context) {
  const section = ui.el("div", { class: "section" }, [
    ui.el("div", { class: "section__head" }, [
      ui.el("h2", { class: "section__title", text: "Aktivitetet e Fundit" }),
      store.isAdmin()
        ? ui.el("button", {
            class: "linkbtn", type: "button", onclick: () => context.navigate("activity")
          }, ["Shiko të gjitha"])
        : null
    ])
  ]);

  const card = ui.el("div", { class: "card" });
  const body = ui.el("div", { class: "card__body" });
  card.appendChild(body);
  section.appendChild(card);

  /* Regjistri është veprim vetëm për administratorë. Redaktorët nuk e
     shohin — dhe as nuk u premtohet një kuti bosh pa shpjegim. */
  if (!store.isAdmin()) {
    body.appendChild(ui.el("p", {
      class: "muted text-sm", style: "margin:0",
      text: "Regjistri i aktivitetit është i disponueshëm për administratorët."
    }));
    return section;
  }

  body.appendChild(ui.el("div", { class: "loading-row" }, [
    ui.el("span", { class: "spinner" }),
    ui.el("span", { text: "Duke ngarkuar aktivitetin…" })
  ]));

  context.api.getActivityLog(8).then((res) => {
    ui.clear(body);
    const entries = (res && res.entries) || [];

    if (!entries.length) {
      body.appendChild(ui.el("p", {
        class: "muted text-sm", style: "margin:0",
        text: "Ende nuk ka aktivitet të regjistruar."
      }));
      return;
    }

    const feed = ui.el("div", { class: "feed" });
    for (const entry of entries) {
      const info = describeAction(entry);
      feed.appendChild(ui.el("div", { class: "feed__item" }, [
        ui.el("div", { class: "feed__icon feed__icon--" + info.tone }, [ui.icon(info.icon)]),
        ui.el("div", { class: "feed__body" }, [
          ui.el("div", { class: "feed__text", text: info.text }),
          ui.el("div", {
            class: "feed__meta",
            text: (entry.user_email || "sistemi") + " · " + fmt.relative(entry.created_at)
          })
        ])
      ]));
    }
    body.appendChild(feed);
  }).catch(() => {
    ui.clear(body);
    body.appendChild(ui.el("p", {
      class: "muted text-sm", style: "margin:0",
      text: "Aktiviteti nuk u ngarkua dot për momentin."
    }));
  });

  return section;
}
