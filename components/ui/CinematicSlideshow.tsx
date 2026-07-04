"use client";

import { useEffect, useState, useRef } from "react";
import type { DrivePhoto } from "@/lib/drive";

interface Props {
  photos: DrivePhoto[];
  parallaxX: number; // -1 to 1
  parallaxY: number;
}

const KB_ANIMATIONS = [
  "kb-zoom-in-left",
  "kb-zoom-in-right",
  "kb-zoom-out-left",
  "kb-zoom-out-right",
  "kb-drift-left",
  "kb-drift-right",
];

const SLIDE_DURATION = 9000; // ms per photo
const FADE_DURATION = 2500;  // ms crossfade

export default function CinematicSlideshow({ photos, parallaxX, parallaxY }: Props) {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [fading, setFading] = useState(false);
  const [kbAnim, setKbAnim] = useState(KB_ANIMATIONS[0]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const list = photos.length > 0 ? photos : null;

  useEffect(() => {
    if (!list || list.length < 2) return;

    function advance() {
      setFading(true);
      timerRef.current = setTimeout(() => {
        setCurrent((c) => {
          const nextIdx = (c + 1) % list!.length;
          setNext((nextIdx + 1) % list!.length);
          setKbAnim(KB_ANIMATIONS[nextIdx % KB_ANIMATIONS.length]);
          return nextIdx;
        });
        setFading(false);
      }, FADE_DURATION);
    }

    const id = setInterval(advance, SLIDE_DURATION);
    return () => {
      clearInterval(id);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [list]);

  const photoTransform = (depthRatio: number) =>
    `translate(${parallaxX * depthRatio}px, ${parallaxY * depthRatio}px) scale(1.12)`;

  if (!list) {
    // Gradient fallback
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-[-15%]"
          style={{
            background: "linear-gradient(135deg, #1a0a14 0%, #2d1220 30%, #0f1a12 60%, #1a1208 100%)",
            transform: `translate(${parallaxX}px, ${parallaxY}px)`,
            transition: "transform 0.15s ease-out",
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Current slide */}
      <div
        className="absolute inset-0"
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        {/* Blurred background fill */}
        <img
          src={list[current].heroUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center scale-110"
          style={{ filter: "blur(24px) saturate(0.7) brightness(0.5)" }}
          draggable={false}
        />
        {/* Full unclipped photo */}
        <img
          src={list[current].heroUrl}
          alt=""
          aria-hidden="true"
          className={`relative z-10 w-full h-full object-contain object-center cinematic-kb ${kbAnim}`}
          style={{ filter: "saturate(1.1) contrast(1.03)" }}
          draggable={false}
        />
      </div>

      {/* Next slide (pre-loaded, underneath) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: fading ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <img
          src={list[next].heroUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center scale-110"
          style={{ filter: "blur(24px) saturate(0.7) brightness(0.5)" }}
          draggable={false}
        />
        <img
          src={list[next].heroUrl}
          alt=""
          aria-hidden="true"
          className="relative z-10 w-full h-full object-contain object-center"
          draggable={false}
        />
      </div>

      {/* Cinematic dark overlay — vignette + tint */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, rgba(5,2,10,0.25) 0%, rgba(5,2,10,0.62) 100%),
            linear-gradient(to bottom, rgba(5,2,10,0.3) 0%, rgba(5,2,10,0.05) 40%, rgba(5,2,10,0.05) 60%, rgba(5,2,10,0.55) 100%)
          `,
          zIndex: 1,
        }}
      />

      {/* Gradient bleed into cream at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: "linear-gradient(to bottom, transparent, rgba(253,246,236,0.85))",
          zIndex: 2,
        }}
      />
    </div>
  );
}
