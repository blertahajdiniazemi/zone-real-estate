/* =====================================================================
   PËRDORUESIT
   =====================================================================

   Ndërfaqja që i mungonte funksionalitetit serverik ekzistues:

     admin_list_users · admin_set_role · admin_set_active

   Asnjë logjikë lejesh nuk rishkruhet këtu. Serveri mbetet burimi i
   vërtetës: ai i refuzon vetë kërkesat e një jo-administratori, e
   ndalon ndryshimin e rolit të vetvetes dhe e bllokon kyçjen kur një
   llogari çaktivizohet. Fshehja e butonave këtu është vetëm mirësjellje
   ndaj përdoruesit, jo mbrojtje.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as store from "../core/store.js";
import * as fmt from "../core/format.js";
import { invalidate as invalidateActivity } from "./activity.js";

const ROLES = [
  { value: "admin", label: "Administrator", hint: "Qasje e plotë, përfshirë përdoruesit dhe regjistrin." },
  { value: "editor", label: "Redaktor", hint: "Menaxhon dhe publikon pronat." }
];

const roleLabel = (r) => (ROLES.find((x) => x.value === r) || {}).label || r || "—";

const view = { search: "", role: "", status: "" };

let cache = null;
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
      text: "Menaxhimi i përdoruesve është i disponueshëm vetëm për administratorët."
    }));
    return root;
  }

  root.appendChild(ui.el("div", { class: "view__head" }, [
    ui.el("p", { class: "view__lede", text: "Punonjësit që kanë qasje në panelin administrativ." }),
    ui.el("button", {
      class: "btn btn--ghost", type: "button",
      onclick: () => { invalidate(); rerender(); }
    }, [ui.icon("refresh"), "Rifresko"])
  ]));

  const container = ui.el("div");
  root.appendChild(container);

  if (cache === null && !loading) {
    loading = true;
    loadError = "";
    context.api.listUsers()
      .then((res) => { cache = (res && res.users) || []; })
      .catch((e) => { loadError = e.message || "Lista e përdoruesve nuk u ngarkua dot."; cache = []; })
      .finally(() => { loading = false; rerender(); });
  }

  if (loading || cache === null) {
    const table = ui.el("table", { class: "table" }, [ui.el("tbody")]);
    ui.$("tbody", table).appendChild(ui.skeletonRows(5, 5));
    container.appendChild(ui.el("div", { class: "table-wrap" }, [
      ui.el("div", { class: "table-scroll" }, [table])
    ]));
    return root;
  }

  if (loadError) {
    container.appendChild(ui.el("div", { class: "callout callout--error" }, [
      ui.icon("alert"), ui.el("div", { text: loadError })
    ]));
    return root;
  }

  container.appendChild(toolbar(rerender));

  const rows = applyFilters(cache);

  if (!rows.length) {
    container.appendChild(ui.emptyState({
      iconName: "users",
      title: cache.length ? "Nuk u gjet asnjë përdorues" : "Nuk ka përdorues",
      text: cache.length
        ? "Provoni të ndryshoni kërkimin ose filtrat."
        : "Përdoruesit shtohen nga paneli i Supabase-it.",
      secondaryLabel: cache.length ? "Pastro filtrat" : null,
      onSecondary: () => { Object.assign(view, { search: "", role: "", status: "" }); rerender(); }
    }));
    return root;
  }

  container.appendChild(table(rows, context, rerender));
  return root;
}

function applyFilters(users) {
  const q = view.search.toLowerCase();
  return users.filter((u) => {
    if (view.role && String(u.role || "").toLowerCase() !== view.role) return false;
    if (view.status === "active" && u.active === false) return false;
    if (view.status === "inactive" && u.active !== false) return false;
    if (q) {
      const haystack = [u.email, u.full_name].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function toolbar(rerender) {
  const search = ui.searchField({
    placeholder: "Kërko sipas emrit ose email-it…",
    value: view.search,
    onInput: (v) => { view.search = v; rerender(); }
  });

  const roleSel = ui.select({ id: "flt_role" },
    [{ value: "", label: "Të gjitha rolet" }, ...ROLES.map((r) => ({ value: r.value, label: r.label }))],
    view.role);
  roleSel.addEventListener("change", () => { view.role = roleSel.value; rerender(); });

  const statusSel = ui.select({ id: "flt_status" }, [
    { value: "", label: "Të gjitha statuset" },
    { value: "active", label: "Aktiv" },
    { value: "inactive", label: "Joaktiv" }
  ], view.status);
  statusSel.addEventListener("change", () => { view.status = statusSel.value; rerender(); });

  return ui.el("div", { class: "toolbar" }, [
    ui.el("div", { class: "toolbar__search" }, [search]),
    roleSel, statusSel
  ]);
}

/* ------------------------------------------------------------------ */
/* Tabela                                                              */
/* ------------------------------------------------------------------ */

function table(users, context, rerender) {
  const meEmail = (store.get().me || {}).email;
  const body = ui.el("tbody");

  for (const user of users) {
    const isSelf = user.email === meEmail;
    const active = user.active !== false;

    body.appendChild(ui.el("tr", {}, [
      ui.el("td", { class: "td-shrink" }, [
        ui.el("span", { class: "avatar", text: fmt.initials(user.full_name || user.email) })
      ]),
      ui.el("td", {}, [
        ui.el("div", { class: "cell-title", text: user.full_name || "—" }),
        isSelf ? ui.el("div", { class: "cell-sub", text: "Ju" }) : null
      ]),
      ui.el("td", {}, [ui.el("span", { class: "text-sm", text: user.email || "—" })]),
      ui.el("td", {}, [ui.badge(roleLabel(String(user.role || "").toLowerCase()),
        String(user.role).toLowerCase() === "admin" ? "primary" : "info")]),
      ui.el("td", {}, [ui.badge(active ? "Aktiv" : "Joaktiv", active ? "success" : "muted")]),
      ui.el("td", { class: "td-num col-l3 muted", text: fmt.date(user.created_at) || "—" }),
      ui.el("td", { class: "td-actions" }, [
        isSelf
          /* Serveri e refuzon gjithsesi ndryshimin e vetvetes; këtu
             thjesht nuk i ofrojmë një veprim që do të dështonte. */
          ? ui.el("span", { class: "text-xs muted", text: "—" })
          : ui.dropdown(
              ui.el("button", {
                class: "btn btn--quiet btn--icon", type: "button",
                "aria-label": "Veprime për " + user.email
              }, [ui.icon("more")]),
              [
                { label: "Ndrysho rolin", icon: "key", onClick: () => changeRole(user, context, rerender) },
                { separator: true },
                active
                  ? { label: "Çaktivizo", icon: "pause", danger: true, onClick: () => setActive(user, false, context, rerender) }
                  : { label: "Aktivizo", icon: "checkCircle", onClick: () => setActive(user, true, context, rerender) }
              ]
            )
      ])
    ]));
  }

  const head = ui.el("tr", {}, [
    ui.el("th", { scope: "col", class: "td-shrink" }, [""]),
    ui.el("th", { scope: "col" }, ["Emri"]),
    ui.el("th", { scope: "col" }, ["Email"]),
    ui.el("th", { scope: "col" }, ["Roli"]),
    ui.el("th", { scope: "col" }, ["Statusi"]),
    ui.el("th", { scope: "col", class: "col-l3" }, ["Data e krijimit"]),
    ui.el("th", { scope: "col", class: "td-actions" }, ["Veprimet"])
  ]);

  const wrap = ui.el("div", { class: "table-wrap responsive" }, [
    ui.el("div", { class: "table-scroll" }, [
      ui.el("table", { class: "table" }, [ui.el("thead", {}, [head]), body])
    ])
  ]);

  /* Kartelat për telefon */
  const cards = ui.el("div", { class: "rowcards" });
  for (const user of users) {
    const isSelf = user.email === meEmail;
    const active = user.active !== false;

    cards.appendChild(ui.el("div", { class: "rowcard" }, [
      ui.el("div", { class: "rowcard__top" }, [
        ui.el("span", { class: "avatar", text: fmt.initials(user.full_name || user.email) }),
        ui.el("div", { class: "rowcard__body" }, [
          ui.el("div", { class: "rowcard__title", text: user.full_name || user.email }),
          ui.el("div", { class: "rowcard__meta", text: user.email })
        ])
      ]),
      ui.el("div", { class: "rowcard__tags" }, [
        ui.badge(roleLabel(String(user.role || "").toLowerCase()),
          String(user.role).toLowerCase() === "admin" ? "primary" : "info"),
        ui.badge(active ? "Aktiv" : "Joaktiv", active ? "success" : "muted")
      ]),
      isSelf ? null : ui.el("div", { class: "rowcard__foot" }, [
        ui.el("button", {
          class: "btn btn--ghost btn--sm", type: "button",
          onclick: () => changeRole(user, context, rerender)
        }, [ui.icon("key"), "Roli"]),
        ui.el("button", {
          class: "btn btn--ghost btn--sm", type: "button",
          onclick: () => setActive(user, !active, context, rerender)
        }, [active ? "Çaktivizo" : "Aktivizo"])
      ])
    ]));
  }
  wrap.appendChild(cards);

  return wrap;
}

/* ------------------------------------------------------------------ */
/* Ndryshimi i rolit                                                   */
/* ------------------------------------------------------------------ */

function changeRole(user, context, rerender) {
  const current = String(user.role || "").toLowerCase();
  let chosen = current;

  const options = ui.el("div", { class: "stack stack--sm" });
  const inputs = [];

  for (const role of ROLES) {
    const radio = ui.el("input", {
      type: "radio", name: "role", value: role.value,
      checked: role.value === current
    });
    radio.addEventListener("change", () => { chosen = role.value; });
    inputs.push(radio);

    options.appendChild(ui.el("label", {
      class: "check", style: "padding:var(--sp-3);border:1px solid var(--border);border-radius:var(--r-md)"
    }, [
      radio,
      ui.el("span", { class: "check__box", style: "border-radius:50%" }),
      ui.el("span", {}, [
        ui.el("div", { text: role.label }),
        ui.el("small", { class: "muted text-xs", text: role.hint })
      ])
    ]));
  }

  const saveBtn = ui.el("button", { class: "btn btn--primary", type: "button" }, ["Ruaj Ndryshimet"]);
  const cancelBtn = ui.el("button", { class: "btn btn--ghost", type: "button" }, ["Anulo"]);

  const modal = ui.openModal({
    title: "Ndrysho rolin",
    subtitle: user.email,
    body: ui.el("div", {}, [options]),
    footer: ui.el("div", { class: "row row--end row--tight", style: "width:100%" }, [cancelBtn, saveBtn])
  });

  cancelBtn.addEventListener("click", () => modal.close());

  saveBtn.addEventListener("click", async () => {
    if (chosen === current) { modal.close(); return; }

    ui.setBusy(saveBtn, true, "Duke ruajtur…");
    try {
      await context.api.setUserRole(user.id, chosen);
      user.role = chosen;
      ui.toast("Roli u ndryshua me sukses.", { text: user.email + " → " + roleLabel(chosen) });
      invalidateActivity();
      modal.close();
      rerender();
    } catch (e) {
      ui.setBusy(saveBtn, false);
      ui.toast("Roli nuk u ndryshua.", { type: "error", text: e.message });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Aktivizimi / çaktivizimi                                            */
/* ------------------------------------------------------------------ */

async function setActive(user, active, context, rerender) {
  const ok = await ui.confirmDialog({
    title: active ? "Aktivizo përdoruesin?" : "Çaktivizo përdoruesin?",
    message: active
      ? "<b>" + ui.esc(user.email) + "</b> do të mund të kyçet përsëri në panel."
      : "<b>" + ui.esc(user.email) + "</b> nuk do të mund të hyjë në panel derisa të aktivizohet përsëri.",
    confirmLabel: active ? "Aktivizo" : "Çaktivizo",
    cancelLabel: "Anulo",
    danger: !active,
    tone: active ? "info" : "danger"
  });
  if (!ok) return;

  try {
    await context.api.setUserActive(user.id, active);
    user.active = active;
    ui.toast(active ? "Përdoruesi u aktivizua." : "Përdoruesi u çaktivizua.");
    invalidateActivity();
    rerender();
  } catch (e) {
    ui.toast("Statusi nuk u ndryshua.", { type: "error", text: e.message });
  }
}
