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

  // Two slots always at FIXED DOM positions — never reorder them.
  // Swapping DOM order causes React to remount elements → double flash.
  // Instead, keep slot0 first, slot1 second always; control z-index + opacity.
  const [slot0Photo, setSlot0Photo] = useState(0);
  const [slot1Photo, setSlot1Photo] = useState(1);
  const [op0, setOp0] = useState(1);  // slot0 starts visible
  const [op1, setOp1] = useState(0);  // slot1 starts hidden
  const [z0, setZ0] = useState(2);    // slot0 starts on top
  const [z1, setZ1] = useState(1);
  const nextIdxRef = useRef(2);
  const busyRef = useRef(false);
  const topRef = useRef(0); // which slot (0 or 1) is currently on top

  useEffect(() => {
    if (!list || list.length < 2) return;

    function advance() {
      if (busyRef.current) return;
      busyRef.current = true;

      const currentTop = topRef.current;
      const hidden = currentTop === 0 ? 1 : 0;
      const nextIdx = nextIdxRef.current % list!.length;
      nextIdxRef.current += 1;

      // Silently load next photo into the hidden (opacity=0) slot
      if (hidden === 0) setSlot0Photo(nextIdx);
      else setSlot1Photo(nextIdx);

      // Wait two frames for the src change to settle, then crossfade
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Bring hidden slot to front and fade it in; fade out current top
          if (hidden === 0) {
            setZ0(2); setZ1(1);
            setOp0(1); setOp1(0);
          } else {
            setZ1(2); setZ0(1);
            setOp1(1); setOp0(0);
          }
          topRef.current = hidden;

          setTimeout(() => {
            busyRef.current = false;
          }, FADE_MS);
        });
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
      {/* Slot 0 — always first in DOM */}
      <SlideLayer src={list[slot0Photo]?.heroUrl} opacity={op0} zIndex={z0} />
      {/* Slot 1 — always second in DOM */}
      <SlideLayer src={list[slot1Photo]?.heroUrl} opacity={op1} zIndex={z1} />

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at center, rgba(5,2,10,0.18) 0%, rgba(5,2,10,0.56) 100%),
          linear-gradient(to bottom, rgba(5,2,10,0.28) 0%, rgba(5,2,10,0.03) 40%, rgba(5,2,10,0.03) 60%, rgba(5,2,10,0.50) 100%)
        `,
        zIndex: 5,
      }} />

      {/* Fade to cream */}
      <div className="absolute bottom-0 left-0 right-0 h-40" style={{
        background: "linear-gradient(to bottom, transparent, rgba(253,246,236,0.85))",
        zIndex: 6,
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
