import * as THREE from "three";

export interface FloatingMotifsOptions {
  /** Callback fired each frame with current scrollY offset for parallax */
  scrollY?: number;
}

export interface FloatingMotifsHandle {
  updateScroll: (y: number) => void;
  destroy: () => void;
}

const RING_COLOR = 0xd4af37; // gold
const DIAMOND_COLOR = 0xf5e6c8; // champagne
const SPARKLE_COLOR = 0xfdf6ec; // cream

export function createFloatingMotifs(
  canvas: HTMLCanvasElement,
  _options?: FloatingMotifsOptions,
): FloatingMotifsHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.z = 14;

  // ── Ring (torus wireframe) ──────────────────────────────────────────────
  const ringGeo = new THREE.TorusGeometry(2.2, 0.06, 16, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: RING_COLOR,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(-1.5, 0.5, -3);
  scene.add(ring);

  // ── Second smaller ring ──────────────────────────────────────────────────
  const ring2Geo = new THREE.TorusGeometry(1.4, 0.04, 12, 36);
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: DIAMOND_COLOR,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.position.set(2.2, -0.8, -5);
  scene.add(ring2);

  // ── Diamond shapes (octahedrons) ────────────────────────────────────────
  const diamondGeo = new THREE.OctahedronGeometry(0.35, 0);
  const diamondMat = new THREE.MeshBasicMaterial({
    color: DIAMOND_COLOR,
    wireframe: true,
    transparent: true,
    opacity: 0.2,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  diamond.position.set(-1.5, 0.5, -2.7); // centered inside ring1, slightly forward
  diamond.scale.setScalar(1.3);
  scene.add(diamond);

  const diamond2 = new THREE.Mesh(diamondGeo.clone(), diamondMat.clone());
  diamond2.position.set(-2.5, -1.5, -6);
  diamond2.scale.setScalar(0.7);
  scene.add(diamond2);

  // ── Sparkle particles ───────────────────────────────────────────────────
  const SPARKLE_COUNT = 60;
  const positions = new Float32Array(SPARKLE_COUNT * 3);
  const sizes = new Float32Array(SPARKLE_COUNT);
  const speeds = new Float32Array(SPARKLE_COUNT); // vertical drift speed
  const phases = new Float32Array(SPARKLE_COUNT);  // phase offset for twinkle

  for (let i = 0; i < SPARKLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
    sizes[i] = 2 + Math.random() * 4;
    speeds[i] = 0.002 + Math.random() * 0.006;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  sparkleGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const sparkleMat = new THREE.PointsMaterial({
    color: SPARKLE_COLOR,
    size: 0.06,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
  sparkles.position.y = 0;
  scene.add(sparkles);

  // ── Animation state ─────────────────────────────────────────────────────
  let scrollOffset = 0;
  let rafId = 0;

  function updateScroll(y: number) {
    scrollOffset = y;
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    const t = performance.now() * 0.001;

    // Ring 1: slow rotation + tilt
    ring.rotation.x = Math.sin(t * 0.15) * 0.3;
    ring.rotation.y += 0.004;
    ring.rotation.z = Math.cos(t * 0.12) * 0.15;

    // Ring 2: counter-rotation
    ring2.rotation.x = Math.cos(t * 0.1) * 0.25;
    ring2.rotation.y -= 0.005;
    ring2.rotation.z = Math.sin(t * 0.08) * 0.1;

    // Diamonds: gentle orbit + rotation
    diamond.rotation.x += 0.008;
    diamond.rotation.y += 0.01;
    diamond.position.x = 1.8 + Math.sin(t * 0.12) * 0.4;
    diamond.position.y = 1.2 + Math.cos(t * 0.14) * 0.3;

    diamond2.rotation.x -= 0.006;
    diamond2.rotation.y += 0.008;
    diamond2.position.x = -2.5 + Math.sin(t * 0.1 + 1.5) * 0.5;
    diamond2.position.y = -1.5 + Math.cos(t * 0.11 + 1) * 0.35;

    // Sparkles: drift upward, twinkle opacity
    const pos = sparkles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      pos[i * 3 + 1] += speeds[i];
      if (pos[i * 3 + 1] > 8) {
        pos[i * 3 + 1] = -8;
        pos[i * 3] = (Math.random() - 0.5) * 24;
      }
    }
    sparkles.geometry.attributes.position.needsUpdate = true;

    // Twinkle: modulate opacity based on sine of time + phase
    const twinkle = 0.15 + Math.sin(t * 0.8 + phases[0]) * 0.1;
    sparkleMat.opacity = Math.max(0.05, twinkle);

    // Parallax: shift scene based on scroll (subtle)
    const parallaxY = scrollOffset * -0.002;
    scene.position.y = parallaxY;
    ring.position.y = 0.5 + scrollOffset * -0.001;
    ring2.position.y = -0.8 + scrollOffset * -0.001;
    diamond.position.y = 1.2 + scrollOffset * -0.0005 + Math.cos(t * 0.14) * 0.3;

    renderer.render(scene, camera);
  }

  rafId = requestAnimationFrame(loop);

  // ── Resize handler ──────────────────────────────────────────────────────
  function onResize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", onResize);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  return {
    updateScroll,
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      scene.remove(ring);
      ringGeo.dispose();
      ringMat.dispose();
      scene.remove(ring2);
      ring2Geo.dispose();
      ring2Mat.dispose();
      scene.remove(diamond);
      scene.remove(diamond2);
      diamondGeo.dispose();
      diamondMat.dispose();
      sparkleGeo.dispose();
      sparkleMat.dispose();
      renderer.dispose();
    },
  };
}
