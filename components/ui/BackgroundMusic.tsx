"use client";

import { useEffect, useRef, useState } from "react";

// Module-level singleton — survives component unmounts and phase changes
let _audio: HTMLAudioElement | null = null;
let _unlocked = false;

function getAudio(src: string) {
  if (!_audio) {
    _audio = new Audio(src);
    _audio.loop = true;
    _audio.volume = 0.35;
    _audio.preload = "auto";
  }
  return _audio;
}

export default function BackgroundMusic({ src }: { src: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = getAudio(src);

    // Try autoplay immediately (works on desktop + some Android)
    audio.play().catch(() => {});

    const unlock = () => {
      if (_unlocked) return;
      _unlocked = true;
      audio.play().catch(() => {});
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
    };

    // Capture phase fires before React's synthetic events — required for iOS
    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("mousedown", unlock, { capture: true });

    return () => {
      // Don't pause or clear — audio must keep playing across phase changes
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
    };
  }, [src]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = getAudio(src);
    if (muted) {
      audio.volume = 0.35;
      audio.play().catch(() => {});
      setMuted(false);
    } else {
      audio.volume = 0;
      setMuted(true);
    }
  };

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
