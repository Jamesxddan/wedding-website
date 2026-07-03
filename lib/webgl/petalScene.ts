import {
  Application,
  Color,
  Entity,
  FILLMODE_NONE,
  RESOLUTION_AUTO,
  Script,
  Vec3,
} from "playcanvas";

const PETAL_COUNT = 60;
const COLORS = [
  new Color(0.957, 0.761, 0.761), // blush #F4C2C2
  new Color(0.961, 0.902, 0.784), // champagne #F5E6C8
  new Color(0.529, 0.659, 0.471), // sage #87A878 (rare)
];

interface Petal {
  entity: Entity;
  vx: number;
  vy: number;
  rotSpeed: number;
  resetY: number;
}

export interface PetalSceneHandle {
  destroy: () => void;
}

export function createPetalScene(canvas: HTMLCanvasElement): PetalSceneHandle {
  const app = new Application(canvas, {});
  app.setCanvasFillMode(FILLMODE_NONE);
  app.setCanvasResolution(RESOLUTION_AUTO);

  canvas.width = canvas.offsetWidth || window.innerWidth;
  canvas.height = canvas.offsetHeight || window.innerHeight;

  app.start();

  // Orthographic camera
  const camera = new Entity("camera");
  camera.addComponent("camera", {
    clearColor: new Color(0, 0, 0, 0),
    projection: 1, // PROJECTION_ORTHOGRAPHIC
    orthoHeight: 10,
  });
  camera.setLocalPosition(0, 0, 10);
  app.root.addChild(camera);

  // Aspect ratio helpers
  const aspect = () => canvas.width / Math.max(canvas.height, 1);
  const halfW = () => (camera.camera!.orthoHeight! * aspect()) / 2;
  const halfH = () => camera.camera!.orthoHeight! / 2;

  // Build petals
  const petals: Petal[] = [];
  for (let i = 0; i < PETAL_COUNT; i++) {
    const entity = new Entity(`petal_${i}`);
    entity.addComponent("render", {
      type: "plane",
      material: undefined,
    });

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const mat = entity.render!.meshInstances[0].material as import("playcanvas").StandardMaterial;
    mat.diffuse = color;
    mat.opacity = 0.4 + Math.random() * 0.4;
    mat.blendType = 2; // BLEND_NORMAL
    mat.update();

    const scale = 0.08 + Math.random() * 0.14;
    entity.setLocalScale(scale, scale * 1.6, scale);

    const hw = halfW();
    const hh = halfH();
    entity.setLocalPosition(
      (Math.random() - 0.5) * hw * 2,
      hh + Math.random() * hh * 2,
      -0.5 - Math.random() * 2
    );

    app.root.addChild(entity);

    petals.push({
      entity,
      vx: (Math.random() - 0.5) * 0.005,
      vy: -(0.004 + Math.random() * 0.006),
      rotSpeed: (Math.random() - 0.5) * 1.5,
      resetY: hh + 0.5,
    });
  }

  // Update loop
  app.on("update", (dt: number) => {
    const hh = halfH();
    const hw = halfW();
    for (const p of petals) {
      const pos = p.entity.getLocalPosition();
      const rot = p.entity.getLocalEulerAngles();

      let nx = pos.x + p.vx;
      let ny = pos.y + p.vy;
      const nz = pos.z;

      // Wrap horizontally
      if (nx < -hw - 0.5) nx = hw + 0.5;
      if (nx > hw + 0.5) nx = -hw - 0.5;

      // Reset when below screen
      if (ny < -hh - 0.5) {
        ny = p.resetY;
        nx = (Math.random() - 0.5) * hw * 2;
      }

      p.entity.setLocalPosition(nx, ny, nz);
      p.entity.setLocalEulerAngles(rot.x, rot.y + p.rotSpeed, rot.z + p.rotSpeed * 0.5);
    }
  });

  // Pause when tab hidden
  function onVisibility() {
    if (document.hidden) {
      app.timeScale = 0;
    } else {
      app.timeScale = 1;
    }
  }
  document.addEventListener("visibilitychange", onVisibility);

  // Handle resize
  function onResize() {
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    app.resizeCanvas(canvas.width, canvas.height);
  }
  window.addEventListener("resize", onResize);

  return {
    destroy() {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      app.destroy();
    },
  };
}
