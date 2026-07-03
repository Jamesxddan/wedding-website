"use client";

import { useEffect, useRef, useState } from "react";

function hasWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export default function PetalScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!hasWebGL(canvas)) {
      setSupported(false);
      return;
    }

    let handle: { destroy: () => void } | null = null;

    import("@/lib/webgl/petalScene").then(({ createPetalScene }) => {
      if (!canvasRef.current) return;
      handle = createPetalScene(canvasRef.current);
    });

    return () => {
      handle?.destroy();
    };
  }, []);

  if (!supported) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-blush via-cream to-champagne"
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}
