/**
 * three-scene.js
 * All Three.js / WebGL logic lives here. Nothing in this file touches
 * DOM animation or scroll wiring beyond reading a 0–1 progress value.
 *
 * Exposes: window.Nova.webgl
 *   - isSupported(): boolean
 *   - createScene(canvas, variant): { setProgress, setPointer, resize, dispose }
 *   - pauseAll() / resumeAll()
 */
(function () {
  "use strict";

  window.Nova = window.Nova || {};

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const activeScenes = [];

  /* ------------------------------------------------------------------ */
  /* WebGL support detection                                            */
  /* ------------------------------------------------------------------ */
  function isSupported() {
    if (typeof THREE === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Shared helpers                                                      */
  /* ------------------------------------------------------------------ */

  function buildParticleField(count, spread, color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: isMobile ? 0.018 : 0.014,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  function buildCentralObject(variant) {
    const detail = isMobile ? 24 : 64;

    let geometry;
    if (variant === "interactive") {
      geometry = new THREE.TorusKnotGeometry(1.05, 0.32, detail * 3, 12);
    } else if (variant === "cta") {
      geometry = new THREE.IcosahedronGeometry(1.3, isMobile ? 1 : 3);
    } else {
      geometry = new THREE.IcosahedronGeometry(1.15, isMobile ? 1 : 2);
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x5b6ef5,
      metalness: 0.65,
      roughness: 0.22,
      wireframe: variant === "hero",
      transparent: true,
      opacity: variant === "hero" ? 0.85 : 1,
      emissive: 0x0c1030,
      emissiveIntensity: 0.6,
    });

    return new THREE.Mesh(geometry, material);
  }

  /* ------------------------------------------------------------------ */
  /* Scene factory                                                       */
  /* ------------------------------------------------------------------ */

  function createScene(canvas, variant) {
    if (!canvas || !isSupported()) return null;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, variant === "interactive" ? 4.2 : 5.2);

    // Lights
    const key = new THREE.PointLight(0x5b6ef5, variant === "cta" ? 60 : 40, 20);
    key.position.set(3, 2, 4);
    const rim = new THREE.PointLight(0xd4a574, 18, 20);
    rim.position.set(-3, -1, -2);
    const ambient = new THREE.AmbientLight(0x30334a, 1.2);
    scene.add(key, rim, ambient);

    const object = buildCentralObject(variant);
    object.position.x = variant === "hero" ? 1.6 : 0;
    scene.add(object);

    const particleCount = isMobile ? 220 : variant === "cta" ? 900 : 520;
    const particles = buildParticleField(
      particleCount,
      variant === "cta" ? 9 : 7,
      variant === "hero" ? 0x8a93ff : 0x5b6ef5
    );
    scene.add(particles);

    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let progress = 0;
    let paused = false;
    let frameId = null;
    const clock = new THREE.Clock();

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    }

    function setPointer(x, y) {
      // x, y expected in range -1..1
      targetPointerX = x;
      targetPointerY = y;
    }

    function setProgress(p) {
      progress = p;
    }

    function tick() {
      if (paused) return;
      frameId = requestAnimationFrame(tick);
      const dt = clock.getDelta();

      pointerX += (targetPointerX - pointerX) * 0.04;
      pointerY += (targetPointerY - pointerY) * 0.04;

      const idleSpeed = prefersReducedMotion ? 0.05 : 0.18;

      object.rotation.y += dt * idleSpeed + pointerX * 0.01;
      object.rotation.x += dt * (idleSpeed * 0.5) + pointerY * 0.01;

      if (variant === "hero") {
        object.position.y = pointerY * -0.4;
        object.position.x = 1.6 + pointerX * 0.3 - progress * 2.4;
        camera.position.z = 5.2 - progress * 1.4;
        object.scale.setScalar(1 + progress * 0.35);
      } else if (variant === "interactive") {
        object.rotation.z += dt * 0.05;
        const scale = 1 + progress * 0.6;
        object.scale.setScalar(scale);
        camera.position.x = pointerX * 0.6;
        camera.position.y = pointerY * 0.4;
        camera.lookAt(0, 0, 0);
      } else if (variant === "cta") {
        object.rotation.y += dt * 0.12;
        const climax = progress;
        object.scale.setScalar(1 + climax * 1.1);
        particles.rotation.y += dt * 0.02;
        camera.position.z = 5.2 - climax * 1.8;
      }

      particles.rotation.y += dt * 0.01;

      renderer.render(scene, camera);
    }

    function pause() {
      paused = true;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = null;
    }

    function resume() {
      if (paused) {
        paused = false;
        clock.getDelta();
        tick();
      }
    }

    function dispose() {
      pause();
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      renderer.dispose();
    }

    resize();
    tick();

    const controller = { setProgress, setPointer, resize, dispose, pause, resume };
    activeScenes.push(controller);
    return controller;
  }

  function pauseAll() {
    activeScenes.forEach((s) => s.pause());
  }

  function resumeAll() {
    activeScenes.forEach((s) => s.resume());
  }

  window.Nova.webgl = {
    isSupported,
    createScene,
    pauseAll,
    resumeAll,
  };
})();
