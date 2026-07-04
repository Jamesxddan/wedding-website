"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { DrivePhoto } from "@/lib/drive";

interface Props {
  photos: DrivePhoto[];
  parallaxX: number;
  parallaxY: number;
}

const SLIDE_DURATION = 7000; // ms each photo stays fully visible
const FADE_MS = 2500;        // ms crossfade duration

export default function CinematicSlideshow({ photos, parallaxX, parallaxY }: Props) {
  const list = photos.length > 0 ? photos : null;

  // Two slots — we swap which one is "on top" each transition.
  // The hidden slot gets its photo updated silently, then fades in.
  const [slots, setSlots] = useState([0, 1]);      // photo index per slot
  const [topSlot, setTopSlot] = useState(0);        // which slot is visible on top
  const [fading, setFading] = useState(false);      // crossfade in progress
  const nextPhotoRef = useRef(2);                   // next photo to load

  const advance = useCallback(() => {
    if (!list || list.length < 2) return;

    const hiddenSlot = topSlot === 0 ? 1 : 0;
    const nextIdx = nextPhotoRef.current % list.length;
    nextPhotoRef.current += 1;

    // 1. Load next photo into the hidden slot (it's invisible — no flash)
    setSlots(s => {
      const n = [...s];
      n[hiddenSlot] = nextIdx;
      return n;
    });

    // 2. After a tick (so the img src change applies), start the fade
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFading(true);
        // 3. Halfway through fade, flip which slot is "top"
        setTimeout(() => {
          setTopSlot(hiddenSlot);
          setFading(false);
        }, FADE_MS);
      });
    });
  }, [list, topSlot]);

  useEffect(() => {
    if (!list || list.length < 2) return;
    const id = setInterval(advance, SLIDE_DURATION + FADE_MS);
    return () => clearInterval(id);
  }, [list, advance]);

  if (!list) {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, #1a0a14 0%, #2d1220 30%, #0f1a12 60%, #1a1208 100%)",
        }} />
      </div>
    );
  }

  const bottomSlot = topSlot === 0 ? 1 : 0;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Bottom slot — always fully visible underneath */}
      <Slide src={list[slots[bottomSlot]]?.heroUrl} opacity={1} />

      {/* Top slot — fades out during transition to reveal bottom */}
      <Slide
        src={list[slots[topSlot]]?.heroUrl}
        opacity={fading ? 0 : 1}
        fadeDuration={FADE_MS}
      />

      {/* Cinematic vignette overlay */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at center, rgba(5,2,10,0.18) 0%, rgba(5,2,10,0.56) 100%),
          linear-gradient(to bottom, rgba(5,2,10,0.28) 0%, rgba(5,2,10,0.03) 40%, rgba(5,2,10,0.03) 60%, rgba(5,2,10,0.50) 100%)
        `,
        zIndex: 2,
      }} />

      {/* Fade into cream at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40" style={{
        background: "linear-gradient(to bottom, transparent, rgba(253,246,236,0.85))",
        zIndex: 3,
      }} />
    </div>
  );
}

function Slide({ src, opacity, fadeDuration = 0 }: {
  src: string | undefined;
  opacity: number;
  fadeDuration?: number;
}) {
  if (!src) return null;
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity,
        transition: fadeDuration ? `opacity ${fadeDuration}ms ease-in-out` : "none",
        zIndex: 1,
        willChange: "opacity",
      }}
    >
      {/* Blurred copy fills letterbox bars */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(32px) brightness(0.4) saturate(0.5)", transform: "scale(1.15)" }}
        draggable={false}
      />
      {/* Full photo, unclipped */}
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
