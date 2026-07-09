"use client";

import { useEffect, useState, useRef } from "react";
import type { DrivePhoto } from "@/lib/drive";

interface Props {
  photos: DrivePhoto[];
  parallaxX: number;
  parallaxY: number;
  onPhotoChange?: (index: number) => void;
  lightBackdrop?: boolean;
}

const SLIDE_DURATION = 8000;
const FADE_MS = 3000;

export default function CinematicSlideshow({ photos, onPhotoChange, lightBackdrop = false }: Props) {
  const list = photos.length > 0 ? photos : null;

  const [slot0Photo, setSlot0Photo] = useState(0);
  const [slot1Photo, setSlot1Photo] = useState(1);
  const [op0, setOp0] = useState(1);
  const [op1, setOp1] = useState(0);
  const [z0, setZ0] = useState(2);
  const [z1, setZ1] = useState(1);
  const [bgSrc, setBgSrc] = useState<string | undefined>(undefined);
  const nextIdxRef = useRef(2);
  const busyRef = useRef(false);
  const topRef = useRef(0);

  useEffect(() => {
    if (list) {
      setBgSrc(list[0]?.heroUrl);
      onPhotoChange?.(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // Notify parent — fires as the new slide starts fading in
        onPhotoChange?.(nextIdx);

        requestAnimationFrame(() => {
          if (hidden === 0) {
            setZ0(2); setZ1(1);
            setOp0(1); setOp1(0);
          } else {
            setZ1(2); setZ0(1);
            setOp1(1); setOp0(0);
          }
          topRef.current = hidden;
          setTimeout(() => { setBgSrc(nextSrc); }, FADE_MS / 2);
          setTimeout(() => { busyRef.current = false; }, FADE_MS);
        });
      };
      preload.onerror = () => { busyRef.current = false; };
      preload.src = nextSrc;
    }

    const id = setInterval(advance, SLIDE_DURATION + FADE_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {bgSrc && (
        <img
          src={bgSrc}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "blur(40px) brightness(0.55) saturate(0.8)",
            transform: "scale(1.2)",
            zIndex: 0,
          }}
          draggable={false}
        />
      )}

      <SlideLayer src={list[slot0Photo]?.heroUrl} opacity={op0} zIndex={z0} />
      <SlideLayer src={list[slot1Photo]?.heroUrl} opacity={op1} zIndex={z1} />

      {/* Dark overlay — fades out when backdrop is light so the photo shows through */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, rgba(5,2,10,0.15) 0%, rgba(5,2,10,0.52) 100%),
            linear-gradient(to bottom, rgba(5,2,10,0.25) 0%, rgba(5,2,10,0.02) 40%, rgba(5,2,10,0.02) 60%, rgba(5,2,10,0.48) 100%)
          `,
          zIndex: 10,
          opacity: lightBackdrop ? 0.50 : 1,
          transition: "opacity 1.5s ease",
        }}
      />

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
        style={{ filter: "brightness(0.75) saturate(1.06) contrast(1.02)" }}
        draggable={false}
      />
    </div>
  );
}
