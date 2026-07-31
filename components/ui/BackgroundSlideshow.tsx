"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Fixed backdrop that slowly crossfades engagement photos at very low opacity.
 * Sits behind the page content so the unified warm gradient shows through.
 * Only renders in the RETURN_VISIT (prewedding) phase.
 */
export default function BackgroundSlideshow() {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState<number | null>(null);
  const [showNext, setShowNext] = useState(false);
  const [ready, setReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch engagement photos
  useEffect(() => {
    fetch("/api/drive-photos?folder=engagement&device=desktop&view=albums")
      .then((r) => r.json())
      .then((data) => {
        const allUrls = (data.albums ?? [])
          .flatMap((a: { photos?: { thumbnailUrl: string }[] }) => a.photos ?? [])
          .map((p: { thumbnailUrl: string }) => p.thumbnailUrl)
          .filter(Boolean);
        if (allUrls.length > 0) {
          setPhotoUrls(allUrls);
          setReady(true);
        }
      })
      .catch(() => {});
  }, []);

  // Cycle through photos: 30s per image, 3s crossfade
  useEffect(() => {
    if (photoUrls.length < 2) return;

    intervalRef.current = setInterval(() => {
      const next = (currentIdx + 1) % photoUrls.length;
      setNextIdx(next);
      // Start crossfade on next frame to avoid batching with state set
      requestAnimationFrame(() => setShowNext(true));
      // After fade completes, promote next → current
      fadeRef.current = setTimeout(() => {
        setCurrentIdx(next);
        setShowNext(false);
        setNextIdx(null);
      }, 3000);
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, [photoUrls.length, currentIdx]);

  if (!ready || photoUrls.length === 0) return null;

  const blurOpacity = 0.1;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Current (fading out) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: showNext ? 0 : blurOpacity,
          transition: "opacity 3s ease",
          willChange: "opacity",
          filter: "blur(8px)",
          transform: "scale(1.08)",
        }}
      >
        <img
          src={photoUrls[currentIdx]}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Next (fading in) */}
      {nextIdx !== null && (
        <div
          className="absolute inset-0"
          style={{
            opacity: showNext ? blurOpacity : 0,
            transition: "opacity 3s ease",
            willChange: "opacity",
            filter: "blur(8px)",
            transform: "scale(1.08)",
          }}
        >
          <img
            src={photoUrls[nextIdx]}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
