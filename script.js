/* =====================================================================
   ZONE REAL ESTATE — page builder
   ---------------------------------------------------------------------
   Builds the listing cards and detail panel from your data.
   You should not need to edit this file.
   To change your phone number or properties, edit listings.js.
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.ZONE_CONFIG || {};
  var DISPLAY_PHONE = CFG.DISPLAY_PHONE || "";
  var CALL_PHONE = CFG.CALL_PHONE || "";
  var T = CFG.TEXT || {};

  /* -------------------------------------------------------------------
     Compatibility layer

     listings.js is written by the admin panel and may contain records in
     either shape:

       old   { status, image, ... }
       new   { transactionType, lifecycle, published, coverImage, images[],
               featured, featuredOrder, ... }

     Everything below reads through these three helpers, so a file
     containing a mix of both still renders correctly. A record with no
     `published` field is treated as published — that is what every
     listing written before this change was.
     ------------------------------------------------------------------- */

  var allListings = CFG.listings || [];

  /* Drafts, deactivated and archived properties are stored in the file
     but must never reach the page. */
  var listings = [];
  for (var n = 0; n < allListings.length; n++) {
    if (allListings[n] && allListings[n].published !== false) listings.push(allListings[n]);
  }

  /** Cover photo, whichever field carries it. */
  function coverOf(item) {
    if (!item) return "";
    if (item.coverImage) return item.coverImage;
    if (item.images && item.images.length) return item.images[0];
    return item.image || "";
  }

  /** Every photo, oldest field shape included. */
  function photosOf(item) {
    if (!item) return [];
    if (item.images && item.images.length) return item.images;
    var single = coverOf(item);
    return single ? [single] : [];
  }

  /** Index of the property to show in the hero.
   *
   *  Previously this was always listings[0], which meant re-ordering the
   *  file silently changed what was featured. Now the `featured` flag
   *  decides, and the array position means nothing. The old behaviour is
   *  kept only as a fallback for files written before the flag existed. */
  /** The filter buttons carry the Albanian status text ("Për shitje").
   *  Matching still works on that text, but goes through transactionType
   *  first so a future label change cannot break filtering. */
  function matchesFilter(item, filter) {
    if (!item) return false;
    if (item.status === filter) return true;
    var wantsRent = String(filter).toLowerCase()
      .indexOf(String(T.statusQira || "Me qira").toLowerCase()) !== -1;
    return item.transactionType
      ? (wantsRent ? item.transactionType === "rent" : item.transactionType === "sale")
      : false;
  }

  function featuredIndex() {
    var best = -1;
    var bestOrder = Infinity;
    for (var i = 0; i < listings.length; i++) {
      if (!listings[i] || listings[i].featured !== true) continue;
      var order = typeof listings[i].featuredOrder === "number"
        ? listings[i].featuredOrder : 9999;
      if (order < bestOrder) { bestOrder = order; best = i; }
    }
    return best !== -1 ? best : (listings.length ? 0 : -1);
  }

  var activeFilter = "all";
  var lastFocused = null;

  var PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
        '<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="#241435"/>' +
          '<stop offset="100%" stop-color="#140C1C"/>' +
        '</linearGradient></defs>' +
        '<rect width="400" height="300" fill="url(#p)"/>' +
        '<path d="M200 112 L152 156 L167 156 L167 196 L233 196 L233 156 L248 156 Z" ' +
          'fill="none" stroke="#E0518A" stroke-width="2.4" stroke-linejoin="round" opacity="0.75"/>' +
        '<path d="M0 232 q50 -8 100 0 t100 0 t100 0 t100 0" ' +
          'fill="none" stroke="#F6C56B" stroke-width="1.6" opacity="0.45"/>' +
        '<text x="200" y="264" font-family="monospace" font-size="12" fill="#F6C56B" ' +
          'text-anchor="middle" opacity="0.6">' + (T.shtoFoto || "SHTO FOTO") + '</text>' +
      '</svg>'
    );

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isRent(item) {
    // Matched against the Albanian word so the violet "Me qira" badge
    // shows on the right cards.
    /* The new field is unambiguous; the old one is text that has to be
       matched loosely. Prefer the field when it is present. */
    if (item && item.transactionType) return item.transactionType === "rent";
    var rentWord = String(T.statusQira || "Me qira").toLowerCase();
    return String(item.status || "").toLowerCase().indexOf(rentWord) !== -1;
  }

  function attachImage(img, src) {
    img.src = src || PLACEHOLDER;
    img.onerror = function () {
      this.onerror = null;
      this.src = PLACEHOLDER;
    };
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* The hero drop shows the property marked "E veçuar" in the admin
     panel. File order no longer has any effect on this. */
  function fillHeroDrop() {
    var drop = document.getElementById("heroDrop");
    var index = featuredIndex();
    var item = index !== -1 ? listings[index] : null;
    if (!drop || !item) {
      if (drop) drop.style.display = "none";
      return;
    }
    var photo = document.getElementById("heroDropPhoto");
    if (photo) {
      photo.alt = item.title;
      attachImage(photo, coverOf(item));
    }
    setText("heroDropTitle", item.title);
    setText("heroDropPrice", item.price || "");
    drop.setAttribute("aria-label", (T.shikoDetajet || "Shiko detajet për") + " " + item.title);
    drop.addEventListener("click", function () {
      lastFocused = drop;
      openDetail(index);
    });
  }

  function fillSiteDetails() {
    var telLinks = document.querySelectorAll('a[href="tel:CALL_PHONE_DIGITS"]');
    for (var i = 0; i < telLinks.length; i++) {
      telLinks[i].setAttribute("href", "tel:" + CALL_PHONE);
    }
    setText("topbarPhone", DISPLAY_PHONE);
    setText("footerPhone", DISPLAY_PHONE);
    setText("hero-city", CFG.CITY || "—");
    setText("hero-updated", CFG.LAST_UPDATED || "—");
    setText("hero-count", listings.length + " " + (T.aktive || "aktive"));
  }

  /* ---------------------------------------------------------------
     Cards
     --------------------------------------------------------------- */
  function buildCard(item, index, position) {
    var card = document.createElement("article");
    card.className = "card surface";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", (T.shikoDetajet || "Shiko detajet për") + " " + item.title);
    // Cards within a row surface one after another, not all at once
    card.setAttribute("data-delay", String(position % 3));

    var stampClass = isRent(item) ? "card__stamp card__stamp--rent" : "card__stamp";

    card.innerHTML =
      '<figure class="card__figure">' +
        '<img class="card__photo" alt="' + esc(item.title) + '" loading="lazy">' +
        '<span class="card__caustic" aria-hidden="true"></span>' +
        (photosOf(item).length > 1
          ? '<span class="card__shots">' + photosOf(item).length + ' &#128247;</span>'
          : '') +
        '<span class="' + stampClass + '">' + esc(item.status || "For Sale") + '</span>' +
      '</figure>' +
      '<div class="card__body">' +
        '<h2 class="card__title">' + esc(item.title) + '</h2>' +
        '<p class="card__location">' + esc(item.location || "") + '</p>' +
        '<div class="card__meta">' +
          '<span class="card__price">' + esc(item.price || "") + '</span>' +
          '<span class="card__stats">' +
            esc(item.beds) + " " + esc(T.shkurtDhoma || "dh") + " &nbsp;·&nbsp; " +
            esc(item.baths) + " " + esc(T.shkurtBanjo || "bnj") + " &nbsp;·&nbsp; " + esc(item.size) +
          '</span>' +
        '</div>' +
        '<p class="card__summary">' + esc(item.summary || "") + '</p>' +
        '<div class="card__actions">' +
          '<a class="card__call" href="tel:' + esc(CALL_PHONE) + '">' +
            '<span aria-hidden="true">&#9742;</span> ' + esc(T.butoniThirr || "Telefono") +
          '</a>' +
          '<button class="card__more" type="button">' + esc(T.butoniDetajet || "Detajet") + '</button>' +
        '</div>' +
      '</div>';

    attachImage(card.querySelector(".card__photo"), coverOf(item));

    // The call link is excluded so tapping it dials rather than opening.
    card.addEventListener("click", function (event) {
      if (event.target.closest(".card__call")) return;
      lastFocused = card;
      openDetail(index);
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        lastFocused = card;
        openDetail(index);
      }
    });

    return card;
  }

  function renderGrid(animate) {
    var grid = document.getElementById("listingsGrid");
    var count = document.getElementById("filterCount");
    grid.innerHTML = "";

    var visible = [];
    for (var i = 0; i < listings.length; i++) {
      if (activeFilter === "all" || matchesFilter(listings[i], activeFilter)) visible.push(i);
    }

    if (count) {
      count.textContent = visible.length + " " +
        (visible.length === 1 ? (T.pronaNjejes || "pronë") : (T.prona || "prona"));
    }

    if (!visible.length) {
      grid.innerHTML =
        '<p class="listings__empty">' + esc(T.bosh || "") + " " +
        esc(DISPLAY_PHONE) + " " + esc(T.boshFund || "") + "</p>";
      return;
    }

    for (var j = 0; j < visible.length; j++) {
      var card = buildCard(listings[visible[j]], visible[j], j);
      grid.appendChild(card);
      // On a filter change the new set pours straight in; on first
      // load the scroll observer handles it.
      if (animate) {
        (function (el, delay) {
          setTimeout(function () { el.classList.add("is-surfaced"); }, 40 + delay * 70);
        })(card, j);
      }
    }

    if (!animate && window.ZoneLiquid && window.ZoneLiquid.observe) {
      window.ZoneLiquid.observe();
    }
  }

  function initFilters() {
    var buttons = document.querySelectorAll(".filter");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        if (this.classList.contains("is-active")) return;
        for (var k = 0; k < buttons.length; k++) buttons[k].classList.remove("is-active");
        this.classList.add("is-active");
        activeFilter = this.getAttribute("data-filter");

        // Drain the old set, then pour the new one in.
        var grid = document.getElementById("listingsGrid");
        var cards = grid.querySelectorAll(".card");
        for (var c = 0; c < cards.length; c++) cards[c].classList.remove("is-surfaced");

        setTimeout(function () { renderGrid(true); }, cards.length ? 240 : 0);
      });
    }
  }

  /* ---------------------------------------------------------------
     Detail panel
     --------------------------------------------------------------- */
  function spec(label, value, isPrice) {
    var cls = isPrice ? "detail__spec-value detail__spec-value--price" : "detail__spec-value";
    return (
      '<div class="detail__spec">' +
        '<span class="detail__spec-label">' + esc(label) + "</span>" +
        '<span class="' + cls + '">' + esc(value == null ? "—" : value) + "</span>" +
      "</div>"
    );
  }

  function openDetail(index) {
    var item = listings[index];
    if (!item) return;

    var panel = document.getElementById("detail");
    var body = document.getElementById("detailBody");

    var features = "";
    if (item.features && item.features.length) {
      features = '<p class="detail__subhead">' +
        esc(T.karakteristikat || "Karakteristikat") + '</p><ul class="detail__features">';
      for (var i = 0; i < item.features.length; i++) {
        features += "<li>" + esc(item.features[i]) + "</li>";
      }
      features += "</ul>";
    }

    var stampClass = isRent(item) ? "detail__stamp detail__stamp--rent" : "detail__stamp";

    var shots = photosOf(item);
    var gallery = "";
    if (shots.length > 1) {
      gallery = '<div class="detail__gallery">';
      for (var k = 0; k < shots.length; k++) {
        gallery += '<img class="detail__thumb' + (k === 0 ? " is-active" : "") +
          '" data-src="' + esc(shots[k]) + '" alt="' + esc(item.title) +
          " — " + (k + 1) + '" loading="lazy">';
      }
      gallery += "</div>";
    }

    body.innerHTML =
      '<img class="detail__photo" alt="' + esc(item.title) + '">' +
      gallery +
      '<div class="detail__body">' +
        '<span class="' + stampClass + '">' + esc(item.status || "For Sale") + "</span>" +
        '<h2 class="detail__title" id="detailTitle">' + esc(item.title) + "</h2>" +
        '<p class="detail__location">' + esc(item.location || "") + "</p>" +
        '<div class="detail__specs">' +
          spec(T["specÇmimi"] || "Çmimi", item.price, true) +
          spec(T.specDhoma || "Dhoma gjumi", item.beds) +
          spec(T.specBanjo || "Banjo", item.baths) +
          spec(T.specSiperfaqja || "Sipërfaqja", item.size) +
        "</div>" +
        '<p class="detail__text">' + esc(item.details || item.summary || "") + "</p>" +
        features +
        '<a class="detail__call" href="tel:' + esc(CALL_PHONE) + '">' +
          '<span aria-hidden="true">&#9742;</span> ' + esc(T.telefono || "Telefono") + " " + esc(DISPLAY_PHONE) +
        "</a>" +
        '<p class="detail__callnote">' + esc(T.shenimiThirrjes || "") + " " + esc(item.title) + "</p>" +
      "</div>";

    attachImage(body.querySelector(".detail__photo"), coverOf(item));

    /* Gallery: clicking a thumbnail swaps the main photo. Only rendered
       when the property actually has more than one image, so listings
       written before multi-image support look exactly as before. */
    var main = body.querySelector(".detail__photo");
    var thumbs = body.querySelectorAll(".detail__thumb");
    for (var g = 0; g < thumbs.length; g++) {
      attachImage(thumbs[g], thumbs[g].getAttribute("data-src"));
      (function (btn) {
        btn.addEventListener("click", function () {
          attachImage(main, btn.getAttribute("data-src"));
          for (var h = 0; h < thumbs.length; h++) thumbs[h].classList.remove("is-active");
          btn.classList.add("is-active");
        });
      })(thumbs[g]);
    }

    panel.hidden = false;
    document.body.classList.add("is-locked");
    body.scrollTop = 0;

    var closeBtn = panel.querySelector(".detail__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeDetail() {
    var panel = document.getElementById("detail");
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.body.classList.remove("is-locked");
    if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  function initDetail() {
    var panel = document.getElementById("detail");
    panel.addEventListener("click", function (event) {
      if (event.target.hasAttribute("data-close")) closeDetail();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDetail();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillSiteDetails();
    fillHeroDrop();
    initFilters();
    initDetail();
    renderGrid(false);
  });
})();
