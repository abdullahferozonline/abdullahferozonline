/**
 * animations.js
 * All DOM (non-WebGL) animation lives here: text reveals, fades, stagger,
 * card tilt, the horizontal showcase, and the process timeline.
 *
 * Exposes: window.Nova.animations.init()
 */
(function () {
  "use strict";

  window.Nova = window.Nova || {};

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  function splitLines(el) {
    // Wrap the existing text of each <span class="line"> child in an inner
    // span so we can animate a translateY reveal without a layout library.
    const lines = el.querySelectorAll(".line, .stagger-line");
    lines.forEach((line) => {
      const text = line.textContent;
      line.textContent = "";
      const inner = document.createElement("span");
      inner.textContent = text;
      inner.style.display = "block";
      inner.style.transform = "translateY(110%)";
      line.appendChild(inner);
    });
    return lines;
  }

  function heroIntro() {
    const headline = document.querySelector(".hero__headline");
    if (!headline) return;
    const lines = splitLines(headline);

    const tl = gsap.timeline({ delay: 0.2 });
    tl.to(
      [...lines].map((l) => l.firstChild),
      {
        y: "0%",
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.09,
      }
    )
      .fromTo(
        ".hero__sub",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        "-=0.5"
      )
      .fromTo(
        ".hero__actions",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        "-=0.6"
      )
      .fromTo(
        ".scroll-indicator",
        { opacity: 0 },
        { opacity: 1, duration: 0.8 },
        "-=0.4"
      );
  }

  function fadeReveals() {
    document.querySelectorAll(".reveal-fade").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        }
      );
    });
  }

  function textReveals() {
    document.querySelectorAll(".reveal-text").forEach((el) => {
      if (el.classList.contains("hero__headline")) return;
      const lines = splitLines(el);
      ScrollTrigger.create({
        trigger: el,
        start: "top 80%",
        onEnter: () =>
          gsap.to(
            [...lines].map((l) => l.firstChild),
            { y: "0%", duration: 1, ease: "power4.out", stagger: 0.08 }
          ),
      });
    });
  }

  function aboutStagger() {
    const heading = document.querySelector(".about__heading");
    if (!heading) return;
    const lines = splitLines(heading);
    ScrollTrigger.create({
      trigger: heading,
      start: "top 78%",
      onEnter: () =>
        gsap.to(
          [...lines].map((l) => l.firstChild),
          { y: "0%", duration: 0.9, ease: "power4.out", stagger: 0.07 }
        ),
    });
  }

  function cardTilt() {
    if (isMobile || prefersReducedMotion) return;
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      let bounds;

      card.addEventListener("mouseenter", () => {
        bounds = card.getBoundingClientRect();
      });

      card.addEventListener("mousemove", (e) => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const px = (e.clientX - bounds.left) / bounds.width - 0.5;
        const py = (e.clientY - bounds.top) / bounds.height - 0.5;
        gsap.to(card, {
          rotateX: py * -8,
          rotateY: px * 10,
          translateY: -4,
          duration: 0.4,
          ease: "power2.out",
          transformPerspective: 700,
        });
      });

      card.addEventListener("mouseleave", () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          translateY: 0,
          duration: 0.6,
          ease: "power3.out",
        });
      });
    });
  }

  function showcaseHorizontal() {
    const track = document.getElementById("showcaseTrack");
    const wrap = track ? track.closest(".showcase__track-wrap") : null;
    if (!track || !wrap) return;

    function build() {
      const distance = track.scrollWidth - wrap.clientWidth;
      if (distance <= 0) return null;

      return gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: ".showcase",
          start: "top top",
          end: () => `+=${distance + window.innerHeight}`,
          scrub: 1,
          pin: true,
          invalidateOnRefresh: true,
        },
      });
    }

    let tween = build();
    window.addEventListener("resize", () => {
      if (tween) tween.scrollTrigger.kill();
      gsap.set(track, { x: 0 });
      tween = build();
    });
  }

  function processTimeline() {
    const fill = document.getElementById("timelineFill");
    const section = document.getElementById("process");
    if (!fill || !section) return;

    gsap.to(fill, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
        end: "bottom 60%",
        scrub: 0.6,
      },
    });

    gsap.utils.toArray(".timeline__stage").forEach((stage, i) => {
      gsap.fromTo(
        stage,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: stage,
            start: "top 88%",
          },
          delay: i * 0.05,
        }
      );
    });
  }

  function navAppearance() {
    const nav = document.getElementById("siteNav");
    if (!nav) return;
    ScrollTrigger.create({
      start: 40,
      end: 99999,
      onUpdate: (self) => {
        nav.classList.toggle("is-scrolled", self.scroll() > 40);
      },
    });
  }

  function init() {
    if (typeof gsap === "undefined") return;

    heroIntro();

    if (typeof ScrollTrigger === "undefined") return;

    fadeReveals();
    textReveals();
    aboutStagger();
    cardTilt();
    showcaseHorizontal();
    processTimeline();
    navAppearance();
  }

  window.Nova.animations = { init };
})();
