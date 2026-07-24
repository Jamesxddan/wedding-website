"use client";

import { useEffect, useRef } from "react";
import { useSelectPhotos } from "@/lib/useSelectPhotos";

export default function OpeningScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photos = useSelectPhotos();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let handle: { destroy: () => void } | null = null;

    const bokehUrl = photos.byName("sub", "2.JPG")?.thumbnailUrl;
    const ringsUrl = photos.byName("sub", "4.JPG")?.thumbnailUrl;

    import("@/lib/webgl/openingScene").then(({ createOpeningScene }) => {
      if (!canvasRef.current) return;
      // Background blur planes are very GPU-intensive at desktop resolutions.
      // Only enable them on touch devices where the canvas is small enough.
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      handle = createOpeningScene(canvasRef.current, {
        bokehUrl: isTouchDevice ? bokehUrl : undefined,
        ringsUrl: isTouchDevice ? ringsUrl : undefined,
      });
    });

    return () => { handle?.destroy(); };
  }, [photos.loading]); // re-run once photos finish loading so textures are available

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none", zIndex: 2 }}
    />
  );
}
