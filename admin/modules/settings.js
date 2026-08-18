/* =====================================================================
   CILËSIMET
   =====================================================================

   Vlerat që shfaqen në të gjithë uebfaqen publike: numri i telefonit,
   zona dhe muaji i përditësimit.

   Këto ruhen te listings.js bashkë me pronat, prandaj ato dalin live me
   të njëjtin publikim.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as store from "../core/store.js";
import * as fmt from "../core/format.js";

export function render(context) {
  const root = ui.el("div", { class: "view" });
  const site = store.get().site;

  root.appendChild(ui.el("div", { class: "view__head" }, [
    ui.el("p", { class: "view__lede", text: "Vlerat që shfaqen në çdo faqe të uebfaqes publike." })
  ]));

  /* ---------------- Kontakti ---------------- */
  const grid = ui.el("div", { class: "form-grid" });

  const makeField = (key, label, options = {}) => {
    const control = ui.input({ id: "set_" + key, placeholder: options.placeholder || "" });
    control.value = site[key] || "";
    control.addEventListener("input", () => {
      store.setSite({ [key]: control.value });
      validate();
    });
    return ui.field({
      label, id: "set_" + key, control, hint: options.hint, required: options.required
    });
  };

  const phoneField = makeField("DISPLAY_PHONE", "Numri që shfaqet", {
    placeholder: "+383 49 588 211", required: true,
    hint: "Ashtu si duhet ta lexojë vizitori."
  });

  const callField = makeField("CALL_PHONE", "Numri që thirret", {
    placeholder: "+38349588211", required: true,
    hint: "Vetëm shifra dhe +. Ky përdoret te lidhja tel:."
  });

  const cityField = makeField("CITY", "Zona", { placeholder: "Kosovë" });

  const updatedControl = ui.input({ id: "set_LAST_UPDATED", placeholder: fmt.monthYear(new Date()) });
  updatedControl.value = site.LAST_UPDATED || "";
  updatedControl.addEventListener("input", () => store.setSite({ LAST_UPDATED: updatedControl.value }));

  const updatedField = ui.field({
    label: "Përditësuar", id: "set_LAST_UPDATED", control: updatedControl,
    hint: "Shfaqet në ballinë si shenjë freskie."
  });

  grid.append(phoneField, callField, cityField, updatedField);

  /* Butoni që e vendos muajin aktual pa e shkruar me dorë. */
  const nowBtn = ui.el("button", {
    class: "btn btn--ghost btn--sm", type: "button",
    onclick: () => {
      const value = fmt.monthYear(new Date());
      updatedControl.value = value;
      store.setSite({ LAST_UPDATED: value });
      ui.toast("Data u përditësua në «" + value + "».");
    }
  }, [ui.icon("clock", 14), "Vendos muajin aktual"]);

  /* ---------------- Validimi ---------------- */
  const warning = ui.el("div", { class: "callout callout--warning", hidden: true }, [
    ui.icon("alert"),
    ui.el("div", { text: "Numri që thirret duhet të përmbajë vetëm shifra dhe një + në fillim." })
  ]);

  function validate() {
    const value = store.get().site.CALL_PHONE || "";
    warning.hidden = !value || /^\+?[0-9]+$/.test(value);
  }
  validate();

  root.appendChild(ui.el("div", { class: "card section" }, [
    ui.el("div", { class: "card__head" }, [
      ui.el("h2", { class: "card__title", text: "Kontakti dhe faqja" })
    ]),
    ui.el("div", { class: "card__body" }, [grid, nowBtn, ui.el("div", { class: "mt-4" }, [warning])])
  ]));

  /* ---------------- Informacioni i sistemit ---------------- */
  const s = store.get();
  const rows = [
    ["Dega e depos", s.repo.branch || "—"],
    ["Versioni i skedarit", s.repo.sha ? String(s.repo.sha).slice(0, 10) : "—"],
    ["Prona në sistem", fmt.num(s.properties.length)],
    ["Roli juaj", s.me && s.me.role === "admin" ? "Administrator" : "Redaktor"],
    ["Leje për publikim", store.canPublish() ? "Po" : "Jo"]
  ];

  const info = ui.el("div", { class: "stack stack--sm" });
  for (const [label, value] of rows) {
    info.appendChild(ui.el("div", { class: "row", style: "justify-content:space-between" }, [
      ui.el("span", { class: "text-sm secondary-text", text: label }),
      ui.el("span", { class: "mono text-sm", text: value })
    ]));
  }

  root.appendChild(ui.el("div", { class: "card section" }, [
    ui.el("div", { class: "card__head" }, [
      ui.el("h2", { class: "card__title", text: "Informacion i sistemit" })
    ]),
    ui.el("div", { class: "card__body" }, [info])
  ]));

  root.appendChild(ui.el("div", { class: "callout callout--info" }, [
    ui.icon("info"),
    ui.el("div", {
      html: "Ndryshimet e cilësimeve ruhen bashkë me pronat dhe dalin live me publikimin e radhës."
    })
  ]));

  return root;
}
