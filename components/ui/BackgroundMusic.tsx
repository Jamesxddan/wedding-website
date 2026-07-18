"use client";

import { useEffect, useState } from "react";

// Module-level singleton — never destroyed across renders or phase changes
let _audio: HTMLAudioElement | null = null;
let _unlocked = false;

export function getBackgroundAudio(src: string) {
  if (!_audio) {
    _audio = new Audio(src);
    _audio.loop = true;
    _audio.volume = 0.35;
    _audio.preload = "auto";
    _audio.load();
  }
  return _audio;
}

// Call this from any guaranteed user-gesture (e.g. form submit button)
export function startBackgroundMusic(src: string) {
  if (_unlocked) return;
  _unlocked = true;
  const audio = getBackgroundAudio(src);
  const doPlay = () => audio.play().catch(() => {});
  if (audio.readyState >= 2) {
    doPlay();
  } else {
    audio.addEventListener("canplay", doPlay, { once: true });
  }
}

const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export default function BackgroundMusic({ src }: { src: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!isProd) return;
    const audio = getBackgroundAudio(src);

    // Try autoplay (desktop / Android without restrictions)
    audio.play().catch(() => {});

    const unlock = () => {
      startBackgroundMusic(src);
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
    };

    // Capture phase = earliest possible point, before React's event system
    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("mousedown", unlock, { capture: true });

    return () => {
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
    };
  }, [src]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = getBackgroundAudio(src);
    if (muted) {
      audio.volume = 0.35;
      audio.play().catch(() => {});
      setMuted(false);
    } else {
      audio.volume = 0;
      setMuted(true);
    }
  };

  if (!isProd) return null;

  return (
    <button
      onClick={toggle}
      title={muted ? "Unmute music" : "Mute music"}
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 9999,
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid rgba(212,175,55,0.4)",
        background: "rgba(253,246,236,0.85)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        boxShadow: "0 2px 12px rgba(90,31,46,0.1)",
      }}
    >
      {muted ? "🔇" : "🎵"}
    </button>
  );
}
