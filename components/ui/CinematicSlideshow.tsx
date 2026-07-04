"use client";

import { useEffect, useState, useRef } from "react";
import type { DrivePhoto } from "@/lib/drive";

interface Props {
  photos: DrivePhoto[];
  parallaxX: number;
  parallaxY: number;
}

const SLIDE_DURATION = 7000;
const FADE_MS = 2500;

export default function CinematicSlideshow({ photos }: Props) {
  const list = photos.length > 0 ? photos : null;

  // Two slots always at FIXED DOM positions — never swapped.
  // We control opacity + zIndex independently to avoid remounts.
  const [slot0, setSlot0] = useState(0);
  const [slot1, setSlot1] = useState(1);
  const [op0, setOp0] = useState(1);   // slot 0 starts visible
  const [op1, setOp1] = useState(0);   // slot 1 starts hidden
  const [top, setTop] = useState(0);   // which slot index is on top
  const nextIdxRef = useRef(2);
  const inProgressRef = useRef(false);

  useEffect(() => {
    if (!list || list.length < 2) return;

    function advance() {
      if (inProgressRef.current) return;
      inProgressRef.current = true;

      setTop((currentTop) => {
        const hidden = currentTop === 0 ? 1 : 0;
        const nextIdx = nextIdxRef.current % list!.length;
        nextIdxRef.current += 1;

        // Load next photo into the hidden slot (opacity 0 — invisible, no flash)
        if (hidden === 0) setSlot0(nextIdx);
        else setSlot1(nextIdx);

        // Wait two frames so the img src settles, then crossfade
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (hidden === 0) {
              setOp0(1);  // hidden slot fades in
              setOp1(0);  // visible slot fades out
            } else {
              setOp1(1);
              setOp0(0);
            }

            setTimeout(() => {
              setTop(hidden);
              inProgressRef.current = false;
            }, FADE_MS);
          });
        });

        return currentTop; // don't change top yet — wait for fade
      });
    }

    const id = setInterval(advance, SLIDE_DURATION + FADE_MS);
    return () => clearInterval(id);
  }, [list]);

  if (!list) {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, #1a0a14 0%, #2d1220 30%, #0f1a12 60%, #1a1208 100%)",
        }} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Slot 0 — fixed DOM position, never remounted */}
      <SlideLayer
        src={list[slot0]?.heroUrl}
        opacity={op0}
        zIndex={top === 0 ? 2 : 1}
      />
      {/* Slot 1 — fixed DOM position, never remounted */}
      <SlideLayer
        src={list[slot1]?.heroUrl}
        opacity={op1}
        zIndex={top === 1 ? 2 : 1}
      />

      {/* Vignette overlay */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at center, rgba(5,2,10,0.18) 0%, rgba(5,2,10,0.56) 100%),
          linear-gradient(to bottom, rgba(5,2,10,0.28) 0%, rgba(5,2,10,0.03) 40%, rgba(5,2,10,0.03) 60%, rgba(5,2,10,0.50) 100%)
        `,
        zIndex: 3,
      }} />

      {/* Fade into cream at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40" style={{
        background: "linear-gradient(to bottom, transparent, rgba(253,246,236,0.85))",
        zIndex: 4,
      }} />
    </div>
  );
}

function SlideLayer({ src, opacity, zIndex }: {
  src: string | undefined;
  opacity: number;
  zIndex: number;
}) {
  if (!src) return null;
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity,
        zIndex,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        willChange: "opacity",
      }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(32px) brightness(0.4) saturate(0.5)", transform: "scale(1.15)" }}
        draggable={false}
      />
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: "saturate(1.08) contrast(1.02)" }}
        draggable={false}
      />
    </div>
  );
}
