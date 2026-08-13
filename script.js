/* =====================================================================
   ZONE REAL ESTATE — page builder
   ---------------------------------------------------------------------
   You should not need to edit this file.
   To change your phone number or listings, edit listings.js instead.
   ===================================================================== */
(function () {
  "use strict";

  var CFG = window.ZONE_CONFIG || {};
  var DISPLAY_PHONE = CFG.DISPLAY_PHONE || "";
  var CALL_PHONE = CFG.CALL_PHONE || "";
  var listings = CFG.listings || [];

  var activeFilter = "all";
  var lastFocused = null;

  /* Fallback drawing, used if a listing's image file is missing. */
  var PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
        '<rect width="400" height="300" fill="#E2D9C4"/>' +
        '<g stroke="#B8AC8A" stroke-width="1">' +
          '<line x1="0" y1="75" x2="400" y2="75"/>' +
          '<line x1="0" y1="150" x2="400" y2="150"/>' +
          '<line x1="0" y1="225" x2="400" y2="225"/>' +
          '<line x1="100" y1="0" x2="100" y2="300"/>' +
          '<line x1="200" y1="0" x2="200" y2="300"/>' +
          '<line x1="300" y1="0" x2="300" y2="300"/>' +
        '</g>' +
        '<path d="M200 108 L148 155 L164 155 L164 196 L236 196 L236 155 L252 155 Z" ' +
          'fill="none" stroke="#8A7F60" stroke-width="3" stroke-linejoin="round"/>' +
        '<text x="200" y="232" font-family="monospace" font-size="12" fill="#8A7F60" ' +
          'text-anchor="middle">ADD PHOTO</text>' +
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
    return String(item.status || "").toLowerCase().indexOf("rent") !== -1;
  }

  function attachImage(img, src) {
    img.src = src || PLACEHOLDER;
    img.onerror = function () {
      this.onerror = null;
      this.src = PLACEHOLDER;
    };
  }

  /* ---------------------------------------------------------------
     Header, footer and summary block
     --------------------------------------------------------------- */
  function fillSiteDetails() {
    var telLinks = document.querySelectorAll('a[href="tel:CALL_PHONE_DIGITS"]');
    for (var i = 0; i < telLinks.length; i++) {
      telLinks[i].setAttribute("href", "tel:" + CALL_PHONE);
    }

    setText("topbarPhone", DISPLAY_PHONE);
    setText("footerPhone", DISPLAY_PHONE);
    setText("hero-phone", DISPLAY_PHONE);
    setText("hero-city", CFG.CITY || "—");
    setText("hero-updated", CFG.LAST_UPDATED || "—");
    setText("hero-count", listings.length + (listings.length === 1 ? " active" : " active"));
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ---------------------------------------------------------------
     Listing cards
     --------------------------------------------------------------- */
  function buildCard(item, index) {
    var card = document.createElement("article");
    card.className = "sheet";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "View details for " + item.title);

    var stampClass = isRent(item) ? "sheet__stamp sheet__stamp--rent" : "sheet__stamp";

    card.innerHTML =
      '<span class="sheet__pin" aria-hidden="true"></span>' +
      '<figure class="sheet__figure">' +
        '<img class="sheet__photo" alt="' + esc(item.title) + '" loading="lazy">' +
        '<span class="' + stampClass + '">' + esc(item.status || "For Sale") + '</span>' +
      '</figure>' +
      '<div class="sheet__body">' +
        '<h2 class="sheet__title">' + esc(item.title) + '</h2>' +
        '<p class="sheet__location">' + esc(item.location || "") + '</p>' +
        '<div class="sheet__meta">' +
          '<span class="sheet__price">' + esc(item.price || "") + '</span>' +
          '<span class="sheet__stats">' +
            esc(item.beds) + ' bd &nbsp;·&nbsp; ' + esc(item.baths) + ' ba &nbsp;·&nbsp; ' + esc(item.size) +
          '</span>' +
        '</div>' +
        '<p class="sheet__summary">' + esc(item.summary || "") + '</p>' +
        '<div class="sheet__actions">' +
          '<a class="sheet__call" href="tel:' + esc(CALL_PHONE) + '">' +
            '<span aria-hidden="true">&#9742;</span> Call about this' +
          '</a>' +
          '<button class="sheet__more" type="button">Details</button>' +
        '</div>' +
      '</div>';

    attachImage(card.querySelector(".sheet__photo"), item.image);

    // Opening the detail view: clicking the card, the Details button,
    // or pressing Enter/Space while it's focused. The call link is
    // excluded so tapping it dials instead of opening the panel.
    function open(event) {
      if (event.target.closest(".sheet__call")) return;
      lastFocused = card;
      openDetail(index);
    }

    card.addEventListener("click", open);
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        lastFocused = card;
        openDetail(index);
      }
    });

    return card;
  }

  function renderGrid() {
    var grid = document.getElementById("listingsGrid");
    var count = document.getElementById("filterCount");
    grid.innerHTML = "";

    var visible = [];
    for (var i = 0; i < listings.length; i++) {
      if (activeFilter === "all" || listings[i].status === activeFilter) {
        visible.push(i);
      }
    }

    if (count) {
      count.textContent = visible.length + (visible.length === 1 ? " property" : " properties");
    }

    if (!visible.length) {
      grid.innerHTML =
        '<p class="listings__empty">Nothing in this category right now. ' +
        'Call ' + esc(DISPLAY_PHONE) + ' and ask what else is coming up.</p>';
      return;
    }

    for (var j = 0; j < visible.length; j++) {
      grid.appendChild(buildCard(listings[visible[j]], visible[j]));
    }
  }

  /* ---------------------------------------------------------------
     Filter buttons
     --------------------------------------------------------------- */
  function initFilters() {
    var buttons = document.querySelectorAll(".filter");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        for (var k = 0; k < buttons.length; k++) {
          buttons[k].classList.remove("is-active");
        }
        this.classList.add("is-active");
        activeFilter = this.getAttribute("data-filter");
        renderGrid();
      });
    }
  }

  /* ---------------------------------------------------------------
     Detail panel
     --------------------------------------------------------------- */
  function openDetail(index) {
    var item = listings[index];
    if (!item) return;

    var panel = document.getElementById("detail");
    var body = document.getElementById("detailBody");

    var features = "";
    if (item.features && item.features.length) {
      features = '<p class="detail__subhead">Features</p><ul class="detail__features">';
      for (var i = 0; i < item.features.length; i++) {
        features += "<li>" + esc(item.features[i]) + "</li>";
      }
      features += "</ul>";
    }

    var stampClass = isRent(item) ? "detail__stamp detail__stamp--rent" : "detail__stamp";

    body.innerHTML =
      '<img class="detail__photo" alt="' + esc(item.title) + '">' +
      '<div class="detail__body">' +
        '<span class="' + stampClass + '">' + esc(item.status || "For Sale") + '</span>' +
        '<h2 class="detail__title" id="detailTitle">' + esc(item.title) + '</h2>' +
        '<p class="detail__location">' + esc(item.location || "") + '</p>' +
        '<div class="detail__specs">' +
          spec("Price", item.price, true) +
          spec("Bedrooms", item.beds) +
          spec("Bathrooms", item.baths) +
          spec("Size", item.size) +
        '</div>' +
        '<p class="detail__text">' + esc(item.details || item.summary || "") + '</p>' +
        features +
        '<a class="detail__call" href="tel:' + esc(CALL_PHONE) + '">' +
          '<span aria-hidden="true">&#9742;</span> Call ' + esc(DISPLAY_PHONE) +
        '</a>' +
        '<p class="detail__callnote">Ask about this property by name — ' + esc(item.title) + '</p>' +
      '</div>';

    attachImage(body.querySelector(".detail__photo"), item.image);

    panel.hidden = false;
    document.body.classList.add("is-locked");
    body.scrollTop = 0;

    var closeBtn = panel.querySelector(".detail__close");
    if (closeBtn) closeBtn.focus();
  }

  function spec(label, value, isPrice) {
    var cls = isPrice ? "detail__spec-value detail__spec-value--price" : "detail__spec-value";
    return (
      '<div class="detail__spec">' +
        '<span class="detail__spec-label">' + esc(label) + "</span>" +
        '<span class="' + cls + '">' + esc(value == null ? "—" : value) + "</span>" +
      "</div>"
    );
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

  /* --------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    fillSiteDetails();
    initFilters();
    initDetail();
    renderGrid();
  });
})();
