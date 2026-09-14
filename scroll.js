/**
 * scroll.js
 * Sets up Lenis smooth scrolling and keeps it in sync with GSAP's
 * ScrollTrigger so scrubbed animations track the smoothed scroll position
 * rather than the raw (jumpy) native scroll.
 *
 * Exposes: window.Nova.scroll = { lenis, refresh() }
 */
(function () {
  "use strict";

  window.Nova = window.Nova || {};

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let lenis = null;

  function init() {
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    if (typeof Lenis !== "undefined" && !prefersReducedMotion) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
        touchMultiplier: 1.1,
      });

      lenis.on("scroll", () => {
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.update();
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      // Let GSAP's ticker drive Lenis for tighter sync with ScrollTrigger.
      if (typeof gsap !== "undefined") {
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }
    }

    // Pause smooth scroll + heavy effects when tab isn't visible.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (lenis) lenis.stop();
        if (window.Nova.webgl) window.Nova.webgl.pauseAll();
      } else {
        if (lenis) lenis.start();
        if (window.Nova.webgl) window.Nova.webgl.resumeAll();
      }
    });
  }

  function refresh() {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }

  function getScroll() {
    if (lenis) return lenis.scroll;
    return window.scrollY;
  }

  window.Nova.scroll = { init, refresh, getScroll, get lenis() { return lenis; } };
})();
