"use client";

import { useEffect, useRef } from "react";
import type { FloatingMotifsHandle } from "@/lib/webgl/floatingMotifs";

export default function FloatingMotifs() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<FloatingMotifsHandle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip on touch devices (same pattern as OpeningScene)
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    import("@/lib/webgl/floatingMotifs").then(({ createFloatingMotifs }) => {
      if (!canvasRef.current) return;
      handleRef.current = createFloatingMotifs(canvasRef.current);
    });

    // Update parallax on scroll
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleRef.current?.updateScroll(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
