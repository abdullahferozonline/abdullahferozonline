/**
 * main.js
 * Boots the page: loading screen, WebGL support check + scene wiring,
 * custom cursor, mobile nav, and hookup between scroll progress and the
 * Three.js scenes. Runs after three-scene.js, scroll.js and animations.js.
 */
(function () {
  "use strict";

  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  /* ------------------------------------------------------------------ */
  /* Loader                                                              */
  /* ------------------------------------------------------------------ */
  function runLoader(onDone) {
    const loader = document.getElementById("loader");
    const percentEl = document.getElementById("loaderPercent");
    const fillEl = document.getElementById("loaderFill");

    if (!loader) {
      onDone();
      return;
    }

    const counter = { value: 0 };
    const tl = window.gsap ? gsap.timeline() : null;

    function finish() {
      loader.style.transition = "opacity 0.6s ease, visibility 0.6s ease";
      loader.style.opacity = "0";
      loader.style.visibility = "hidden";
      document.body.classList.add("is-loaded");
      setTimeout(onDone, 500);
    }

    if (tl) {
      tl.to(counter, {
        value: 100,
        duration: 1.4,
        ease: "power2.inOut",
        onUpdate: () => {
          const v = Math.round(counter.value);
          if (percentEl) percentEl.textContent = String(v).padStart(2, "0");
          if (fillEl) fillEl.style.width = v + "%";
        },
        onComplete: finish,
      });
    } else {
      // Fallback if GSAP failed to load from CDN.
      setTimeout(finish, 800);
    }
  }

  /* ------------------------------------------------------------------ */
  /* WebGL scenes                                                        */
  /* ------------------------------------------------------------------ */
  function setupScenes() {
    const webgl = window.Nova && window.Nova.webgl;
    const heroFallback = document.getElementById("heroFallback");

    if (!webgl || !webgl.isSupported()) {
      // Graceful fallback: hide canvases, show static glow, keep content.
      document.querySelectorAll("canvas[id^='webgl-canvas']").forEach((c) => {
        c.hidden = true;
      });
      if (heroFallback) heroFallback.hidden = false;
      return;
    }

    const heroCanvas = document.getElementById("webgl-canvas");
    const interactiveCanvas = document.getElementById("webgl-canvas-interactive");
    const ctaCanvas = document.getElementById("webgl-canvas-cta");

    const heroScene = webgl.createScene(heroCanvas, "hero");
    const interactiveScene = webgl.createScene(interactiveCanvas, "interactive");
    const ctaScene = webgl.createScene(ctaCanvas, "cta");

    const scenes = [heroScene, interactiveScene, ctaScene].filter(Boolean);

    // Only render scenes that are actually on screen.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const scene = sceneForCanvas(entry.target);
          if (!scene) return;
          if (entry.isIntersecting) scene.resume();
          else scene.pause();
        });
      },
      { threshold: 0.05 }
    );

    function sceneForCanvas(canvas) {
      if (canvas === heroCanvas) return heroScene;
      if (canvas === interactiveCanvas) return interactiveScene;
      if (canvas === ctaCanvas) return ctaScene;
      return null;
    }

    [heroCanvas, interactiveCanvas, ctaCanvas].forEach((c) => {
      if (c) io.observe(c);
    });

    // Pointer -> normalized -1..1, forwarded to all scenes.
    if (!isTouch) {
      window.addEventListener("pointermove", (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        scenes.forEach((s) => s.setPointer(x, y));
      });
    }

    // Scroll progress per section, driving camera/object motion.
    if (window.gsap && window.ScrollTrigger) {
      if (heroScene) {
        ScrollTrigger.create({
          trigger: "#top",
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          onUpdate: (self) => heroScene.setProgress(self.progress),
        });
      }
      if (interactiveScene) {
        ScrollTrigger.create({
          trigger: "#interactive",
          start: "top bottom",
          end: "bottom top",
          scrub: 0.5,
          onUpdate: (self) => interactiveScene.setProgress(self.progress),
        });
      }
      if (ctaScene) {
        ScrollTrigger.create({
          trigger: "#contact",
          start: "top bottom",
          end: "center center",
          scrub: 0.5,
          onUpdate: (self) => ctaScene.setProgress(self.progress),
        });
      }
    }

    window.addEventListener("resize", () => {
      scenes.forEach((s) => s.resize());
    });
  }

  /* ------------------------------------------------------------------ */
  /* Custom cursor                                                       */
  /* ------------------------------------------------------------------ */
  function setupCursor() {
    if (isTouch) return;

    const cursor = document.getElementById("cursor");
    const label = document.getElementById("cursorLabel");
    if (!cursor) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let renderedX = x;
    let renderedY = y;

    window.addEventListener("pointermove", (e) => {
      x = e.clientX;
      y = e.clientY;
    });

    function raf() {
      renderedX += (x - renderedX) * 0.18;
      renderedY += (y - renderedY) * 0.18;
      cursor.style.transform = `translate(${renderedX}px, ${renderedY}px)`;
      requestAnimationFrame(raf);
    }
    raf();

    document.querySelectorAll("[data-cursor], a, button").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.classList.add("is-active");
        if (label) label.textContent = el.dataset.cursor || "";
      });
      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("is-active");
        if (label) label.textContent = "";
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile navigation                                                   */
  /* ------------------------------------------------------------------ */
  function setupNav() {
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("mobileMenu");
    if (!toggle || !menu) return;

    function close() {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });

    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  }

  /* ------------------------------------------------------------------ */
  /* Boot sequence                                                       */
  /* ------------------------------------------------------------------ */
  function boot() {
    setupCursor();
    setupNav();

    // Registers the ScrollTrigger plugin — must run before anything below
    // that calls ScrollTrigger.create().
    if (window.Nova && window.Nova.scroll) window.Nova.scroll.init();

    setupScenes();

    if (window.Nova && window.Nova.animations) window.Nova.animations.init();

    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  document.addEventListener("DOMContentLoaded", () => {
    runLoader(boot);
  });
})();
