"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  opacitySpeed: number;
  rotation: number;
  rotationSpeed: number;
  type: "petal" | "sparkle" | "orb";
  hue: number;
  life: number;
  maxLife: number;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createParticle(w: number, h: number, type?: "petal" | "sparkle" | "orb"): Particle {
  const t = type ?? (Math.random() < 0.6 ? "petal" : Math.random() < 0.6 ? "sparkle" : "orb");
  const maxLife = t === "petal" ? rand(220, 400) : t === "sparkle" ? rand(80, 160) : rand(300, 500);
  return {
    x: rand(0, w),
    y: t === "orb" ? h + rand(10, 40) : rand(-60, -10),
    vx: rand(-0.4, 0.4),
    vy: t === "orb" ? rand(-0.5, -1.2) : rand(0.4, 1.1),
    size: t === "petal" ? rand(10, 22) : t === "sparkle" ? rand(1.5, 4) : rand(4, 10),
    opacity: 0,
    opacitySpeed: rand(0.005, 0.015),
    rotation: rand(0, Math.PI * 2),
    rotationSpeed: rand(-0.02, 0.02),
    type: t,
    hue: t === "petal" ? rand(340, 360) : t === "sparkle" ? rand(38, 52) : 0,
    life: 0,
    maxLife,
  };
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.opacity * 0.85;
  // Soft petal shape
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(0, -p.size * 0.3, 0, 0, 0, p.size);
  grad.addColorStop(0, `hsla(${p.hue}, 80%, 92%, 1)`);
  grad.addColorStop(1, `hsla(${p.hue}, 70%, 75%, 0.3)`);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, p: Particle, t: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const pulse = 0.6 + 0.4 * Math.sin(t * 0.08 + p.x);
  ctx.globalAlpha = p.opacity * pulse;
  // 4-point star
  ctx.beginPath();
  const r = p.size;
  const r2 = r * 0.3;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const radius = i % 2 === 0 ? r : r2;
    if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = `hsla(${p.hue}, 90%, 78%, 1)`;
  ctx.fill();
  // Glow
  ctx.shadowColor = `hsla(${p.hue}, 90%, 90%, 0.8)`;
  ctx.shadowBlur = r * 3;
  ctx.fill();
  ctx.restore();
}

function drawOrb(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = p.opacity * 0.45;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
  grad.addColorStop(0, "rgba(244,194,194,0.85)");
  grad.addColorStop(0.5, "rgba(244,194,194,0.35)");
  grad.addColorStop(1, "rgba(245,220,200,0)");
  ctx.beginPath();
  ctx.arc(0, 0, p.size, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

export default function ParticleCanvas({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: mouseX, y: mouseY });

  useEffect(() => {
    mouseRef.current = { x: mouseX, y: mouseY };
  }, [mouseX, mouseY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const TARGET_COUNT = 85;
    const particles: Particle[] = Array.from({ length: TARGET_COUNT }, () =>
      createParticle(w, h)
    );
    // Spread initial y positions
    particles.forEach((p) => { p.y = rand(0, h); p.life = rand(0, p.maxLife * 0.5); p.opacity = rand(0.2, 0.7); });

    let tick = 0;
    let raf = 0;
    let paused = false;

    function onVisibility() { paused = document.hidden; }
    document.addEventListener("visibilitychange", onVisibility);

    function onResize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
    }
    window.addEventListener("resize", onResize, { passive: true });

    function loop() {
      if (paused) { raf = requestAnimationFrame(loop); return; }
      ctx!.clearRect(0, 0, w, h);
      tick++;

      // Mouse gentle wind influence (mouseRef values are already -1 to 1)
      const mx = mouseRef.current.x * 0.5; // scale to -0.5 to 0.5

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        // Fade in / fade out
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.1) p.opacity = Math.min(p.opacity + p.opacitySpeed, lifeRatio * 10 * 0.8);
        else if (lifeRatio > 0.8) p.opacity = Math.max(0, p.opacity - p.opacitySpeed * 1.5);

        // Mouse wind — petals drift slightly toward cursor horizontal
        if (p.type === "petal") p.vx += mx * 0.003;

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Respawn when dead or out of bounds
        if (p.life >= p.maxLife || p.y > h + 60 || (p.type === "orb" && p.y < -60)) {
          particles[i] = createParticle(w, h);
          continue;
        }

        if (p.type === "petal") drawPetal(ctx!, p);
        else if (p.type === "sparkle") drawSparkle(ctx!, p, tick);
        else drawOrb(ctx!, p);
      }

      // Maintain count
      while (particles.length < TARGET_COUNT) particles.push(createParticle(w, h));

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 3 }}
    />
  );
}
