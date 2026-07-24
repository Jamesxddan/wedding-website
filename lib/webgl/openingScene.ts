import * as THREE from "three";

export interface OpeningSceneOptions {
  bokehUrl?: string;
  ringsUrl?: string;
}

// ── Shaders ────────────────────────────────────────────────────────────────

const vertBackground = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragBackground = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform vec2 uOffset;
  uniform float uBlurStep;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv + uOffset;
    vec4 sum = vec4(0.0);
    // 5x5 box blur — 25 samples vs 81, still dissolves texture into soft colour wash
    for (float x = -2.0; x <= 2.0; x += 1.0) {
      for (float y = -2.0; y <= 2.0; y += 1.0) {
        sum += texture2D(uTexture, uv + vec2(x, y) * uBlurStep);
      }
    }
    gl_FragColor = vec4((sum / 25.0).rgb, uOpacity);
  }
`;

const vertParticle = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vEdgeFade;

  void main() {
    vColor = aColor;
    float dist = length(position.xy) / 7.0;
    vEdgeFade = clamp(1.0 - dist * dist, 0.1, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragParticle = /* glsl */ `
  varying vec3 vColor;
  varying float vEdgeFade;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float d = length(coord);
    if (d > 0.5) discard;
    float alpha = (1.0 - smoothstep(0.3, 0.5, d)) * vEdgeFade * 0.82;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// ── Main ───────────────────────────────────────────────────────────────────

export function createOpeningScene(
  canvas: HTMLCanvasElement,
  options: OpeningSceneOptions
): { destroy: () => void } {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1); // decorative scene — pixel-perfect not needed, saves 4× GPU on HiDPI
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 5;

  // ── Particles ──────────────────────────────────────────────────────────

  const COUNT = 550;
  const posArr = new Float32Array(COUNT * 3);
  const sizeArr = new Float32Array(COUNT);
  const colorArr = new Float32Array(COUNT * 3);

  const basePos: { x: number; y: number; z: number }[] = [];
  const velArr = new Float32Array(COUNT * 3); // packed vx,vy,vz

  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 12;
    const y = (Math.random() - 0.5) * 12;
    const z = (Math.random() - 0.5) * 2;

    posArr[i * 3] = x;
    posArr[i * 3 + 1] = y;
    posArr[i * 3 + 2] = z;
    basePos.push({ x, y, z });

    const isGold = Math.random() < 0.55;
    sizeArr[i] = isGold ? 1.5 + Math.random() * 3.5 : 4.0 + Math.random() * 8.0;

    if (isGold) {
      colorArr[i * 3] = 0.831; colorArr[i * 3 + 1] = 0.686; colorArr[i * 3 + 2] = 0.216;
    } else {
      colorArr[i * 3] = 0.957; colorArr[i * 3 + 1] = 0.757; colorArr[i * 3 + 2] = 0.757;
    }
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
  particleGeo.setAttribute("aSize",    new THREE.BufferAttribute(sizeArr, 1));
  particleGeo.setAttribute("aColor",   new THREE.BufferAttribute(colorArr, 3));

  const particleMat = new THREE.ShaderMaterial({
    vertexShader: vertParticle,
    fragmentShader: fragParticle,
    transparent: true,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ── Background planes ──────────────────────────────────────────────────

  interface BgUniforms {
    [uniform: string]: THREE.IUniform;
    uTexture: { value: THREE.Texture | null };
    uOpacity: { value: number };
    uOffset:  { value: THREE.Vector2 };
    uBlurStep:{ value: number };
  }

  const bokehUniforms: BgUniforms = {
    uTexture:  { value: null },
    uOpacity:  { value: 0.28 },
    uOffset:   { value: new THREE.Vector2() },
    uBlurStep: { value: 0.062 }, // wider step compensates for 5×5 vs 9×9 → same blur radius
  };
  const ringsUniforms: BgUniforms = {
    uTexture:  { value: null },
    uOpacity:  { value: 0.11 },
    uOffset:   { value: new THREE.Vector2() },
    uBlurStep: { value: 0.088 }, // heavy — just warm tones, no shape
  };

  let bokehPlane: THREE.Mesh | null = null;
  let ringsPlane: THREE.Mesh | null = null;

  function planeSize(z: number) {
    const dist = camera.position.z - z;
    const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
    return { w: h * camera.aspect, h };
  }

  function updatePlaneSizes() {
    if (bokehPlane) { const s = planeSize(-4); bokehPlane.scale.set(s.w, s.h, 1); }
    if (ringsPlane) { const s = planeSize(-3); ringsPlane.scale.set(s.w, s.h, 1); }
  }

  function makeBgPlane(uniforms: BgUniforms, z: number): THREE.Mesh {
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertBackground,
      fragmentShader: fragBackground,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.position.z = z;
    return mesh;
  }

  const loader = new THREE.TextureLoader();

  if (options.bokehUrl) {
    loader.load(options.bokehUrl, (tex) => {
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      bokehUniforms.uTexture.value = tex;
      bokehPlane = makeBgPlane(bokehUniforms, -4);
      scene.add(bokehPlane);
      updatePlaneSizes();
    });
  }

  if (options.ringsUrl) {
    loader.load(options.ringsUrl, (tex) => {
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      ringsUniforms.uTexture.value = tex;
      ringsPlane = makeBgPlane(ringsUniforms, -3);
      scene.add(ringsPlane);
      updatePlaneSizes();
    });
  }

  // ── Mouse / touch ──────────────────────────────────────────────────────

  const mouse = new THREE.Vector2();
  const mouseTarget = new THREE.Vector2();

  const onMouseMove = (e: MouseEvent) => {
    mouseTarget.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    mouseTarget.x =  (t.clientX / window.innerWidth)  * 2 - 1;
    mouseTarget.y = -((t.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("touchmove", onTouch, { passive: true });

  // ── Resize ─────────────────────────────────────────────────────────────

  const onResize = () => {
    const w = canvas.clientWidth || canvas.offsetWidth;
    const h = canvas.clientHeight || canvas.offsetHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updatePlaneSizes();
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  onResize();

  // ── Animation loop ──────────────────────────────────────────────────────

  let animId = 0;
  let lastFrameTime = 0;
  const FRAME_MS = 1000 / 30; // 30fps cap — decorative background doesn't need 60fps
  const _mouseWorld = new THREE.Vector3();

  function tick(now: number) {
    animId = requestAnimationFrame(tick);
    if (now - lastFrameTime < FRAME_MS) return;
    lastFrameTime = now;

    mouse.x += (mouseTarget.x - mouse.x) * 0.06;
    mouse.y += (mouseTarget.y - mouse.y) * 0.06;

    // Project mouse to Z=0 world plane
    _mouseWorld.set(mouse.x, mouse.y, 0.5).unproject(camera);
    const mwx = _mouseWorld.x;
    const mwy = _mouseWorld.y;

    // Update particle physics
    for (let i = 0; i < COUNT; i++) {
      const pi = i * 3;
      const px = posArr[pi], py = posArr[pi + 1];

      // Spring to base (gentle, dreamy)
      velArr[pi]     += (basePos[i].x - px) * 0.0005;
      velArr[pi + 1] += (basePos[i].y - py) * 0.0005;

      // Mouse repulsion
      const dx = px - mwx, dy = py - mwy;
      const distSq = dx * dx + dy * dy;
      if (distSq < 4.0) {
        const dist = Math.sqrt(distSq) + 0.001;
        const force = 0.018 / (dist + 0.1);
        velArr[pi]     += (dx / dist) * force;
        velArr[pi + 1] += (dy / dist) * force;
      }

      // Damping
      velArr[pi]     *= 0.94;
      velArr[pi + 1] *= 0.94;

      posArr[pi]     += velArr[pi];
      posArr[pi + 1] += velArr[pi + 1];

      // Y wrap
      if (posArr[pi + 1] < -7) {
        posArr[pi]     = (Math.random() - 0.5) * 12;
        posArr[pi + 1] = 7;
        velArr[pi] = velArr[pi + 1] = 0;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Camera parallax
    camera.position.x += (mouse.x * 0.35 - camera.position.x) * 0.04;
    camera.position.y += (mouse.y * 0.35 - camera.position.y) * 0.04;

    // Background UV parallax
    bokehUniforms.uOffset.value.set(-mouse.x * 0.015, -mouse.y * 0.015);
    ringsUniforms.uOffset.value.set(-mouse.x * 0.025, -mouse.y * 0.025);

    renderer.render(scene, camera);
  }

  animId = requestAnimationFrame(tick);

  // ── Cleanup ────────────────────────────────────────────────────────────

  return {
    destroy: () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouch);

      particleGeo.dispose();
      particleMat.dispose();

      if (bokehPlane) {
        (bokehPlane.material as THREE.ShaderMaterial).dispose();
        bokehPlane.geometry.dispose();
        bokehUniforms.uTexture.value?.dispose();
      }
      if (ringsPlane) {
        (ringsPlane.material as THREE.ShaderMaterial).dispose();
        ringsPlane.geometry.dispose();
        ringsUniforms.uTexture.value?.dispose();
      }

      renderer.dispose();
    },
  };
}
