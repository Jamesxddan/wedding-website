"use client";

import { useEffect, useRef, useState } from "react";

export default function BackgroundMusic({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = "auto";
    audioRef.current = audio;

    // Try autoplay immediately (works on desktop + Android)
    audio.play().catch(() => {});

    // iOS Safari requires play() to be called synchronously inside a
    // user-gesture handler. Using capture:true gets the event before
    // React's synthetic event system, keeping it in the gesture context.
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      audio.play().catch(() => {});
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
    };

    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("mousedown", unlock, { capture: true });

    return () => {
      audio.pause();
      audio.src = "";
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
    };
  }, [src]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
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
