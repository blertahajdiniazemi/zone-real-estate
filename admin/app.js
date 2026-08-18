/* =====================================================================
   ZONE GROUP REAL ESTATE — KONTROLLUESI I PANELIT
   =====================================================================

   Përgjegjësitë:

     1. Rrjedha e autentikimit  (hyrje, rivendosje, dalje, sesion)
     2. Shtresa e aplikacionit  (sidebar, header, përmbajtje)
     3. Navigimi mes moduleve

   E RËNDËSISHME
   Logjika e autentikimit NUK është rishkruar. Ajo vjen e plotë nga
   auth.js, i cili tashmë e zgjidh saktë ruajtjen e sesionit në Safari
   privat, dallimin mes «s'ka internet» dhe «sesioni skadoi», dhe
   përkthimin e gabimeve në shqip. Këtu vetëm thirret.
   ===================================================================== */

"use strict";

import {
  CFG, makeClient, ADMIN_STORAGE_KEY, MSG, authMessage,
  withTimeout, getSessionSafe, signOutSafe, normRole, isActive,
  resetRedirectUrl, storageIsPersistent
} from "../auth.js";

import { createApi, PANEL_DENY_CODES } from "./core/api.js";
import * as store from "./core/store.js";
import * as fmt from "./core/format.js";
import * as ui from "./ui/ui.js";

import * as dashboard from "./modules/dashboard.js";
import * as properties from "./modules/properties.js";
import * as users from "./modules/users.js";
import * as activity from "./modules/activity.js";
import * as settings from "./modules/settings.js";
import { openPropertyEditor } from "./modules/property-form.js";
import { openPublishDialog } from "./modules/publishing.js";

/* ==================================================================
   Kontrolli i konfigurimit
   ================================================================== */

if (!CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || !CFG.FUNCTION_URL ||
    String(CFG.SUPABASE_URL).includes("YOUR-PROJECT-REF")) {
  document.body.innerHTML =
    '<div class="screen"><div class="auth-box">' +
    '<h1 class="auth-box__title">Konfigurim i paplotësuar</h1>' +
    '<p class="auth-box__lede">Plotësoni <code>admin-config.js</code> me adresën e Supabase-it, ' +
    'çelësin publik anon dhe adresën e funksionit serverik.</p></div></div>';
  throw new Error("admin-config.js is not filled in");
}

/* detectSessionInUrl është QËLLIMISHT i fikur: kjo faqe nuk duhet ta
   konsumojë kurrë tokenin e një linku rivendosjeje. Ai i takon faqes
   reset-password.html. */
const supabase = makeClient({
  storageKey: ADMIN_STORAGE_KEY,
  detectSessionInUrl: false
});

/* ==================================================================
   Gjendja e rrjedhës
   ================================================================== */

const flow = {
  entering: false,
  signingIn: false,
  forgotBusy: false,
  expiring: false,
  loggingOut: false,
  bootDone: false
};

const ROLE_LABEL = { admin: "Administrator", editor: "Redaktor" };

const $ = (id) => document.getElementById(id);
const SCREENS = ["screen-boot", "screen-login", "screen-forgot", "screen-denied"];

function showScreen(which) {
  for (const id of SCREENS) $(id).hidden = (id !== which);
  $("app").hidden = which !== null;
  document.body.classList.toggle("is-app", which === null);
}

function authMsg(elementId, text, tone) {
  const node = $(elementId);
  node.textContent = text || "";
  node.className = "auth-msg" + (text ? " is-shown auth-msg--" + (tone || "error") : "");
}

/* ==================================================================
   API
   ================================================================== */

const api = createApi(supabase, {
  onExpired: (text) => handleExpired(text),
  onDenied: (text) => showDenied(text)
});

async function handleExpired(text) {
  if (flow.expiring) return;
  flow.expiring = true;
  try {
    store.reset();
    await signOutSafe(supabase, "local");
    showScreen("screen-login");
    authMsg("loginMsg", text || MSG.expired, "error");
    $("email").focus();
  } finally {
    flow.expiring = false;
  }
}

function showDenied(text) {
  $("deniedMsg").textContent = text || "Llogaria juaj nuk ka leje për këtë panel.";
  showScreen("screen-denied");
}

/* ==================================================================
   Rrjedha e hyrjes
   ================================================================== */

function setLoginBusy(busy) {
  const btn = $("btnLogin");
  ui.setBusy(btn, busy, busy ? "Duke u kyçur…" : null);
  $("email").disabled = busy;
  $("password").disabled = busy;
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (flow.signingIn) return;

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    authMsg("loginMsg", "Plotësoni email-in dhe fjalëkalimin.", "error");
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    authMsg("loginMsg", "Adresa e email-it nuk duket e saktë.", "error");
    return;
  }

  flow.signingIn = true;
  setLoginBusy(true);
  authMsg("loginMsg", "");

  let result;
  try {
    result = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 25000);
  } catch (err) {
    flow.signingIn = false;
    setLoginBusy(false);
    authMsg("loginMsg", authMessage(err, MSG.server), "error");
    return;
  }

  const error = result && result.error;
  const session = result && result.data && result.data.session;

  if (error) {
    flow.signingIn = false;
    setLoginBusy(false);
    authMsg("loginMsg", authMessage(error, MSG.generic), "error");
    $("password").value = "";
    $("password").focus();
    return;
  }

  /* Supabase mund të kthejë përdorues pa sesion (p.sh. email i
     pakonfirmuar). Pa këtë kontroll, faqja «kyçej» dhe pastaj ngecte. */
  if (!session) {
    flow.signingIn = false;
    setLoginBusy(false);
    authMsg("loginMsg", MSG.notConfirmed, "error");
    $("password").value = "";
    return;
  }

  $("password").value = "";
  try {
    await enterPanel();
  } finally {
    flow.signingIn = false;
    setLoginBusy(false);
  }
});

/* ---------------- Rivendosja e fjalëkalimit ---------------- */

$("linkForgot").addEventListener("click", () => {
  if (flow.signingIn) return;
  $("forgotEmail").value = $("email").value.trim();
  authMsg("forgotMsg", "");
  showScreen("screen-forgot");
  $("forgotEmail").focus();
});

$("linkBackToLogin").addEventListener("click", () => {
  if (flow.forgotBusy) return;
  authMsg("loginMsg", "");
  showScreen("screen-login");
  $("email").focus();
});

$("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (flow.forgotBusy) return;

  const email = $("forgotEmail").value.trim();
  if (!email) { authMsg("forgotMsg", "Shkruani email-in tuaj.", "error"); return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    authMsg("forgotMsg", "Adresa e email-it nuk duket e saktë.", "error");
    return;
  }

  const redirectTo = resetRedirectUrl();
  if (!redirectTo) {
    authMsg("forgotMsg", "Faqja duhet hapur nga interneti, jo si skedar lokal.", "error");
    return;
  }

  flow.forgotBusy = true;
  const btn = $("btnForgot");
  ui.setBusy(btn, true, "Duke dërguar…");
  $("forgotEmail").disabled = true;
  authMsg("forgotMsg", "");

  try {
    const { error } = await withTimeout(
      supabase.auth.resetPasswordForEmail(email, { redirectTo }), 25000);

    /* Mesazhi i suksesit shfaqet VETËM kur Supabase e pranoi vërtet
       kërkesën. Ndryshe njerëzit presin një email që s'u nis kurrë. */
    if (error) {
      authMsg("forgotMsg", authMessage(error, MSG.emailNotSent), "error");
      return;
    }

    /* Formulimi mbetet neutral: nuk zbulojmë nëse adresa ekziston. */
    authMsg("forgotMsg", "Nëse adresa ekziston, linku u dërgua.", "success");
    $("forgotEmail").blur();

  } catch (err) {
    authMsg("forgotMsg", authMessage(err, MSG.server), "error");
  } finally {
    flow.forgotBusy = false;
    ui.setBusy(btn, false);
    $("forgotEmail").disabled = false;
  }
});

/* ---------------- Dalja ---------------- */

async function doLogout() {
  if (flow.loggingOut) return;

  if (store.isDirty()) {
    const leave = await ui.confirmDialog({
      title: "Keni ndryshime të paruajtura.",
      message: "Nëse dilni tani, ndryshimet e papublikuara do të humbasin.",
      confirmLabel: "Dil gjithsesi",
      cancelLabel: "Vazhdo punën",
      danger: true
    });
    if (!leave) return;
  }

  flow.loggingOut = true;
  $("btnDeniedOut").disabled = true;

  /* Gjendja pastrohet e para: edhe nëse rrjeti bie gjatë daljes, paneli
     nuk mbetet i hapur me të dhëna të vjetra. */
  store.reset();
  await signOutSafe(supabase, "global");

  showScreen("screen-login");
  authMsg("loginMsg", "Dolët nga llogaria.", "success");
  $("email").value = "";
  $("password").value = "";
  $("email").focus();

  flow.loggingOut = false;
  $("btnDeniedOut").disabled = false;
}

$("btnDeniedOut").addEventListener("click", doLogout);

/* ==================================================================
   Hyrja në panel
   ================================================================== */

async function enterPanel() {
  if (flow.entering) return;
  flow.entering = true;
  try { await enterPanelInner(); } finally { flow.entering = false; }
}

async function enterPanelInner() {
  showScreen("screen-boot");
  $("bootText").textContent = "Duke verifikuar lejet…";

  let profile;
  try {
    const res = await api.getProfile();
    profile = res && res.profile;
    if (!profile) throw new Error(MSG.server);
  } catch (e) {
    /* 401 dhe 403-shet e panelit i kanë shfaqur tashmë ekranet e veta. */
    if (e.status === 401) return;
    if (e.status === 403 && PANEL_DENY_CODES.includes(e.code)) return;

    /* Gjithçka tjetër — rrjet, server, kohë e mbaruar — nuk është faji i
       përdoruesit. Kthehet te hyrja me një mesazh të kuptueshëm. */
    store.reset();
    showScreen("screen-login");
    authMsg("loginMsg", e.message || MSG.server, "error");
    return;
  }

  const me = { ...profile, role: normRole(profile.role) };

  if (!isActive(me)) {
    showDenied("Përdorues joaktiv. Kontaktoni administratorin.");
    return;
  }
  if (!["admin", "editor"].includes(me.role)) {
    showDenied("Roli juaj nuk lejon qasje në këtë panel.");
    return;
  }

  store.setProfile(me);
  store.loadPrefs();

  buildShell();
  showScreen(null);

  if (!storageIsPersistent()) {
    ui.toast("Sesioni nuk po ruhet.", {
      type: "warning",
      text: "Shfletuesi po bllokon ruajtjen. Do të dilni kur ta mbyllni skedën."
    });
  }

  await loadData();
}

/* ==================================================================
   Ngarkimi i të dhënave
   ================================================================== */

async function loadData() {
  store.get().loading = true;
  refresh();

  try {
    const res = await api.getListings();
    store.hydrate(res);

    /* Publikimi i fundit lexohet nga regjistri. Redaktorët nuk kanë leje
       për të — ai funksion kthen null pa e trajtuar si gabim. */
    if (store.isAdmin()) {
      const { fetchLastPublish } = await import("./modules/activity.js");
      store.get().lastPublish = await fetchLastPublish(api);
    }
  } catch (e) {
    store.get().loadError = e.message || "Të dhënat nuk u ngarkuan dot.";
    ui.toast("Të dhënat nuk u ngarkuan.", { type: "error", text: store.get().loadError });
  } finally {
    store.get().loading = false;
    refresh();
  }
}

async function reloadData() {
  if (store.isDirty()) {
    const ok = await ui.confirmDialog({
      title: "Ringarko të dhënat?",
      message: "Ndryshimet tuaja të papublikuara do të zëvendësohen nga versioni i uebfaqes.",
      confirmLabel: "Ringarko",
      cancelLabel: "Anulo",
      danger: true
    });
    if (!ok) return;
  }
  await loadData();
  ui.toast("Të dhënat u ringarkuan.");
}

/* ==================================================================
   Navigimi
   ================================================================== */

const ROUTES = {
  dashboard:   { title: "Paneli Kryesor", group: "Kryesore", render: dashboard.render },
  properties:  { title: "Pronat", group: "Pronat", render: properties.render },
  featured:    { title: "Prona të Veçuara", group: "Pronat", render: properties.renderFeatured },
  users:       { title: "Përdoruesit", group: "Administrimi", render: users.render, adminOnly: true },
  activity:    { title: "Regjistri i Aktivitetit", group: "Administrimi", render: activity.render, adminOnly: true },
  settings:    { title: "Cilësimet", group: "Administrimi", render: settings.render }
};

let currentRoute = "dashboard";

function navigate(route, preset) {
  /* «Shto Pronë» nuk është faqe — është një dritare mbi listën. */
  if (route === "property-new") {
    currentRoute = "properties";
    properties.applyPreset({});
    renderView();
    openPropertyEditor(null, refresh);
    updateNav();
    return;
  }

  if (!ROUTES[route]) route = "dashboard";
  if (ROUTES[route].adminOnly && !store.isAdmin()) route = "dashboard";

  currentRoute = route;
  if (route === "properties") properties.applyPreset(preset);

  closeDrawer();
  renderView();
  updateNav();
  $("main").scrollTop = 0;
}

const context = {
  api,
  refresh: () => refresh(),
  navigate,
  openSite,
  openPublish: () => openPublishDialog(context)
};

function openSite() {
  const url = String(CFG.SITE_URL || CFG.SITE_BASE || "").replace(/\/+$/, "");
  if (!url) {
    ui.toast("Adresa e uebfaqes nuk është e konfiguruar.", {
      type: "warning",
      text: "Shtoni SITE_URL te admin-config.js."
    });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ==================================================================
   Shtresa
   ================================================================== */

const NAV_GROUPS = [
  {
    label: "Kryesore",
    items: [{ route: "dashboard", label: "Paneli Kryesor", icon: "dashboard" }]
  },
  {
    label: "Pronat",
    items: [
      { route: "properties", label: "Pronat", icon: "building", count: () => store.get().properties.length },
      { route: "property-new", label: "Shto Pronë", icon: "plus" },
      { route: "featured", label: "Të Veçuara", icon: "star", count: () => store.stats().featured }
    ]
  },
  {
    label: "Administrimi",
    items: [
      { route: "users", label: "Përdoruesit", icon: "users", adminOnly: true },
      { route: "activity", label: "Regjistri i Aktivitetit", icon: "activity", adminOnly: true },
      { route: "settings", label: "Cilësimet", icon: "settings" }
    ]
  }
];

let shellBuilt = false;

function buildShell() {
  if (shellBuilt) return;
  shellBuilt = true;

  buildSidebar();
  buildHeader();

  $("app").classList.toggle("is-collapsed", store.get().ui.sidebarCollapsed);

  $("sidebarToggle").addEventListener("click", () => {
    const collapsed = !store.get().ui.sidebarCollapsed;
    store.setUi({ sidebarCollapsed: collapsed });
    $("app").classList.toggle("is-collapsed", collapsed);
  });

  $("burger").addEventListener("click", openDrawer);

  navigate("dashboard");
}

/* ---------------- Sidebar ---------------- */

function buildSidebar() {
  const nav = ui.clear($("sidebarNav"));

  for (const group of NAV_GROUPS) {
    const items = group.items.filter((item) => !item.adminOnly || store.isAdmin());
    if (!items.length) continue;

    const box = ui.el("div", { class: "nav__group" }, [
      ui.el("div", { class: "nav__label", text: group.label })
    ]);

    for (const item of items) {
      const btn = ui.el("button", {
        class: "nav__item",
        type: "button",
        dataset: { route: item.route },
        "data-tip": item.label,
        onclick: () => navigate(item.route)
      }, [
        ui.el("span", { class: "nav__icon" }, [ui.icon(item.icon)]),
        ui.el("span", { class: "nav__text", text: item.label }),
        item.count ? ui.el("span", { class: "nav__count", dataset: { count: item.route } }) : null
      ]);
      box.appendChild(btn);
    }

    nav.appendChild(box);
  }
}

function updateNav() {
  for (const btn of ui.$$(".nav__item", $("sidebarNav"))) {
    const route = btn.dataset.route;
    const active = route === currentRoute;
    btn.classList.toggle("is-active", active);
    if (active) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  }

  /* Numëruesit rifreskohen me çdo ndryshim gjendjeje. */
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (!item.count) continue;
      const node = ui.$('[data-count="' + item.route + '"]', $("sidebarNav"));
      if (node) node.textContent = fmt.num(item.count());
    }
  }

  const route = ROUTES[currentRoute] || ROUTES.dashboard;
  $("headerTitle").textContent = route.title;
  ui.clear($("breadcrumbs")).append(
    ui.el("span", { text: route.group }),
    ui.el("span", { class: "breadcrumbs__sep", text: "/" }),
    ui.el("span", { text: route.title })
  );
}

/* Sirtari në telefon */
let scrim = null;

function openDrawer() {
  $("sidebar").classList.add("is-open");
  $("burger").setAttribute("aria-expanded", "true");
  scrim = ui.el("div", { class: "drawer-scrim", onclick: closeDrawer });
  document.body.appendChild(scrim);
}

function closeDrawer() {
  $("sidebar").classList.remove("is-open");
  $("burger").setAttribute("aria-expanded", "false");
  if (scrim) { scrim.remove(); scrim = null; }
}

/* ---------------- Header ---------------- */

function buildHeader() {
  /* Kërkimi global: çon te lista e pronave me pyetjen e shkruar. */
  const search = ui.searchField({
    placeholder: "Kërko pronë sipas titullit, kodit ose lokacionit…",
    onInput: (value) => {
      if (!value) return;
      properties.applyPreset({ search: value });
      if (currentRoute !== "properties") navigate("properties", { search: value });
      else renderView();
    }
  });
  ui.clear($("headerSearch")).appendChild(search);

  /* Treguesi i ndryshimeve të papublikuara — elementi që i thotë
     administratorit, pa e pyetur askënd, nëse puna e tij ka dalë live. */
  $("pubState").addEventListener("click", () => {
    if (store.isDirty()) openPublishDialog(context);
    else navigate("dashboard");
  });

  /* Veprimet e shpejta */
  const quickActions = [
    { label: "Shto Pronë", icon: "plus", onClick: () => navigate("property-new") },
    { label: "Publiko Ndryshimet", icon: "publish", onClick: () => openPublishDialog(context), needsPublish: true },
    { separator: true },
    { label: "Shiko Uebfaqen", icon: "external", onClick: openSite },
    { label: "Ringarko të dhënat", icon: "refresh", onClick: reloadData }
  ].filter((a) => !a.needsPublish || store.canPublish());

  const quickBtn = ui.el("button", {
    class: "btn btn--secondary btn--icon", type: "button", "aria-label": "Veprime të shpejta"
  }, [ui.icon("plus")]);
  ui.clear($("headerQuick")).appendChild(ui.dropdown(quickBtn, quickActions));

  /* Profili */
  const me = store.get().me;
  const label = me.full_name || me.email;

  const profileBtn = ui.el("button", { class: "profile-btn", type: "button" }, [
    ui.el("span", { class: "avatar", text: fmt.initials(label) }),
    ui.el("span", { class: "profile-btn__meta" }, [
      ui.el("span", { class: "profile-btn__name", text: label }),
      ui.el("span", { class: "profile-btn__role", text: ROLE_LABEL[me.role] || me.role })
    ]),
    ui.icon("chevronDown", 14)
  ]);

  const profileMenu = ui.dropdown(profileBtn, [
    {
      head: ui.el("div", { class: "menu__head" }, [
        ui.el("div", { class: "menu__head-name", text: me.email }),
        ui.el("div", {
          class: "menu__head-role",
          text: (ROLE_LABEL[me.role] || me.role) + " · " + (store.canPublish() ? "mund të publikojë" : "pa leje publikimi")
        })
      ])
    },
    { label: "Cilësimet", icon: "settings", onClick: () => navigate("settings") },
    { label: "Shiko Uebfaqen", icon: "external", onClick: openSite },
    { separator: true },
    { label: "Dil", icon: "logout", danger: true, onClick: doLogout }
  ]);

  ui.clear($("headerProfile")).appendChild(profileMenu);
}

function updatePublishState() {
  const node = $("pubState");
  const changes = store.changeSummary();
  const dirty = changes.total > 0 || changes.images > 0;
  const count = changes.total + changes.images;

  node.classList.toggle("is-dirty", dirty);
  node.hidden = !store.get().loaded;

  ui.clear(node).append(
    ui.el("span", { class: "pub-state__dot" }),
    dirty
      ? ui.el("span", {}, [
          ui.el("span", { class: "pub-state__num", text: fmt.num(count) }),
          document.createTextNode(" " + (count === 1 ? "ndryshim i papublikuar" : "ndryshime të papublikuara"))
        ])
      : ui.el("span", { text: "Të gjitha ndryshimet janë publikuar" })
  );

  node.setAttribute("title", dirty
    ? "Klikoni për të publikuar ndryshimet"
    : "Uebfaqja përputhet me atë që keni këtu");
}

/* ==================================================================
   Vizatimi
   ================================================================== */

function renderView() {
  const main = ui.clear($("viewRoot"));
  const state = store.get();

  if (state.loading && !state.loaded) {
    main.appendChild(ui.el("div", { class: "view" }, [
      ui.el("div", { class: "stat-grid mb-4" }, [ui.skeletonCards(8)]),
      ui.el("div", { class: "skeleton skeleton--card", style: "height:220px" })
    ]));
    return;
  }

  if (state.loadError && !state.loaded) {
    main.appendChild(ui.el("div", { class: "view" }, [
      ui.emptyState({
        iconName: "alert",
        title: "Të dhënat nuk u ngarkuan",
        text: state.loadError,
        actionLabel: null,
        secondaryLabel: "Provo përsëri",
        onSecondary: () => loadData()
      })
    ]));
    return;
  }

  const route = ROUTES[currentRoute] || ROUTES.dashboard;
  main.appendChild(route.render(context));
}

/** Rivizaton pamjen aktuale dhe pjesët e përbashkëta të shtresës. */
function refresh() {
  if (!shellBuilt) return;
  renderView();
  updateNav();
  updatePublishState();
}

store.subscribe(() => {
  if (!shellBuilt) return;
  updateNav();
  updatePublishState();
});

/* ==================================================================
   Mbrojtja nga humbja e punës
   ================================================================== */

window.addEventListener("beforeunload", (e) => {
  if (store.isDirty()) { e.preventDefault(); e.returnValue = ""; }
});

/* ==================================================================
   Sesioni
   ==================================================================

   RREGULL: brenda onAuthStateChange nuk thirret KURRË një funksion
   tjetër i Supabase-it me await. Supabase mban një bllokim të
   brendshëm ndërsa njofton dëgjuesit; nëse brenda tij kërkohet
   getSession(), të dyja presin njëra-tjetrën përgjithmonë. Kjo ishte
   arsyeja kryesore pse kyçja «ngecte» herë pas here me kredenciale
   krejtësisht të sakta. Puna e vërtetë shtyhet me setTimeout(…, 0).
   ================================================================== */

const defer = (fn) => setTimeout(fn, 0);

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
    if (store.get().me || store.get().loaded) {
      store.reset();
      defer(() => {
        showScreen("screen-login");
        authMsg("loginMsg", "Dolët nga llogaria.", "info");
      });
    }
    return;
  }

  /* Tokeni u rinovua vetë — sesioni vazhdon, s'ka çfarë të bëhet. */
  if (event === "TOKEN_REFRESHED") return;

  /* Kyçje nga një skedë tjetër, ose rikthim i sesionit. Kur kyçja bëhet
     nga vetë ky formular, e trajton formulari — që të mos hyjmë dy herë. */
  if (event === "SIGNED_IN" && session && !store.get().me && !flow.signingIn && flow.bootDone) {
    defer(() => enterPanel());
  }
});

/* Rrjeta e sigurisë: kap një sesion që ka rënë pa lajmëruar. Askush nuk
   nxirret jashtë vetëm sepse interneti u ndërpre për pak sekonda. */
setInterval(async () => {
  if (!store.get().me || flow.expiring || document.hidden) return;
  const { session, offline } = await getSessionSafe(supabase, 20000);
  if (offline) return;
  if (!session) await handleExpired();
}, 60000);

window.addEventListener("online", async () => {
  if (!store.get().me || flow.expiring) return;
  const { session, offline } = await getSessionSafe(supabase, 20000);
  if (!offline && !session) await handleExpired();
});

/* ==================================================================
   Nisja
   ================================================================== */

(async function boot() {
  showScreen("screen-boot");

  /* Mesazhet që vijnë nga faqja e rivendosjes së fjalëkalimit. */
  const query = new URLSearchParams(location.search);
  const justReset = query.get("reset") === "1";
  const openForgot = query.get("forgot") === "1";
  if (justReset || openForgot) {
    try { history.replaceState(null, "", location.pathname); } catch (_) {}
  }

  function toLogin(text, tone) {
    showScreen(openForgot ? "screen-forgot" : "screen-login");
    if (text) authMsg(openForgot ? "forgotMsg" : "loginMsg", text, tone);
    $(openForgot ? "forgotEmail" : "email").focus();
  }

  const { session, offline, error } = await getSessionSafe(supabase, 15000);
  flow.bootDone = true;

  if (justReset) {
    /* Fjalëkalimi sapo u ndryshua: gjithmonë kërkohet kyçje e re. */
    if (session) await signOutSafe(supabase, "local");
    toLogin(MSG.changed, "success");
    return;
  }

  if (offline) {
    toLogin(authMessage(error, MSG.network), "error");
    return;
  }

  if (session) await enterPanel();
  else toLogin("");
})();
