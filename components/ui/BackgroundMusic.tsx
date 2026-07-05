"use client";

import { useEffect, useRef, useState } from "react";

export default function BackgroundMusic({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = "auto";
    audioRef.current = audio;

    const tryPlay = () => audio.play().catch(() => {});

    // Try autoplay immediately
    tryPlay();

    // Also trigger on first interaction in case autoplay was blocked
    const onInteraction = () => {
      tryPlay();
      setReady(true);
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };
    document.addEventListener("click", onInteraction);
    document.addEventListener("touchstart", onInteraction);

    audio.addEventListener("playing", () => setReady(true));

    return () => {
      audio.pause();
      audio.src = "";
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
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
        transition: "opacity 0.3s",
        opacity: ready ? 1 : 0.5,
      }}
    >
      {muted ? "🔇" : "🎵"}
    </button>
  );
}
