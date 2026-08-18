/* =====================================================================
   REDAKTUESI I PRONËS
   =====================================================================

   Zëvendëson formularin e vetëm e të gjatë me tetë seksione:

     1 Informacioni Bazë   5 Karakteristikat
     2 Lokacioni           6 Media
     3 Detajet             7 SEO
     4 Çmimi               8 Menaxhimi

   Dy sjellje janë të qëllimshme:

   • Puna bëhet mbi një KOPJE. Prona e vërtetë ndryshohet vetëm kur
     shtypet «Ruaj». Mbyllja e formularit nuk lë kurrë gjysmë ndryshimi
     në listë.

   • Skeda që përmban një gabim validimi shënohet vetë. Administratori
     nuk duhet t'i hapë tetë skedat një nga një për të gjetur problemin.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as model from "../core/model.js";
import * as store from "../core/store.js";
import * as fmt from "../core/format.js";
import { createMediaManager } from "./images.js";

const TABS = [
  "Informacioni Bazë", "Lokacioni", "Detajet", "Çmimi",
  "Karakteristikat", "Media", "SEO", "Menaxhimi"
];

/* Qytetet më të përdorura dalin si sugjerime, por fusha mbetet e lirë —
   asnjë listë e mbyllur nuk duhet ta ndalojë një pronë të re. */
const CITY_SUGGESTIONS = [
  "Prishtinë", "Prizren", "Pejë", "Gjakovë", "Gjilan", "Mitrovicë",
  "Ferizaj", "Vushtrri", "Podujevë", "Suharekë", "Rahovec", "Lipjan",
  "Malishevë", "Kaçanik", "Skenderaj", "Deçan", "Istog", "Klinë",
  "Dragash", "Fushë Kosovë", "Obiliq", "Shtime", "Graçanicë"
];

/**
 * Hap redaktuesin.
 * @param {object|null} property  prona për redaktim; null = pronë e re
 * @param {Function} onSaved      thirret me pronën e ruajtur
 */
export function openPropertyEditor(property, onSaved) {
  const isNew = !property;
  const all = store.get().properties;

  /* Kopje e thellë: ndryshimet nuk prekin listën derisa të ruhen. */
  const draft = JSON.parse(JSON.stringify(
    property ? model.normalizeProperty(property, property._order) : model.blankProperty(all)
  ));
  const original = JSON.stringify(draft);

  let activeTab = 0;
  let errors = {};
  let touched = false;

  /* ---------------------------------------------------------------- */
  /* Struktura                                                        */
  /* ---------------------------------------------------------------- */

  const tabBar = ui.el("div", { class: "tabs", role: "tablist" });
  const panel = ui.el("div", { class: "tabpanel" });

  const saveBtn = ui.el("button", { class: "btn btn--primary", type: "button" },
    [ui.icon("check"), isNew ? "Shto Pronën" : "Ruaj Ndryshimet"]);
  const previewBtn = ui.el("button", { class: "btn btn--ghost", type: "button" },
    [ui.icon("eye"), "Shiko Paraprakisht"]);
  const cancelBtn = ui.el("button", { class: "btn btn--ghost", type: "button" }, ["Anulo"]);

  const dirtyFlag = ui.el("span", { class: "text-xs muted", hidden: true },
    ["Keni ndryshime të paruajtura."]);

  const modal = ui.openModal({
    title: isNew ? "Shto Pronë" : "Ndrysho Pronën",
    subtitle: isNew ? null : draft.code + " · " + (draft.title || "Pa titull"),
    size: "full",
    closeOnBackdrop: false,
    flush: true,
    body: ui.el("div", {}, [
      ui.el("div", { style: "padding:0 var(--sp-5)" }, [tabBar]),
      ui.el("div", { style: "padding:0 var(--sp-5) var(--sp-5)" }, [panel])
    ]),
    footer: ui.el("div", { class: "row grow", style: "width:100%" }, [
      ui.el("div", { class: "modal__foot-start row row--tight" }, [dirtyFlag]),
      previewBtn, cancelBtn, saveBtn
    ]),
    onClose: () => {}
  });

  /* Mbyllja kalon gjithmonë nga rojtari i ndryshimeve. */
  const nativeClose = modal.close;
  modal.close = function guardedClose(force) {
    if (force === true || !hasChanges()) { nativeClose(); return; }
    guardExit();
  };
  ui.$(".modal__close", modal.modal).addEventListener("click", (e) => {
    e.stopPropagation();
    modal.close();
  }, true);
  cancelBtn.addEventListener("click", () => modal.close());

  function hasChanges() {
    return JSON.stringify(draft) !== original;
  }

  /* Puna nuk humbet kurrë në heshtje. */
  async function guardExit() {
    const leave = await ui.confirmDialog({
      title: "Keni ndryshime të paruajtura.",
      message: "Nëse largoheni tani, ndryshimet e bëra në këtë pronë do të humbasin.",
      tone: "warning",
      confirmLabel: "Largo ndryshimet",
      cancelLabel: "Vazhdo redaktimin",
      danger: true
    });
    if (leave) nativeClose();
  }

  function markDirty() {
    touched = true;
    dirtyFlag.hidden = !hasChanges();
  }

  /* ---------------------------------------------------------------- */
  /* Skedat                                                           */
  /* ---------------------------------------------------------------- */

  function renderTabs() {
    ui.clear(tabBar);
    TABS.forEach((label, i) => {
      const hasError = Object.keys(errors).some((f) => model.FIELD_TAB[f] === i);
      const btn = ui.el("button", {
        class: "tab" + (i === activeTab ? " is-active" : "") + (hasError ? " has-error" : ""),
        type: "button", role: "tab",
        "aria-selected": i === activeTab ? "true" : "false",
        onclick: () => { activeTab = i; renderTabs(); renderPanel(); }
      }, [
        ui.el("span", { class: "tab__num", text: String(i + 1) }),
        ui.el("span", { text: label })
      ]);
      tabBar.appendChild(btn);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Ndihmësa për fushat                                              */
  /* ---------------------------------------------------------------- */

  /** Fushë teksti e lidhur drejtpërdrejt me një çelës të draftit. */
  function textField(key, label, options = {}) {
    const control = options.multiline
      ? ui.textarea({ id: "f_" + key, rows: options.rows || 4, placeholder: options.placeholder || "" })
      : ui.input({
          id: "f_" + key, type: options.type || "text",
          placeholder: options.placeholder || "",
          inputmode: options.inputmode || null,
          min: options.min != null ? options.min : null,
          max: options.max != null ? options.max : null,
          step: options.step || null,
          list: options.list || null,
          maxlength: options.maxlength || null
        });

    control.value = draft[key] == null ? "" : draft[key];

    control.addEventListener("input", () => {
      if (options.type === "number") {
        const raw = control.value.trim();
        draft[key] = raw === "" ? null : (options.decimal ? fmt.parseNum(raw) : parseInt(raw, 10));
        if (Number.isNaN(draft[key])) draft[key] = null;
      } else {
        draft[key] = control.value;
      }
      markDirty();
      if (options.onInput) options.onInput(draft[key]);
      clearFieldError(key);
    });

    return ui.field({
      label, id: "f_" + key, required: options.required, control,
      hint: options.hint, full: options.full, error: errors[key]
    });
  }

  function selectField(key, label, options, config = {}) {
    const control = ui.select(
      { id: "f_" + key },
      config.allowEmpty === false ? options : [{ value: "", label: config.emptyLabel || "— Zgjidhni —" }, ...options],
      draft[key]
    );
    control.addEventListener("change", () => {
      draft[key] = control.value;
      markDirty();
      clearFieldError(key);
      if (config.onChange) config.onChange(control.value);
    });
    return ui.field({
      label, id: "f_" + key, required: config.required, control,
      hint: config.hint, full: config.full, error: errors[key]
    });
  }

  function clearFieldError(key) {
    if (!errors[key]) return;
    delete errors[key];
    renderTabs();
    const node = ui.$("#f_" + key, panel);
    if (node) {
      const wrap = node.closest(".field");
      if (wrap) {
        wrap.classList.remove("is-invalid");
        const msg = ui.$(".error-text", wrap);
        if (msg) msg.textContent = "";
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 1 · Informacioni Bazë                                            */
  /* ---------------------------------------------------------------- */

  function tabBasic() {
    const grid = ui.el("div", { class: "form-grid" });

    grid.append(
      textField("title", "Titulli", {
        required: true, full: true, placeholder: "Shtëpi në Arbëri", maxlength: 120
      }),
      textField("code", "Kodi i pronës", {
        required: true, hint: "Gjenerohet vetë. Ndryshojeni vetëm nëse keni një sistem tuajin."
      }),
      selectField("category", "Kategoria", model.CATEGORIES, { required: true }),
      selectField("transactionType", "Për Shitje / Me Qira", model.TRANSACTION_TYPES, {
        required: true, allowEmpty: false,
        onChange: () => renderPanel()
      }),
      selectField("lifecycle", "Statusi", model.LIFECYCLES, {
        required: true, allowEmpty: false,
        hint: "Draft, Joaktive dhe Arkivuar nuk shfaqen në uebfaqe.",
        onChange: () => renderPanel()
      })
    );

    const visible = model.lifecycleIsPublic(draft.lifecycle);

    return ui.el("div", {}, [
      grid,
      ui.el("div", { class: "form-grid form-grid--1" }, [
        textField("summary", "Përshkrimi i shkurtër", {
          required: true, multiline: true, rows: 3, maxlength: 320,
          hint: "Shfaqet në kartelën e pronës. Deri në 320 shkronja.",
          placeholder: "Shtëpi individuale me oborr privat dhe garazh për dy vetura."
        }),
        textField("details", "Përshkrimi i plotë", {
          multiline: true, rows: 8,
          hint: "Shfaqet kur vizitori hap detajet. Nëse e lini bosh, përdoret përshkrimi i shkurtër."
        })
      ]),
      ui.el("div", {
        class: "callout callout--" + (visible ? "success" : "warning")
      }, [
        ui.icon(visible ? "eye" : "eyeOff"),
        ui.el("div", {
          html: visible
            ? "Me këtë status, prona <b>shfaqet</b> në uebfaqe pas publikimit."
            : "Me këtë status, prona <b>nuk shfaqet</b> në uebfaqe. " +
              "Ajo ruhet në depo si draft, prandaj mos shkruani këtu informacion privat."
        })
      ])
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* 2 · Lokacioni                                                    */
  /* ---------------------------------------------------------------- */

  function tabLocation() {
    const datalist = ui.el("datalist", { id: "city-list" },
      CITY_SUGGESTIONS.map((c) => ui.el("option", { value: c })));

    const grid = ui.el("div", { class: "form-grid" });
    grid.append(
      textField("country", "Shteti"),
      textField("city", "Qyteti", { required: true, list: "city-list", placeholder: "Prishtinë" }),
      textField("municipality", "Komuna"),
      textField("neighborhood", "Lagjja", { placeholder: "Arbëri" }),
      textField("address", "Adresa", { full: true, hint: "Adresa e saktë nuk shfaqet në uebfaqe." }),
      textField("latitude", "Latitude", {
        type: "number", step: "any", decimal: true, placeholder: "42.6629"
      }),
      textField("longitude", "Longitude", {
        type: "number", step: "any", decimal: true, placeholder: "21.1655"
      })
    );

    const preview = ui.el("div", { class: "callout" }, [
      ui.icon("pin"),
      ui.el("div", {}, [
        ui.el("div", { text: "Në uebfaqe do të shfaqet:" }),
        ui.el("b", { text: model.composeLocation(draft) || "—" })
      ])
    ]);

    const hasCoords = draft.latitude != null && draft.longitude != null;

    return ui.el("div", {}, [
      datalist,
      grid,
      preview,
      /* Harta nuk imponohet: shumë prona nuk kanë koordinata, dhe një
         hartë e detyrueshme do t'i bllokonte ato. */
      hasCoords ? ui.el("div", { class: "mt-4" }, [
        ui.el("a", {
          class: "btn btn--ghost btn--sm",
          href: "https://www.openstreetmap.org/?mlat=" + draft.latitude + "&mlon=" + draft.longitude + "#map=17/" + draft.latitude + "/" + draft.longitude,
          target: "_blank", rel: "noopener noreferrer"
        }, [ui.icon("external"), "Shiko pikën në hartë"])
      ]) : ui.el("p", { class: "hint mt-4", text: "Koordinatat janë opsionale." })
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* 3 · Detajet                                                      */
  /* ---------------------------------------------------------------- */

  function tabDetails() {
    /* Fushat përshtaten me kategorinë: një parcelë toke nuk ka dhoma gjumi. */
    const isLand = model.LAND_CATEGORIES.includes(draft.category);
    const grid = ui.el("div", { class: "form-grid form-grid--3" });

    grid.append(
      textField("sizeValue", isLand ? "Sipërfaqja" : "Sipërfaqja (m²)", {
        type: "number", decimal: true, min: 0, required: !isLand, placeholder: "140"
      }),
      textField("plotSize", "Sipërfaqja e parcelës (m²)", { type: "number", decimal: true, min: 0 })
    );

    if (!isLand) {
      grid.append(
        textField("rooms", "Dhoma (gjithsej)", { type: "number", min: 0 }),
        textField("beds", "Dhoma gjumi", { type: "number", min: 0 }),
        textField("baths", "Banjo", { type: "number", min: 0 }),
        textField("floor", "Kati", { type: "number" }),
        textField("totalFloors", "Numri i kateve", { type: "number", min: 0 }),
        textField("yearBuilt", "Viti i ndërtimit", { type: "number", min: 1800, placeholder: "2019" }),
        textField("parking", "Vende parkimi", { type: "number", min: 0 })
      );
      grid.append(
        selectField("condition", "Gjendja e pronës", model.CONDITIONS),
        selectField("orientation", "Orientimi", model.ORIENTATIONS)
      );
    } else {
      grid.append(selectField("orientation", "Orientimi", model.ORIENTATIONS));
    }

    const garageSwitch = ui.switchControl({
      label: "Garazh",
      checked: draft.garage,
      onChange: (v) => { draft.garage = v; markDirty(); }
    });

    return ui.el("div", {}, [
      isLand ? ui.el("div", { class: "callout mb-4" }, [
        ui.icon("info"),
        ui.el("div", { html: "Për tokë dhe garazhe, fushat e banimit janë fshehur sepse nuk kanë kuptim." })
      ]) : null,
      grid,
      isLand ? null : ui.el("div", { class: "mt-4" }, [garageSwitch])
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* 4 · Çmimi                                                        */
  /* ---------------------------------------------------------------- */

  function tabPrice() {
    const isRent = draft.transactionType === "rent";
    const grid = ui.el("div", { class: "form-grid" });

    const perSqmLine = ui.el("p", { class: "hint" });
    function updatePerSqm() {
      const per = fmt.pricePerSqm(draft.priceValue, draft.sizeValue);
      /* Kur njëri numër mungon ose është i pavlefshëm, nuk shfaqet asgjë —
         një llogaritje e trilluar është më keq se një fushë bosh. */
      perSqmLine.textContent = per
        ? "Çmimi për m²: " + fmt.price(per, draft.currency)
        : "Çmimi për m² llogaritet kur çmimi dhe sipërfaqja janë të plotësuara.";
    }

    grid.append(
      textField("priceValue", isRent ? "Çmimi mujor" : "Çmimi", {
        type: "number", decimal: true, min: 0, required: true,
        placeholder: isRent ? "420" : "185000",
        onInput: updatePerSqm
      }),
      selectField("currency", "Valuta", model.CURRENCIES, { allowEmpty: false })
    );

    if (isRent) {
      grid.append(textField("deposit", "Depozita", { type: "number", decimal: true, min: 0 }));
    }

    grid.append(textField("priceText", "Teksti i çmimit (opsional)", {
      full: true,
      placeholder: "Lëreni bosh — formatohet vetë",
      hint: "Përdoret vetëm nëse çmimi duhet shkruar ndryshe, p.sh. «Me marrëveshje». " +
            "Kur është i plotësuar, ai zëvendëson çmimin e formatuar."
    }));

    updatePerSqm();

    const negotiable = ui.switchControl({
      label: "I negociueshëm",
      checked: draft.negotiable,
      onChange: (v) => { draft.negotiable = v; markDirty(); }
    });

    const previewLine = ui.el("div", { class: "callout mt-4" }, [
      ui.icon("info"),
      ui.el("div", {}, [
        ui.el("div", { text: "Në uebfaqe do të shfaqet:" }),
        ui.el("b", { text: model.displayPrice(draft) || "—" })
      ])
    ]);

    return ui.el("div", {}, [grid, perSqmLine, ui.el("div", { class: "mt-4" }, [negotiable]), previewLine]);
  }

  /* ---------------------------------------------------------------- */
  /* 5 · Karakteristikat                                              */
  /* ---------------------------------------------------------------- */

  function tabFeatures() {
    const chosen = new Set(draft.features);

    const list = ui.el("div", {
      class: "form-grid form-grid--3",
      role: "group", "aria-label": "Karakteristikat"
    });

    for (const feature of model.FEATURES) {
      list.appendChild(ui.checkbox({
        label: feature,
        checked: chosen.has(feature),
        value: feature,
        onChange: (checked, value) => {
          if (checked) chosen.add(value); else chosen.delete(value);
          syncFeatures();
        }
      }));
    }

    /* Karakteristikat e shkruara lirshëm nga pronat e vjetra nuk humbin. */
    const customValues = draft.features.filter((f) => !model.FEATURES.includes(f));
    const customBox = ui.textarea({
      rows: 3,
      placeholder: "Një karakteristikë për rresht",
      id: "f_customFeatures"
    });
    customBox.value = customValues.join("\n");
    customBox.addEventListener("input", syncFeatures);

    function syncFeatures() {
      const custom = customBox.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      draft.features = [...model.FEATURES.filter((f) => chosen.has(f)), ...custom];
      markDirty();
      countLine.textContent = draft.features.length + " karakteristika të zgjedhura";
    }

    const countLine = ui.el("p", { class: "hint", text: draft.features.length + " karakteristika të zgjedhura" });

    return ui.el("div", {}, [
      list,
      countLine,
      ui.el("div", { class: "mt-5" }, [
        ui.field({
          label: "Karakteristika shtesë", id: "f_customFeatures",
          control: customBox, full: true,
          hint: "Për çdo gjë që nuk është në listën e mësipërme."
        })
      ])
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* 6 · Media                                                        */
  /* ---------------------------------------------------------------- */

  let mediaManager = null;

  function tabMedia() {
    mediaManager = createMediaManager({
      property: draft,
      onChange: markDirty,
      siteBase: (window.ZONE_ADMIN_CONFIG || {}).SITE_BASE
    });
    return mediaManager.node;
  }

  /* ---------------------------------------------------------------- */
  /* 7 · SEO                                                          */
  /* ---------------------------------------------------------------- */

  function tabSeo() {
    const grid = ui.el("div", { class: "form-grid form-grid--1" });

    grid.append(
      textField("slug", "URL Slug", {
        placeholder: model.effectiveSlug(draft),
        hint: "Nëse e lini bosh, gjenerohet nga titulli."
      }),
      textField("metaTitle", "Meta Title", {
        maxlength: 70, placeholder: draft.title,
        hint: "Titulli që shfaqet në Google. Deri në 70 shkronja."
      }),
      textField("metaDescription", "Meta Description", {
        multiline: true, rows: 3, maxlength: 180,
        placeholder: fmt.truncate(draft.summary, 160),
        hint: "Përshkrimi që shfaqet nën titull në Google. Deri në 180 shkronja."
      })
    );

    return ui.el("div", {}, [
      grid,
      ui.el("div", { class: "callout" }, [
        ui.icon("info"),
        ui.el("div", { html: "Fushat e lëna bosh plotësohen vetë nga titulli dhe përshkrimi i shkurtër." })
      ])
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* 8 · Menaxhimi                                                    */
  /* ---------------------------------------------------------------- */

  function tabManage() {
    const canFeature = model.lifecycleIsPublic(draft.lifecycle);

    const featuredSwitch = ui.switchControl({
      label: "E veçuar në ballinë",
      hint: canFeature
        ? "Prona shfaqet në pjesën kryesore të uebfaqes."
        : "Kërkon një status që shfaqet në uebfaqe.",
      checked: draft.featured,
      onChange: (v) => {
        draft.featured = v && canFeature;
        featuredSwitch.input.checked = draft.featured;
        markDirty();
      }
    });
    if (!canFeature) featuredSwitch.input.disabled = true;

    const dates = ui.el("div", { class: "form-grid" });
    dates.append(
      dateField("publishedAt", "Data e publikimit"),
      dateField("expiresAt", "Data e skadimit")
    );

    return ui.el("div", {}, [
      ui.el("div", { class: "card mb-4" }, [
        ui.el("div", { class: "card__body" }, [featuredSwitch])
      ]),
      dates,
      ui.el("div", { class: "card" }, [
        ui.el("div", { class: "card__body stack stack--sm" }, [
          metaRow("Kodi", draft.code),
          metaRow("Statusi", model.lifecycleLabel(draft.lifecycle)),
          metaRow("Shfaqet në uebfaqe", model.lifecycleIsPublic(draft.lifecycle) ? "Po" : "Jo"),
          metaRow("Fotografi", String(draft.images.length)),
          metaRow("Krijuar", fmt.dateTime(draft.createdAt) || "—"),
          metaRow("Ndryshuar", fmt.dateTime(draft.updatedAt) || "—")
        ])
      ]),
      /* Shënimet e brendshme nuk ekzistojnë ende me qëllim: listings.js
         është skedar publik dhe asgjë private nuk guxon të shkojë atje.
         Ato vijnë në Fazën 2, në bazën e të dhënave. */
      ui.el("div", { class: "callout mt-4" }, [
        ui.icon("info"),
        ui.el("div", {
          html: "<b>Shënimet e brendshme</b> nuk ruhen ende. Të dhënat e pronave shkojnë te " +
                "<code>listings.js</code>, i cili është publik. Shënimet private kërkojnë " +
                "bazën e të dhënave dhe vijnë në fazën e dytë."
        })
      ])
    ]);
  }

  function dateField(key, label) {
    const control = ui.input({ type: "date", id: "f_" + key });
    control.value = draft[key] ? String(draft[key]).slice(0, 10) : "";
    control.addEventListener("input", () => {
      draft[key] = control.value ? new Date(control.value).toISOString() : null;
      markDirty();
    });
    return ui.field({ label, id: "f_" + key, control });
  }

  function metaRow(label, value) {
    return ui.el("div", { class: "row", style: "justify-content:space-between" }, [
      ui.el("span", { class: "text-xs muted", text: label }),
      ui.el("span", { class: "text-sm mono", text: value || "—" })
    ]);
  }

  /* ---------------------------------------------------------------- */
  /* Vizatimi                                                         */
  /* ---------------------------------------------------------------- */

  const RENDERERS = [tabBasic, tabLocation, tabDetails, tabPrice, tabFeatures, tabMedia, tabSeo, tabManage];

  function renderPanel() {
    ui.clear(panel);
    panel.appendChild(RENDERERS[activeTab]());
  }

  /* ---------------------------------------------------------------- */
  /* Ruajtja                                                          */
  /* ---------------------------------------------------------------- */

  saveBtn.addEventListener("click", () => {
    errors = model.validateProperty(draft, all);
    const keys = Object.keys(errors);

    if (keys.length) {
      /* Kalo te skeda e parë me gabim dhe fokuso fushën përkatëse. */
      const firstTab = Math.min(...keys.map((k) => model.FIELD_TAB[k] ?? 0));
      activeTab = firstTab;
      renderTabs();
      renderPanel();

      const firstField = keys.find((k) => (model.FIELD_TAB[k] ?? 0) === firstTab);
      const node = ui.$("#f_" + firstField, panel);
      if (node) node.focus();

      ui.toast(
        keys.length === 1 ? "Një fushë ka nevojë për vëmendje." : keys.length + " fusha kanë nevojë për vëmendje.",
        { type: "error", text: errors[firstField] }
      );
      return;
    }

    if (!draft.slug) draft.slug = model.effectiveSlug(draft);
    if (!draft.createdAt) draft.createdAt = new Date().toISOString();

    const saved = store.upsertProperty(model.normalizeProperty(draft, draft._order));
    store.prunePendingImages();

    ui.toast(isNew ? "Prona u shtua." : "Prona u ruajt me sukses.", {
      text: "Ndryshimi është lokal derisa të publikoni."
    });

    if (onSaved) onSaved(saved);
    nativeClose();
  });

  /* ---------------------------------------------------------------- */
  /* Shikimi paraprak                                                 */
  /* ---------------------------------------------------------------- */

  previewBtn.addEventListener("click", () => openPreview(draft));

  renderTabs();
  renderPanel();
  return modal;
}

/* ==================================================================
   Shikimi paraprak
   ==================================================================

   Paraqitja bëhet brenda një <iframe> që ngarkon style.css-in e VËRTETË
   të faqes publike. Kështu, ajo që sheh administratori është pamja e
   faqes, jo një imitim i saj që humbet sinkronin me kohën.
   ================================================================== */

export function openPreview(property) {
  const p = model.normalizeProperty(property, 0);
  const site = store.get().site;
  const base = String((window.ZONE_ADMIN_CONFIG || {}).SITE_BASE || "").replace(/\/+$/, "");

  const cover = store.imageSource(p.coverImage, ui.PLACEHOLDER, base);
  const gallery = p.images.map((img) => store.imageSource(img, ui.PLACEHOLDER, base));

  const features = p.features.length
    ? '<p class="detail__subhead">Karakteristikat</p><ul class="detail__features">' +
      p.features.map((f) => "<li>" + ui.esc(f) + "</li>").join("") + "</ul>"
    : "";

  const isRent = p.transactionType === "rent";
  const stampClass = isRent ? "detail__stamp detail__stamp--rent" : "detail__stamp";

  const spec = (label, value) =>
    '<div class="detail__spec"><span class="detail__spec-label">' + ui.esc(label) +
    '</span><span class="detail__spec-value">' + ui.esc(value || "—") + "</span></div>";

  const specPrice = (label, value) =>
    '<div class="detail__spec"><span class="detail__spec-label">' + ui.esc(label) +
    '</span><span class="detail__spec-value detail__spec-value--price">' + ui.esc(value || "—") + "</span></div>";

  /* Galeria shtesë shfaqet nën foton kryesore. Faqja publike e re i lexon
     `images[]`; këtu tregohet se çfarë do të dalë. */
  const thumbs = gallery.length > 1
    ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;padding:0 32px 8px">' +
      gallery.slice(0, 12).map((src) =>
        '<img src="' + ui.esc(src) + '" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px">'
      ).join("") + "</div>"
    : "";

  const doc =
    "<!DOCTYPE html><html lang='sq'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<base href='" + ui.esc(base ? base + "/" : "../") + "'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Outfit:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap' rel='stylesheet'>" +
    "<link rel='stylesheet' href='style.css'>" +
    "<style>" +
    "body{background:#140C1C;padding:24px;overflow-x:hidden}" +
    ".detail{position:static;display:block}" +
    ".detail__backdrop{display:none}" +
    ".detail__panel{position:static;max-width:640px;margin:0 auto;transform:none;animation:none}" +
    ".detail__close{display:none}" +
    ".detail__scroll{max-height:none;overflow:visible}" +
    "</style></head><body>" +
    '<div class="detail"><div class="detail__panel"><div class="detail__scroll">' +
    '<img class="detail__photo" src="' + ui.esc(cover) + '" alt="' + ui.esc(p.title) + '">' +
    thumbs +
    '<div class="detail__body">' +
      '<span class="' + stampClass + '">' + ui.esc(model.transactionLabel(p.transactionType)) + "</span>" +
      '<h2 class="detail__title">' + ui.esc(p.title || "Pa titull") + "</h2>" +
      '<p class="detail__location">' + ui.esc(model.composeLocation(p)) + "</p>" +
      '<div class="detail__specs">' +
        specPrice("Çmimi", model.displayPrice(p)) +
        spec("Dhoma gjumi", p.beds == null ? "—" : String(p.beds)) +
        spec("Banjo", p.baths == null ? "—" : String(p.baths)) +
        spec("Sipërfaqja", model.displaySize(p)) +
      "</div>" +
      '<p class="detail__text">' + ui.esc(p.details || p.summary) + "</p>" +
      features +
      '<a class="detail__call" href="#">☎ Telefono ' + ui.esc(site.DISPLAY_PHONE) + "</a>" +
      '<p class="detail__callnote">Pyetni për këtë pronë me emër — ' + ui.esc(p.title) + "</p>" +
    "</div></div></div></div></body></html>";

  const frame = ui.el("iframe", {
    class: "preview-frame",
    sandbox: "allow-same-origin",
    title: "Shikimi paraprak i pronës",
    srcdoc: doc
  });

  const closeBtn = ui.el("button", { class: "btn btn--ghost", type: "button" }, ["Mbyll"]);

  const modal = ui.openModal({
    title: "Shiko Paraprakisht",
    subtitle: "Kështu do të duket prona në uebfaqe. Ende nuk është publikuar.",
    size: "full",
    flush: true,
    body: frame,
    footer: closeBtn
  });

  closeBtn.addEventListener("click", () => modal.close());
  return modal;
}
