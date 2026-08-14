/* =====================================================================
   ZONE REAL ESTATE — liquid motion engine
   ---------------------------------------------------------------------
   Three jobs, all obeying the same rule: flow is DOWN and to the RIGHT.

     1. SURFACING  — content rises into focus as it enters the viewport.
     2. CHURN      — scroll velocity feeds the --churn variable, so the
                     wave dividers get choppier the faster you scroll.
     3. MENISCUS   — the gauge on the right fills as you scroll, and its
                     surface overshoots and wobbles when you stop, the
                     way liquid in a tube actually behaves.

   You should not need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* ===================================================================
     1. SURFACING
     =================================================================== */
  var observer = null;

  function initSurfacing() {
    if (!("IntersectionObserver" in window)) {
      // No support: show everything immediately rather than hiding it.
      var all = document.querySelectorAll(".surface");
      for (var i = 0; i < all.length; i++) all[i].classList.add("is-surfaced");
      return;
    }

    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-surfaced");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observeAll();
  }

  function observeAll() {
    if (!observer) return;
    var items = document.querySelectorAll(".surface:not(.is-surfaced)");
    for (var i = 0; i < items.length; i++) observer.observe(items[i]);
  }

  /* ===================================================================
     2 & 3. CHURN + MENISCUS
     Both are driven by the same scroll loop, so they stay in sync.
     =================================================================== */
  var lastY = window.pageYOffset;
  var velocity = 0;        // smoothed scroll speed
  var churn = 0;           // what we write to CSS, eased toward velocity

  // Meniscus is a little spring: it overshoots the fill level, then settles.
  var level = 0;           // true scroll progress, 0..1
  var surface = 0;         // where the meniscus actually sits
  var surfaceVel = 0;

  var fillEl, readoutEl, pathEl, wakeEl;
  var wobblePhase = 0;

  function initScrollMotion() {
    fillEl = document.getElementById("gaugeFill");
    readoutEl = document.getElementById("gaugeReadout");
    pathEl = document.getElementById("meniscusPath");

    if (reduced) {
      // Static gauge, no spring, no churn.
      window.addEventListener("scroll", function () {
        var p = progress();
        if (fillEl) fillEl.style.height = (p * 100).toFixed(1) + "%";
        if (readoutEl) readoutEl.textContent = pad(Math.round(p * 100));
      }, { passive: true });
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    requestAnimationFrame(tick);
  }

  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, window.pageYOffset / max));
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function onScroll() {
    var y = window.pageYOffset;
    var delta = Math.abs(y - lastY);
    lastY = y;
    // Cap so a flick of the wheel doesn't send the waves off the scale.
    velocity = Math.min(1, velocity + delta / 190);
  }

  function tick() {
    // --- churn: rises fast with scrolling, drains slowly when you stop
    velocity *= 0.90;
    churn += (velocity - churn) * 0.16;
    root.style.setProperty("--churn", churn.toFixed(3));

    // --- meniscus: critically-ish damped spring toward the true level
    level = progress();
    var force = (level - surface) * 0.14;   // pull toward true level
    surfaceVel = (surfaceVel + force) * 0.82; // damping
    surface += surfaceVel;

    if (fillEl) {
      fillEl.style.height = (Math.max(0, Math.min(1, surface)) * 100).toFixed(2) + "%";
    }
    if (readoutEl) {
      readoutEl.textContent = pad(Math.round(level * 100));
    }

    // --- surface wobble: amplitude tracks how fast the level is moving,
    //     so the meniscus ripples when you scroll and flattens when you stop
    if (pathEl) {
      wobblePhase += 0.09;
      var amp = Math.min(4.2, Math.abs(surfaceVel) * 260 + churn * 2.2);
      var a = 6 - Math.sin(wobblePhase) * amp;
      var b = 6 + Math.sin(wobblePhase + 1.9) * amp;
      pathEl.setAttribute(
        "d",
        "M0 6 q10 " + (a - 6 - 4).toFixed(2) + " 20 " + (b - 6).toFixed(2) +
        " t20 0 V12 H0 Z"
      );
    }

    requestAnimationFrame(tick);
  }

  /* ===================================================================
     Pointer wake — desktop only. A warm smear trailing the cursor,
     lagging behind it the way something suspended in liquid would.
     =================================================================== */
  function initWake() {
    if (reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    wakeEl = document.getElementById("wake");
    if (!wakeEl) return;

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty;

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      wakeEl.classList.add("is-live");
    }, { passive: true });

    (function follow() {
      // Low lerp factor = heavy lag = feels viscous, not snappy.
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      wakeEl.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      requestAnimationFrame(follow);
    })();
  }

  /* =================================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    initSurfacing();
    initScrollMotion();
    initWake();
  });

  // Lets script.js re-register cards after a filter change.
  window.ZoneLiquid = { observe: observeAll };
})();
