"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationFrame, useMotionValue } from "motion/react";
import "./GradientText.css";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  style?: React.CSSProperties;
}

export default function GradientText({
  children,
  className = "",
  colors = ["#D4AF37", "#f0d060", "#9C4A5A", "#D4AF37"],
  animationSpeed = 4,
  showBorder = false,
  style,
}: GradientTextProps) {
  const gradientRef = useRef<HTMLSpanElement>(null);
  const pos = useMotionValue(0);

  useAnimationFrame((t) => {
    const cycle = (t * animationSpeed * 0.001) % 1;
    pos.set(cycle * 100);
  });

  useEffect(() => {
    const el = gradientRef.current;
    if (!el) return;
    const unsub = pos.on("change", (v) => {
      const stops = colors
        .map((c, i) => {
          const base = (i / (colors.length - 1)) * 100;
          return `${c} ${base}%`;
        })
        .join(", ");
      const offset = v;
      el.style.backgroundImage = `linear-gradient(90deg, ${stops})`;
      el.style.backgroundSize = `${colors.length * 100}%`;
      el.style.backgroundPositionX = `${-offset * (colors.length - 1)}%`;
    });
    return unsub;
  }, [colors, pos]);

  return (
    <span
      className={`animated-gradient-text${showBorder ? " with-border" : ""}${className ? " " + className : ""}`}
      style={style}
    >
      {showBorder && <span className="gradient-overlay" />}
      <span ref={gradientRef} className="text-content">
        {children}
      </span>
    </span>
  );
}
