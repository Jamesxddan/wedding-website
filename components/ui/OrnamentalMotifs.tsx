"use client";

import { motion } from "motion/react";
import { useEffect } from "react";

/** Shared gold-frame decorative language — used by Wall of Love, Wedding Day, and Post-Wedding. */
export const GOLD_GRADIENT = "linear-gradient(135deg, #c8a86a, #a88848)";

export function DamaskDivider({ color = "139,74,107" }: { color?: string }) {
  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <span className="h-px flex-1 max-w-[80px]" style={{ background: `linear-gradient(90deg, transparent, rgba(${color},0.25))` }} />
      <span className="text-lg" style={{ color: `rgba(${color},0.35)` }} aria-hidden>✧</span>
      <span className="h-px flex-1 max-w-[80px]" style={{ background: `linear-gradient(90deg, rgba(${color},0.25), transparent)` }} />
    </div>
  );
}

/** Faint repeating damask motif — absolutely positioned, sits behind section content. */
export function DamaskOverlay({ opacity = 0.04, color = "8B4A6B" }: { opacity?: number; color?: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute", inset: 0, opacity, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 15 Q70 35 60 55 Q50 35 60 15z M60 55 Q70 75 60 95 Q50 75 60 55z M15 60 Q35 70 55 60 Q35 50 15 60z M55 60 Q75 70 95 60 Q75 50 55 60z' fill='%23${color}'/%3E%3C/svg%3E")`,
        backgroundSize: "160px 160px",
      }}
    />
  );
}

export function ConfettiBurst({ active, onDone }: { active: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [active, onDone]);

  if (!active) return null;

  const colours = ["#ffd700", "#ff6b6b", "#ff9ec4", "#4dd0b0", "#80d4ff", "#ffb347", "#c084fc", "#f472b6"];
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    dur: 0.8 + Math.random() * 0.6,
    colour: colours[i % colours.length],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.colour,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `confettiFall ${p.dur}s ease-out ${p.delay}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
            opacity: 1,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/** Scroll-triggered floral SVG that draws its path as the user scrolls past. */
export function ScrollFloralDivider({
  color = "#D4AF37",
  width = 240,
  height = 48,
  className = "",
}: {
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  // A continuous ornamental wave path that animates from left to right
  const pathId = "floral-path";

  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <motion.path
          id={pathId}
          d={[
            `M 0 ${height / 2}`,
            `C ${width * 0.12} ${height * 0.15}, ${width * 0.22} ${height * 0.8}, ${width * 0.3} ${height * 0.5}`,
            `S ${width * 0.5} ${height * 0.2}, ${width * 0.5} ${height * 0.5}`,
            `S ${width * 0.65} ${height * 0.15}, ${width * 0.7} ${height / 2}`,
            `S ${width * 0.82} ${height * 0.2}, ${width * 0.88} ${height * 0.5}`,
            `Q ${width * 0.94} ${height * 0.65}, ${width} ${height * 0.4}`,
          ].join(" ")}
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          fill="transparent"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Decorative diamond nodes along the wave */}
        {[0.18, 0.3, 0.5, 0.7, 0.88].map((x, i) => (
          <motion.circle
            key={i}
            cx={x * width}
            cy={height * 0.5 - (i % 2 === 0 ? 2 : -2)}
            r={2.5}
            fill={color}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 0.6 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.6 + i * 0.12, duration: 0.5 }}
          />
        ))}
      </svg>
    </div>
  );
}
export function OrnamentalFrame({
  children,
  gradient = GOLD_GRADIENT,
  hangingRing = false,
  padding = 5,
  innerBg = "#faf5ec",
  style,
}: {
  children: React.ReactNode;
  gradient?: string;
  hangingRing?: boolean;
  padding?: number;
  innerBg?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        padding, borderRadius: 6,
        background: gradient,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
        position: "relative",
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 2, borderRadius: 4, pointerEvents: "none",
          background: "linear-gradient(135deg, transparent 30%, rgba(255,215,0,0.04) 40%, transparent 50%, rgba(255,215,0,0.03) 60%, transparent 70%)",
        }}
      />
      {hangingRing && (
        <>
          <div style={{
            position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
            width: 12, height: 12, borderRadius: "50%",
            border: "2px solid #8a7a5a", background: "transparent",
            boxShadow: "0 0 4px rgba(0,0,0,0.2)", zIndex: 2,
          }} />
          <div style={{
            position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
            width: 1, height: 10, background: "rgba(138,122,90,0.2)", zIndex: 1,
          }} />
        </>
      )}
      <div style={{ background: innerBg, borderRadius: 4, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}
