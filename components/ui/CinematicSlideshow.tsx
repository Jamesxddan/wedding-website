"use client";

import { useEffect, useState, useRef } from "react";
import type { DrivePhoto } from "@/lib/drive";

interface Props {
  photos: DrivePhoto[];
  parallaxX: number;
  parallaxY: number;
}

const SLIDE_DURATION = 8000;
const FADE_MS = 3000;

export default function CinematicSlideshow({ photos }: Props) {
  const list = photos.length > 0 ? photos : null;

  const [slot0Photo, setSlot0Photo] = useState(0);
  const [slot1Photo, setSlot1Photo] = useState(1);
  const [op0, setOp0] = useState(1);
  const [op1, setOp1] = useState(0);
  const [z0, setZ0] = useState(2);
  const [z1, setZ1] = useState(1);
  // Blurred background tracks the TOP (visible) slot's photo
  const [bgSrc, setBgSrc] = useState<string | undefined>(undefined);
  const nextIdxRef = useRef(2);
  const busyRef = useRef(false);
  const topRef = useRef(0);

  // Set initial background when photos load
  useEffect(() => {
    if (list) setBgSrc(list[0]?.heroUrl);
  }, [list]);

  useEffect(() => {
    if (!list || list.length < 2) return;

    function advance() {
      if (busyRef.current) return;
      busyRef.current = true;

      const currentTop = topRef.current;
      const hidden = currentTop === 0 ? 1 : 0;
      const nextIdx = nextIdxRef.current % list!.length;
      nextIdxRef.current += 1;

      const nextSrc = list![nextIdx].heroUrl;

      const preload = new window.Image();
      preload.onload = () => {
        if (hidden === 0) setSlot0Photo(nextIdx);
        else setSlot1Photo(nextIdx);

        requestAnimationFrame(() => {
          if (hidden === 0) {
            setZ0(2); setZ1(1);
            setOp0(1); setOp1(0);
          } else {
            setZ1(2); setZ0(1);
            setOp1(1); setOp0(0);
          }
          topRef.current = hidden;
          // Update blurred background mid-fade so the change is imperceptible
          setTimeout(() => {
            setBgSrc(nextSrc);
          }, FADE_MS / 2);
          setTimeout(() => { busyRef.current = false; }, FADE_MS);
        });
      };
      preload.onerror = () => { busyRef.current = false; };
      preload.src = nextSrc;
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
      {/* Single stable blurred background — updated mid-fade so swap is invisible */}
      {bgSrc && (
        <img
          src={bgSrc}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "blur(40px) brightness(0.35) saturate(0.5)",
            transform: "scale(1.2)",
            zIndex: 0,
          }}
          draggable={false}
        />
      )}

      {/* Slot 0 — always first in DOM */}
      <SlideLayer src={list[slot0Photo]?.heroUrl} opacity={op0} zIndex={z0} />
      {/* Slot 1 — always second in DOM */}
      <SlideLayer src={list[slot1Photo]?.heroUrl} opacity={op1} zIndex={z1} />

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at center, rgba(5,2,10,0.15) 0%, rgba(5,2,10,0.52) 100%),
          linear-gradient(to bottom, rgba(5,2,10,0.25) 0%, rgba(5,2,10,0.02) 40%, rgba(5,2,10,0.02) 60%, rgba(5,2,10,0.48) 100%)
        `,
        zIndex: 10,
      }} />

      {/* Fade to cream */}
      <div className="absolute bottom-0 left-0 right-0 h-40" style={{
        background: "linear-gradient(to bottom, transparent, rgba(253,246,236,0.85))",
        zIndex: 11,
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
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: "saturate(1.06) contrast(1.02)" }}
        draggable={false}
      />
    </div>
  );
}
