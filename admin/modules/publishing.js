/* =====================================================================
   PUBLIKIMI
   =====================================================================

   Rruga e publikimit mbetet ajo ekzistuese dhe e sigurt:

     shfletuesi → Supabase JWT → funksioni zone-admin → GitHub API

   Tokeni i GitHub-it nuk kalon kurrë nga shfletuesi.

   Përmirësimet janë në rrjedhë dhe në qartësi:

   • Konflikti kapet PARA se të ngarkohet asnjë fotografi. Më parë,
     dikush mund të priste ngarkimin e dhjetë fotove dhe pastaj të
     mësonte se dikush tjetër kishte publikuar ndërkohë.

   • Fotot dërgohen para listings.js. Nëse një foto dështon, skedari i
     pronave nuk dërgohet fare — kështu faqja nuk mbetet kurrë duke
     treguar një foto që nuk ekziston.

   • Çdo hap ka gjendjen e vet. Kur diçka dështon, duket saktësisht se
     ku dështoi.
   ===================================================================== */

"use strict";

import * as ui from "../ui/ui.js";
import * as model from "../core/model.js";
import * as store from "../core/store.js";
import * as fmt from "../core/format.js";
import { invalidate as invalidateActivity } from "./activity.js";

const STEP_IDS = ["version", "prepare", "images", "listings", "done"];

/**
 * Hap dritaren e publikimit.
 * @param {object} context  { api, refresh, openSite }
 */
export function openPublishDialog(context) {
  const state = store.get();

  if (!store.canPublish()) {
    ui.toast("Nuk keni leje për të publikuar.", {
      type: "warning",
      text: "Roli juaj nuk e lejon dërgimin e ndryshimeve. Kontaktoni një administrator."
    });
    return;
  }

  const changes = store.changeSummary();
  if (!changes.total && !changes.images) {
    ui.toast("Nuk ka çfarë të publikohet.", {
      type: "info",
      text: "Të gjitha ndryshimet janë tashmë në uebfaqe."
    });
    return;
  }

  /* ---------------------------------------------------------------- */
  /* Struktura                                                        */
  /* ---------------------------------------------------------------- */

  const summary = buildSummary(changes, state);
  const stepsBox = ui.el("div", { class: "publish-steps", hidden: true, "aria-live": "polite" });
  const bodyBox = ui.el("div", {}, [summary, stepsBox]);

  const publishBtn = ui.el("button", { class: "btn btn--primary", type: "button" },
    [ui.icon("publish"), "Publiko Ndryshimet"]);
  const cancelBtn = ui.el("button", { class: "btn btn--ghost", type: "button" }, ["Anulo"]);
  const footer = ui.el("div", { class: "row row--end row--tight", style: "width:100%" },
    [cancelBtn, publishBtn]);

  const modal = ui.openModal({
    title: "Publiko Ndryshimet",
    subtitle: "Ndryshimet dalin në uebfaqe brenda një deri dy minutash.",
    size: "wide",
    closeOnBackdrop: false,
    body: bodyBox,
    footer
  });

  cancelBtn.addEventListener("click", () => modal.close());

  /* ---------------------------------------------------------------- */
  /* Hapat                                                            */
  /* ---------------------------------------------------------------- */

  const stepNodes = {};

  function buildSteps(imageCount) {
    ui.clear(stepsBox);
    stepsBox.hidden = false;
    summary.hidden = true;

    const labels = {
      version: "Duke kontrolluar versionin…",
      prepare: "Duke përgatitur fotografitë…",
      images: imageCount
        ? "Duke ngarkuar " + fmt.plural(imageCount, "fotografi", "fotografi") + "…"
        : "Nuk ka fotografi të reja",
      listings: "Duke përditësuar pronat…",
      done: "Publikimi përfundoi me sukses."
    };

    for (const id of STEP_IDS) {
      const mark = ui.el("div", { class: "pstep__mark" });
      const detail = ui.el("div", { class: "pstep__detail" });
      const node = ui.el("div", { class: "pstep" }, [
        mark,
        ui.el("div", { class: "pstep__body" }, [
          ui.el("div", { text: labels[id] }),
          detail
        ])
      ]);
      stepNodes[id] = { node, mark, detail };
      stepsBox.appendChild(node);
    }
  }

  function setStep(id, status, detail) {
    const step = stepNodes[id];
    if (!step) return;

    step.node.classList.remove("is-active", "is-done", "is-failed");
    if (status) step.node.classList.add("is-" + status);

    ui.clear(step.mark);
    if (status === "done") step.mark.appendChild(ui.icon("check", 11));
    else if (status === "failed") step.mark.appendChild(ui.icon("close", 11));
    else if (status === "active") step.mark.appendChild(ui.el("span", { class: "spinner", style: "width:11px;height:11px" }));

    if (detail !== undefined) step.detail.textContent = detail || "";
  }

  /* ---------------------------------------------------------------- */
  /* Rrjedha                                                          */
  /* ---------------------------------------------------------------- */

  publishBtn.addEventListener("click", async () => {
    const s = store.get();
    const pendingNames = Object.keys(s.pendingImages);

    buildSteps(pendingNames.length);
    ui.setBusy(publishBtn, true, "Duke publikuar…");
    cancelBtn.disabled = true;

    try {
      /* --- 1. Versioni ------------------------------------------- */
      setStep("version", "active");
      const remote = await context.api.getListings();

      if (s.repo.sha && remote.sha && remote.sha !== s.repo.sha) {
        setStep("version", "failed", "Versioni në depo ka ndryshuar.");
        ui.setBusy(publishBtn, false);
        cancelBtn.disabled = false;
        modal.close();
        showConflictDialog(context, remote);
        return;
      }
      setStep("version", "done", "Dega " + (remote.branch || s.repo.branch || "—"));

      /* --- 2. Përgatitja ----------------------------------------- */
      setStep("prepare", "active");
      store.prunePendingImages();

      const code = model.buildListingsFile(s.site, s.properties);

      /* Asnjë skedar i prishur nuk niset kurrë drejt faqes live. */
      model.verifyGenerated(code, s.properties.length);

      const names = Object.keys(store.get().pendingImages);
      setStep("prepare", "done",
        names.length ? fmt.plural(names.length, "fotografi gati", "fotografi gati") : "Asnjë fotografi e re");

      /* --- 3. Fotografitë ---------------------------------------- */
      if (names.length) {
        setStep("images", "active", "0 / " + names.length);
        let uploaded = 0;

        for (const name of names) {
          const image = store.get().pendingImages[name];
          if (!image) continue;

          try {
            const b64 = await ui.blobToB64(image.blob);
            await context.api.uploadImage({ name, contentBase64: b64 });
          } catch (e) {
            setStep("images", "failed", "Dështoi te «" + name + "» — " + e.message);
            throw new PublishStopped(
              "Ngarkimi i fotografive dështoi.",
              "Pronat nuk u dërguan, prandaj uebfaqja mbeti e paprekur. Provoni përsëri."
            );
          }

          /* Hiqet nga radha vetëm pas suksesit: një provë e dytë e
             vazhdon aty ku mbeti, pa i ridërguar fotot e kryera. */
          store.removePendingImage(name);
          uploaded++;
          setStep("images", "active", uploaded + " / " + names.length);
        }
        setStep("images", "done", fmt.plural(uploaded, "fotografi u ngarkua", "fotografi u ngarkuan"));
      } else {
        setStep("images", "done");
      }

      /* --- 4. Pronat --------------------------------------------- */
      setStep("listings", "active");
      let result;
      try {
        result = await context.api.publishListings({
          content: code,
          baseSha: store.get().repo.sha,
          listingCount: s.properties.length
        });
      } catch (e) {
        if (e.isConflict) {
          setStep("listings", "failed", "Dikush tjetër publikoi ndërkohë.");
          ui.setBusy(publishBtn, false);
          cancelBtn.disabled = false;
          modal.close();
          showConflictDialog(context);
          return;
        }
        setStep("listings", "failed", e.message);
        throw new PublishStopped("Pronat nuk u dërguan.", e.message);
      }

      store.get().repo.sha = result.sha;
      setStep("listings", "done", fmt.plural(s.properties.length, "pronë u dërgua", "prona u dërguan"));

      /* --- 5. Përfundimi ----------------------------------------- */
      const now = new Date().toISOString();
      for (const p of store.get().properties) {
        if (model.lifecycleIsPublic(p.lifecycle) && !p.publishedAt) p.publishedAt = now;
      }

      store.markPublished();
      store.get().lastPublish = {
        at: now,
        email: (store.get().me || {}).email || "",
        count: s.properties.length
      };
      invalidateActivity();

      setStep("done", "done", "Uebfaqja përditësohet brenda një deri dy minutash.");
      ui.setBusy(publishBtn, false);

      publishBtn.replaceChildren(ui.icon("external"), document.createTextNode("Shiko Uebfaqen"));
      publishBtn.onclick = () => context.openSite();
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Mbyll";

      ui.toast("Prona u publikuan me sukses.", {
        text: fmt.plural(s.properties.length, "pronë është live", "prona janë live") + "."
      });
      context.refresh();

    } catch (e) {
      ui.setBusy(publishBtn, false);
      cancelBtn.disabled = false;

      if (e instanceof PublishStopped) {
        ui.toast(e.message, { type: "error", text: e.detail });
      } else {
        setStep("listings", "failed", e.message);
        ui.toast("Publikimi dështoi.", {
          type: "error",
          text: e.message || "Ndodhi një gabim gjatë publikimit. Provoni përsëri."
        });
      }
      context.refresh();
    }
  });

  return modal;
}

class PublishStopped extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

/* ------------------------------------------------------------------ */
/* Përmbledhja para publikimit                                         */
/* ------------------------------------------------------------------ */

function buildSummary(changes, state) {
  const rows = [];
  if (changes.added) rows.push(["Prona të reja", changes.added]);
  if (changes.edited) rows.push(["Prona të ndryshuara", changes.edited]);
  if (changes.removed) rows.push(["Prona të fshira", changes.removed]);
  if (changes.images) rows.push(["Fotografi të reja", changes.images]);
  if (changes.site) rows.push(["Cilësimet e faqes", "u ndryshuan"]);

  const list = ui.el("div", { class: "stack stack--sm" });
  for (const [label, value] of rows) {
    list.appendChild(ui.el("div", { class: "row", style: "justify-content:space-between" }, [
      ui.el("span", { class: "text-sm secondary-text", text: label }),
      ui.el("span", { class: "mono text-sm", text: typeof value === "number" ? fmt.num(value) : value })
    ]));
  }

  const draftCount = state.properties.filter((p) => !model.lifecycleIsPublic(p.lifecycle)).length;

  return ui.el("div", {}, [
    ui.el("div", { class: "card mb-4" }, [
      ui.el("div", { class: "card__head" }, [
        ui.el("h3", { class: "card__title", text: "Çfarë do të publikohet" })
      ]),
      ui.el("div", { class: "card__body" }, [list])
    ]),

    ui.el("div", { class: "stack stack--sm" }, [
      ui.el("div", { class: "callout" }, [
        ui.icon("info"),
        ui.el("div", {
          html: "Gjithsej <b>" + fmt.plural(state.properties.length, "pronë", "prona") + "</b> do të shkruhen te " +
                "<code>listings.js</code>" +
                (draftCount
                  ? ", nga të cilat <b>" + draftCount + "</b> nuk do të shfaqen publikisht."
                  : ".")
        })
      ]),
      ui.el("div", { class: "callout callout--info" }, [
        ui.icon("key"),
        ui.el("div", {
          html: "Publikimi kalon nga serveri i sigurt. Tokeni i GitHub-it nuk ndodhet asnjëherë në shfletues."
        })
      ])
    ])
  ]);
}

/* ------------------------------------------------------------------ */
/* Konflikti                                                           */
/* ------------------------------------------------------------------ */

/**
 * Dikush tjetër publikoi ndërkohë. Puna e askujt nuk mbishkruhet në
 * heshtje: administratori zgjedh vetë çfarë të bëjë.
 */
function showConflictDialog(context, remote) {
  const reloadBtn = ui.el("button", { class: "btn btn--primary", type: "button" },
    [ui.icon("refresh"), "Ringarko të dhënat"]);
  const cancelBtn = ui.el("button", { class: "btn btn--ghost", type: "button" }, ["Anulo"]);

  const changes = store.changeSummary();

  const modal = ui.openModal({
    title: "Versioni i të dhënave ka ndryshuar",
    closeOnBackdrop: false,
    body: ui.el("div", {}, [
      ui.el("div", { class: "confirm-icon confirm-icon--warning" }, [ui.icon("alert")]),
      ui.el("p", { class: "text-sm secondary-text", style: "margin:0 0 var(--sp-4)" }, [
        "Një përdorues tjetër ka publikuar ndryshime ndërkohë. " +
        "Për të mos mbishkruar punën e tij, publikimi u ndal."
      ]),
      ui.el("div", { class: "callout callout--warning" }, [
        ui.icon("alert"),
        ui.el("div", {
          html: "Ringarkimi merr versionin e fundit nga uebfaqja dhe <b>zëvendëson</b> " +
                fmt.plural(changes.total + changes.images, "ndryshimin tuaj të papublikuar",
                           "ndryshimet tuaja të papublikuara") + ". " +
                "Nëse doni t'i ruani, anuloni dhe shënoni ndryshimet para se të ringarkoni."
        })
      ])
    ]),
    footer: ui.el("div", { class: "row row--end row--tight", style: "width:100%" }, [cancelBtn, reloadBtn])
  });

  cancelBtn.addEventListener("click", () => modal.close());

  reloadBtn.addEventListener("click", async () => {
    ui.setBusy(reloadBtn, true, "Duke ringarkuar…");
    try {
      const fresh = remote || await context.api.getListings();
      store.hydrate(fresh);
      ui.toast("Të dhënat u ringarkuan.", { text: "Tani keni versionin më të fundit." });
      modal.close();
      context.refresh();
    } catch (e) {
      ui.setBusy(reloadBtn, false);
      ui.toast("Ringarkimi dështoi.", { type: "error", text: e.message });
    }
  });
}

export { showConflictDialog };
