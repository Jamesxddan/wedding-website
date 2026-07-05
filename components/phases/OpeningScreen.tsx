"use client";

import { useEffect, useRef } from "react";
import FirstVisitForm from "./FirstVisitForm";
import GradientText from "@/components/ui/GradientText";

interface Props {
  onComplete: (name: string) => void;
}

function useParticles(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    type Particle = {
      x: number; y: number;
      vx: number; vy: number; drift: number;
      angle: number; spin: number;
      size: number; opacity: number;
      life: number; decay: number; isGold: boolean;
    };

    const particles: Particle[] = [];
    let lastSpawn = 0;
    let animId = 0;

    function spawn(): Particle {
      const isGold = Math.random() > 0.45;
      return {
        x: Math.random() * canvas!.width,
        y: -8,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.5 + Math.random() * 1.0,
        drift: (Math.random() - 0.5) * 0.01,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        size: isGold ? 2 + Math.random() * 2.5 : 4 + Math.random() * 6,
        opacity: 0.4 + Math.random() * 0.5,
        life: 1, decay: 0.001 + Math.random() * 0.0008, isGold,
      };
    }

    function draw(p: Particle) {
      ctx!.save();
      ctx!.globalAlpha = p.opacity * p.life;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.angle);
      if (p.isGold) {
        const s = p.size, t = s * 0.3;
        ctx!.beginPath();
        ctx!.moveTo(0, -s); ctx!.lineTo(t, -t); ctx!.lineTo(s, 0);
        ctx!.lineTo(t, t); ctx!.lineTo(0, s); ctx!.lineTo(-t, t);
        ctx!.lineTo(-s, 0); ctx!.lineTo(-t, -t); ctx!.closePath();
        ctx!.fillStyle = `rgba(212,175,55,${p.opacity})`;
        ctx!.fill();
      } else {
        ctx!.beginPath();
        ctx!.ellipse(0, 0, p.size * 1.4, p.size * 0.6, 0, 0, Math.PI * 2);
        const g = ctx!.createRadialGradient(0, 0, 0, 0, 0, p.size * 1.4);
        g.addColorStop(0, `rgba(244,194,194,${p.opacity})`);
        g.addColorStop(1, `rgba(244,194,194,0)`);
        ctx!.fillStyle = g;
        ctx!.fill();
      }
      ctx!.restore();
    }

    function tick(ts: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      if (ts - lastSpawn > 130) {
        particles.push(spawn());
        if (Math.random() > 0.35) particles.push(spawn());
        lastSpawn = ts;
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.vx += p.drift;
        p.y += p.vy; p.angle += p.spin;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > canvas!.height + 10) particles.splice(i, 1);
        else draw(p);
      }
      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    return () => { ro.disconnect(); cancelAnimationFrame(animId); };
  }, [canvasRef]);
}

const GOLD = "#D4AF37";
const ROSE = "#5a1f2e";
const GOLD_RGBA = (a: number) => `rgba(212,175,55,${a})`;

function Divider({ delay }: { delay: string }) {
  return (
    <div
      className="flex items-center gap-2.5"
      style={{ animation: `fade-in 0.6s ease ${delay} both` }}
    >
      <div style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.6)}, transparent)` }} />
      <div style={{ width: 5, height: 5, background: GOLD, transform: "rotate(45deg)", boxShadow: `0 0 5px ${GOLD_RGBA(0.7)}` }} />
      <div style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.6)}, transparent)` }} />
    </div>
  );
}

export default function OpeningScreen({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticles(canvasRef);

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10"
      style={{
        background: [
          "radial-gradient(ellipse at 50% -10%, rgba(212,175,55,0.22) 0%, transparent 60%)",
          "radial-gradient(ellipse at 15% 85%, rgba(244,194,194,0.4) 0%, transparent 50%)",
          "radial-gradient(ellipse at 85% 75%, rgba(196,165,130,0.25) 0%, transparent 50%)",
          "linear-gradient(180deg, #fdf6ec 0%, #f5ede0 100%)",
        ].join(", "),
      }}
    >
      {/* Canvas particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 2 }}
      />

      {/* Gold border frame */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 20, border: `1px solid ${GOLD_RGBA(0.25)}`, borderRadius: 4,
          zIndex: 1, animation: "fade-in 1.2s ease 0.3s both",
        }}
      >
        <div style={{ position: "absolute", inset: 6, border: `1px solid ${GOLD_RGBA(0.12)}`, borderRadius: 2 }} />
      </div>

      {/* Corner gems */}
      {[
        { style: { top: 22, left: 22 }, delay: "0.2s" },
        { style: { top: 22, right: 22 }, delay: "0.3s" },
        { style: { bottom: 22, left: 22 }, delay: "0.4s" },
        { style: { bottom: 22, right: 22 }, delay: "0.5s" },
      ].map((g, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            ...g.style, width: 7, height: 7, background: GOLD,
            boxShadow: `0 0 8px ${GOLD_RGBA(0.5)}`,
            animation: `gem-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${g.delay} both`,
            zIndex: 3,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-0" style={{ zIndex: 4 }}>

        {/* Interlocking wedding rings — perspective (tilt) view so they read as 3D bands */}
        <div style={{ animation: "rings-drop 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.7s both", marginBottom: 22 }}>
          <svg
            width="210" height="116" viewBox="0 0 200 110"
            style={{ overflow: "visible", animation: "pulse-glow 3s ease-in-out 2s infinite" }}
          >
            <defs>
              {/* Rose gold band — polished metal has: bright highlight → warm gold → DARK mirror reflection → gold again */}
              <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#fff4ea" />
                <stop offset="10%"  stopColor="#f5c8a0" />
                <stop offset="28%"  stopColor="#e8a060" />
                <stop offset="46%"  stopColor="#2a0e04" />
                <stop offset="58%"  stopColor="#c87848" />
                <stop offset="74%"  stopColor="#f0b880" />
                <stop offset="88%"  stopColor="#e09060" />
                <stop offset="100%" stopColor="#8a3818" />
              </linearGradient>
              {/* Inner-shadow for the ring hole — dark rim makes the hole look deep */}
              <radialGradient id="hole" cx="50%" cy="40%" r="60%">
                <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
              </radialGradient>
              <filter id="ds" x="-25%" y="-25%" width="150%" height="180%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(90,60,10,0.38)" />
              </filter>
              {/* Clip left ring to its left half */}
              <clipPath id="lhalf">
                <rect x="0" y="0" width="100" height="110" />
              </clipPath>
            </defs>

            {/* Ground shadow */}
            <ellipse cx="100" cy="104" rx="64" ry="5" fill="rgba(130,90,15,0.18)" />

            {/* Right ring (behind) — perspective ellipse */}
            <g filter="url(#ds)">
              <ellipse cx="128" cy="55" rx="36" ry="22"
                fill="none" stroke="url(#band)" strokeWidth="13" />
              {/* inner rim shadow — makes hole look recessed */}
              <ellipse cx="128" cy="55" rx="29.5" ry="15.5"
                fill="none" stroke="rgba(50,30,0,0.25)" strokeWidth="1" />
              {/* outer edge highlight */}
              <ellipse cx="128" cy="55" rx="42.5" ry="28.5"
                fill="none" stroke="rgba(255,248,180,0.22)" strokeWidth="0.8" />
              {/* specular highlight arc — crisp bright spot at 12 o'clock */}
              <ellipse cx="128" cy="55" rx="36" ry="22"
                fill="none" stroke="rgba(255,252,210,0.85)" strokeWidth="4"
                strokeDasharray="48 185" strokeDashoffset="-115"
                strokeLinecap="round" />
            </g>

            {/* Left ring — clipped to left half (behind right ring) */}
            <g filter="url(#ds)" clipPath="url(#lhalf)">
              <ellipse cx="72" cy="55" rx="36" ry="22"
                fill="none" stroke="url(#band)" strokeWidth="13" />
              <ellipse cx="72" cy="55" rx="29.5" ry="15.5"
                fill="none" stroke="rgba(50,30,0,0.25)" strokeWidth="1" />
              <ellipse cx="72" cy="55" rx="42.5" ry="28.5"
                fill="none" stroke="rgba(255,248,180,0.22)" strokeWidth="0.8" />
              <ellipse cx="72" cy="55" rx="36" ry="22"
                fill="none" stroke="rgba(255,252,210,0.85)" strokeWidth="4"
                strokeDasharray="48 185" strokeDashoffset="-115"
                strokeLinecap="round" />
            </g>

            {/* Left ring front arc — the piece crossing IN FRONT of the right ring */}
            {/* Ellipse (cx=72,cy=55,rx=36,ry=22) at x=100: y ≈ 41.2 & 68.8 */}
            <path d="M 100 41.2 A 36 22 0 0 1 100 68.8"
              fill="none" stroke="url(#band)" strokeWidth="13.5" strokeLinecap="round" />
            {/* specular highlight on front arc */}
            <path d="M 100 41.2 A 36 22 0 0 1 100 53"
              fill="none" stroke="rgba(255,252,210,0.8)" strokeWidth="4" strokeLinecap="round" />
            {/* inner rim on front arc */}
            <path d="M 100 44.5 A 29.5 15.5 0 0 1 100 65.5"
              fill="none" stroke="rgba(50,30,0,0.22)" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>

        <Divider delay="1.5s" />

        {/* Together with their families */}
        <p
          className="font-body"
          style={{
            fontFamily: "Georgia, serif", fontStyle: "italic",
            fontSize: 12, letterSpacing: 2, color: `rgba(107,42,58,0.5)`,
            margin: "12px 0 10px", animation: "fade-up 0.7s ease 1.9s both",
          }}
        >
          Together with their families
        </p>

        {/* Names */}
        <div className="text-center" style={{ marginBottom: 8 }}>
          <span
            className="block"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic",
              fontSize: 52, lineHeight: 1.05, color: ROSE,
              textShadow: `0 2px 20px rgba(90,31,46,0.12)`,
              animation: "name-float 0.9s cubic-bezier(0.22,1,0.36,1) 2.4s both",
            }}
          >
            James
          </span>
          <div style={{
            height: 1.5, width: 0, margin: "3px auto 0", borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.7)}, transparent)`,
            animation: "underline-grow 0.7s ease 3.1s both",
          }} />
          <span
            className="block"
            style={{
              fontFamily: "Georgia, serif", fontStyle: "italic",
              fontSize: 22, color: GOLD, margin: "4px 0",
              textShadow: `0 0 16px ${GOLD_RGBA(0.5)}`,
            }}
          >
            &amp;
          </span>
          <span
            className="block"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic",
              fontSize: 52, lineHeight: 1.05, color: ROSE,
              textShadow: `0 2px 20px rgba(90,31,46,0.12)`,
              animation: "name-float 0.9s cubic-bezier(0.22,1,0.36,1) 2.9s both",
            }}
          >
            Sharon
          </span>
          <div style={{
            height: 1.5, width: 0, margin: "3px auto 0", borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.7)}, transparent)`,
            animation: "underline-grow 0.7s ease 3.6s both",
          }} />
        </div>

        {/* Date & venue */}
        <div
          className="text-center"
          style={{ animation: "fade-up 0.8s ease 3.7s both", marginBottom: 0 }}
        >
          <span
            className="block"
            style={{ fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "3.5px", textTransform: "uppercase", color: "#9C4A5A" }}
          >
            October 8th, 2026
          </span>
          <span
            className="block"
            style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: "rgba(107,42,58,0.5)", marginTop: 3 }}
          >
            St Andrews Kirk, Chennai
          </span>
        </div>

        <div style={{ margin: "14px 0 16px" }}>
          <Divider delay="4.2s" />
        </div>

        {/* Form card */}
        <div
          style={{
            background: "rgba(255,255,255,0.88)",
            border: `1px solid ${GOLD_RGBA(0.3)}`,
            borderRadius: 16, padding: "18px 24px", width: 280,
            boxShadow: `0 6px 40px rgba(90,31,46,0.08), 0 0 0 1px ${GOLD_RGBA(0.08)}`,
            backdropFilter: "blur(8px)",
            animation: "form-rise 1s cubic-bezier(0.22,1,0.36,1) 4.7s both",
          }}
        >
          <span
            className="block text-center"
            style={{
              fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: 3,
              textTransform: "uppercase", color: "rgba(107,42,58,0.4)",
              marginBottom: 14,
            }}
          >
            — You are invited —
          </span>
          <FirstVisitForm onComplete={onComplete} />
        </div>
      </div>
    </div>
  );
}
