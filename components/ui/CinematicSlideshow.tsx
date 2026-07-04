"use client";

import { useEffect, useState, useRef } from "react";
import type { DrivePhoto } from "@/lib/drive";

interface Props {
  photos: DrivePhoto[];
  parallaxX: number;
  parallaxY: number;
}

const SLIDE_DURATION = 8000; // ms visible per photo
const FADE_DURATION = 2000;  // ms crossfade

export default function CinematicSlideshow({ photos, parallaxX, parallaxY }: Props) {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [fading, setFading] = useState(false);
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

  if (!list) {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a0a14 0%, #2d1220 30%, #0f1a12 60%, #1a1208 100%)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Next slide — underneath, always visible */}
      <SlideLayer src={list[next].heroUrl} opacity={1} />

      {/* Current slide — fades out to reveal next */}
      <SlideLayer
        src={list[current].heroUrl}
        opacity={fading ? 0 : 1}
        fadeDuration={FADE_DURATION}
        slow
      />

      {/* Cinematic dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, rgba(5,2,10,0.2) 0%, rgba(5,2,10,0.58) 100%),
            linear-gradient(to bottom, rgba(5,2,10,0.28) 0%, rgba(5,2,10,0.04) 40%, rgba(5,2,10,0.04) 60%, rgba(5,2,10,0.52) 100%)
          `,
          zIndex: 2,
        }}
      />

      {/* Gradient bleed into cream at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: "linear-gradient(to bottom, transparent, rgba(253,246,236,0.85))",
          zIndex: 3,
        }}
      />
    </div>
  );
}

function SlideLayer({
  src,
  opacity,
  fadeDuration = 0,
  slow = false,
}: {
  src: string;
  opacity: number;
  fadeDuration?: number;
  slow?: boolean;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity,
        transition: fadeDuration ? `opacity ${fadeDuration}ms ease-in-out` : undefined,
        zIndex: 1,
      }}
    >
      {/* Blurred background to fill empty space */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(28px) brightness(0.45) saturate(0.6)", transform: "scale(1.12)" }}
        draggable={false}
      />
      {/* Full photo, unclipped */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          filter: "saturate(1.08) contrast(1.02)",
          animation: slow ? `kb-gentle ${SLIDE_DURATION * 2}ms ease-in-out infinite alternate` : undefined,
        }}
        draggable={false}
      />
    </div>
  );
}
