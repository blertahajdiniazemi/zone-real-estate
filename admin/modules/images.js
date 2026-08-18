/* =====================================================================
   FOTOGRAFITË
   =====================================================================

   Përpunimi dhe menaxhimi i fotove të një prone.

   Rrjedha e ngarkimit mbetet ajo ekzistuese dhe e sigurt:

     shfletuesi → funksioni serverik (zone-admin) → GitHub API

   Tokeni i GitHub-it nuk hyn kurrë në shfletues. Funksioni serverik
   pranon një foto për kërkesë, prandaj shumë foto = shumë thirrje të
   të njëjtit veprim `upload_image`. Asnjë ndryshim serverik nuk u
   desh për të mbështetur galerinë.

   Serveri i pranon vetëm emrat që përputhen me:
     ^[a-z0-9][a-z0-9._-]{0,80}\.(jpg|jpeg|png|webp)$
   prandaj emrat gjenerohen gjithmonë këtu, kurrë nga emri i skedarit.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as fmt from "../core/format.js";
import * as store from "../core/store.js";

/* Kufijtë. Serveri e refuzon çdo gjë mbi 3 MB, prandaj zvogëlimi bëhet
   para nisjes — jo pas një gabimi. */
export const MAX_WIDTH = 1600;
export const MAX_UPLOAD_BYTES = 2.6 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGES_PER_PROPERTY = 20;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const QUALITY_STEPS = [0.84, 0.74, 0.64, 0.54];

/* ------------------------------------------------------------------ */
/* Validimi                                                            */
/* ------------------------------------------------------------------ */

/** Kthen "" kur skedari është në rregull, ose mesazhin shqip të gabimit. */
export function validateFile(file) {
  if (!file) return "Skedari nuk u lexua dot.";

  /* Lloji kontrollohet nga MIME, jo nga prapashtesa. Kjo ndalon
     ngarkimin e skedarëve të ekzekutueshëm me emër ".jpg". */
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Fotografia nuk është në format të mbështetur. Përdorni JPG, PNG ose WebP.";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "Fotografia është shumë e madhe (mbi 25 MB).";
  }
  if (file.size === 0) {
    return "Fotografia është bosh.";
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Përpunimi                                                           */
/* ------------------------------------------------------------------ */

function toCanvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Fotografia nuk u përpunua dot."))),
      type, quality
    );
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Fotografia është e dëmtuar ose e papërdorshme.")); };
    img.src = url;
  });
}

/**
 * Zvogëlon dhe optimizon një foto derisa të hyjë brenda kufirit.
 * Kthen { name, blob, dataUrl, width, height, originalKB, newKB }.
 */
export async function processImage(file, baseName) {
  const img = await loadImage(file);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error("Fotografia është e dëmtuar ose e papërdorshme.");

  if (width > MAX_WIDTH) {
    height = Math.round(height * MAX_WIDTH / width);
    width = MAX_WIDTH;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  /* Sfondi mbushet sepse PNG-të me tejdukshmëri ruhen si JPEG. */
  ctx.fillStyle = "#140C1C";   // = --site-canvas, sfondi i faqes publike
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  /* Cilësia ulet hap pas hapi vetëm sa duhet për të hyrë në kufi. */
  let blob = null;
  for (const quality of QUALITY_STEPS) {
    blob = await toCanvasBlob(canvas, "image/jpeg", quality);
    if (blob.size <= MAX_UPLOAD_BYTES) break;
  }
  if (!blob) throw new Error("Fotografia nuk u përpunua dot.");
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Fotografia mbetet shumë e madhe edhe pas zvogëlimit.");
  }

  return {
    name: makeFileName(baseName),
    blob,
    dataUrl: canvas.toDataURL("image/jpeg", 0.8),
    width,
    height,
    originalKB: Math.round(file.size / 1024),
    newKB: Math.round(blob.size / 1024)
  };
}

/** Emër i sigurt, gjithmonë unik, gjithmonë brenda rregullit të serverit. */
export function makeFileName(baseName) {
  const base = fmt.slugify(baseName || "prona", 40) || "prona";
  const stamp = Date.now().toString(36).slice(-5);
  const rand = Math.random().toString(36).slice(2, 5);
  return base + "-" + stamp + rand + ".jpg";
}

/* ------------------------------------------------------------------ */
/* Menaxheri i galerisë                                                */
/* ------------------------------------------------------------------ */

/**
 * Ndërton bllokun e medias për formularin e pronës.
 *
 * @param {object} options
 * @param {object} options.property   prona që po redaktohet (ndryshohet drejtpërdrejt)
 * @param {Function} options.onChange thirret pas çdo ndryshimi
 * @param {string} options.siteBase   adresa e faqes live, për fotot ekzistuese
 */
export function createMediaManager({ property, onChange, siteBase }) {
  const container = ui.el("div");
  const fileInput = ui.el("input", {
    type: "file", accept: ACCEPTED_TYPES.join(","), multiple: true, hidden: true
  });

  const grid = ui.el("div", { class: "media-grid" });
  const status = ui.el("p", { class: "hint", "aria-live": "polite" });

  const dropzone = ui.el("div", {
    class: "dropzone", role: "button", tabindex: "0",
    "aria-label": "Ngarko fotografi"
  }, [
    ui.el("div", { class: "dropzone__icon" }, [ui.icon("upload")]),
    ui.el("div", { class: "dropzone__title", text: "Tërhiqni fotografitë këtu ose klikoni për t'i zgjedhur" }),
    ui.el("div", {
      class: "dropzone__hint",
      text: "JPG, PNG ose WebP · deri në " + MAX_IMAGES_PER_PROPERTY +
            " fotografi · zvogëlohen vetë në " + MAX_WIDTH + "px"
    })
  ]);

  /* ---------------- Ngarkimi ---------------- */

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;

    const room = MAX_IMAGES_PER_PROPERTY - property.images.length;
    if (room <= 0) {
      ui.toast("Kufiri i fotografive u arrit.", {
        type: "warning",
        text: "Një pronë mban deri në " + MAX_IMAGES_PER_PROPERTY + " fotografi."
      });
      return;
    }

    const batch = files.slice(0, room);
    if (files.length > room) {
      ui.toast("U pranuan vetëm " + batch.length + " fotografi.", {
        type: "warning",
        text: "Kufiri për një pronë është " + MAX_IMAGES_PER_PROPERTY + "."
      });
    }

    let done = 0;
    let failed = 0;
    status.textContent = "Duke përpunuar fotografitë…";

    for (const file of batch) {
      const problem = validateFile(file);
      if (problem) {
        failed++;
        ui.toast(problem, { type: "error", text: file.name });
        continue;
      }

      try {
        const processed = await processImage(file, property.title || property.code);
        const path = "images/" + processed.name;

        store.addPendingImage(processed.name, processed);
        property.images.push(path);
        if (!property.coverImage) property.coverImage = path;

        done++;
        status.textContent = "U përpunuan " + done + " nga " + batch.length + " fotografi…";
        render();
      } catch (e) {
        failed++;
        ui.toast("Fotografia nuk u ngarkua.", { type: "error", text: file.name + " — " + e.message });
      }
    }

    status.textContent = "";
    if (done) {
      ui.toast(
        done === 1 ? "Fotografia u shtua." : done + " fotografi u shtuan.",
        { text: "Ato ngarkohen në uebfaqe kur të publikoni." }
      );
    }
    if (failed && !done) status.textContent = "Asnjë fotografi nuk u shtua.";
    onChange();
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  });

  for (const evt of ["dragenter", "dragover"]) {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-over"); });
  }
  for (const evt of ["dragleave", "drop"]) {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-over"); });
  }
  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });

  /* ---------------- Veprimet mbi një foto ---------------- */

  function setCover(path) {
    property.coverImage = path;
    onChange();
    render();
    ui.toast("Fotoja kryesore u ndryshua.");
  }

  function remove(path) {
    property.images = property.images.filter((p) => p !== path);
    if (property.coverImage === path) property.coverImage = property.images[0] || "";

    /* Nëse fotoja ishte ende e panisur, hiqet edhe nga radha e ngarkimit —
       s'ka pse të dërgohet një skedar që askush nuk e përdor. */
    const name = path.replace(/^images\//, "");
    if (store.get().pendingImages[name]) store.removePendingImage(name);

    onChange();
    render();
  }

  function reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= property.images.length) return;
    const [moved] = property.images.splice(fromIndex, 1);
    property.images.splice(toIndex, 0, moved);
    onChange();
    render();
  }

  /* ---------------- Vizatimi ---------------- */

  let dragIndex = -1;

  function render() {
    ui.clear(grid);

    property.images.forEach((path, index) => {
      const isCover = path === property.coverImage;
      const name = path.replace(/^images\//, "");
      const isNew = !!store.get().pendingImages[name];

      const item = ui.el("div", {
        class: "media-item" + (isCover ? " is-cover" : ""),
        draggable: "true",
        dataset: { index: String(index) }
      }, [
        ui.el("img", {
          class: "media-item__img",
          src: store.imageSource(path, ui.PLACEHOLDER, siteBase),
          alt: "Fotografia " + (index + 1) + (isCover ? " — kryesore" : ""),
          loading: "lazy",
          onerror: function () { this.onerror = null; this.src = ui.PLACEHOLDER; }
        }),
        isCover ? ui.el("span", { class: "media-item__flag", text: "Kryesore" }) : null,
        isNew ? ui.el("span", { class: "media-item__new", text: "E re" }) : null,
        ui.el("div", { class: "media-item__bar" }, [
          ui.el("span", { class: "media-item__name", text: name, title: name }),
          ui.el("div", { class: "media-item__acts" }, [
            /* Zhvendosja me butona ekziston sepse tërheqja me maus nuk
               punon me tastierë dhe është e vështirë në telefon. */
            ui.el("button", {
              class: "media-item__btn", type: "button",
              "aria-label": "Zhvendos majtas", disabled: index === 0,
              onclick: () => reorder(index, index - 1)
            }, [ui.icon("chevronLeft", 13)]),
            ui.el("button", {
              class: "media-item__btn", type: "button",
              "aria-label": "Zhvendos djathtas", disabled: index === property.images.length - 1,
              onclick: () => reorder(index, index + 1)
            }, [ui.icon("chevronRight", 13)]),
            isCover ? null : ui.el("button", {
              class: "media-item__btn", type: "button",
              "aria-label": "Vendos si kryesore", title: "Vendos si Kryesore",
              onclick: () => setCover(path)
            }, [ui.icon("star", 13)]),
            ui.el("button", {
              class: "media-item__btn media-item__btn--danger", type: "button",
              "aria-label": "Hiq fotografinë",
              onclick: () => remove(path)
            }, [ui.icon("trash", 13)])
          ])
        ])
      ]);

      item.addEventListener("dragstart", (e) => {
        dragIndex = index;
        item.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
        /* Firefox kërkon që diçka të vendoset, përndryshe tërheqja nuk nis. */
        e.dataTransfer.setData("text/plain", String(index));
      });
      item.addEventListener("dragend", () => {
        dragIndex = -1;
        item.classList.remove("is-dragging");
        [...grid.children].forEach((c) => c.classList.remove("is-dropzone"));
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (dragIndex >= 0 && dragIndex !== index) item.classList.add("is-dropzone");
      });
      item.addEventListener("dragleave", () => item.classList.remove("is-dropzone"));
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.classList.remove("is-dropzone");
        if (dragIndex >= 0) reorder(dragIndex, index);
      });

      grid.appendChild(item);
    });

    grid.hidden = !property.images.length;
    countLine.textContent = property.images.length
      ? property.images.length + " fotografi · e para në renditje nuk është domosdo kryesorja"
      : "";
  }

  const countLine = ui.el("p", { class: "hint" });

  container.append(
    dropzone,
    fileInput,
    status,
    grid,
    countLine,
    ui.el("div", { class: "callout mt-4" }, [
      ui.icon("info"),
      ui.el("div", {
        html: "<b>Foto Kryesore</b> është ajo që shfaqet në kartelën e pronës dhe në ballinë. " +
              "Përdorni yllin për ta ndryshuar, ose tërhiqni fotografitë për t'i renditur."
      })
    ])
  );

  render();

  return { node: container, render };
}
