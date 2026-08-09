"use client";

import { useEffect, useState } from "react";

// Playlist order: current song → gratitude → goodness of god → loop back
const PLAYLIST = [
  "/song.mp3",
  "/audio/Gratitude  Brandon Lake  Piano Cover by James Wong.mp3",
  "/audio/Goodness of God - piano instrumental cover with lyrics.mp3",
];

// Module-level singleton — persists across renders and phase changes
let _audio: HTMLAudioElement | null = null;
let _unlocked = false;
let _muted = false;
let _pausedByVisibility = false;
let _currentIndex = 0;

function getBackgroundAudio() {
  if (!_audio) {
    _audio = new Audio(PLAYLIST[0]);
    _audio.loop = false; // we handle looping manually via playlist
    _audio.volume = 0.35;
    _audio.preload = "auto";
    _audio.load();

    // When a song ends, advance to next in playlist
    _audio.addEventListener("ended", () => {
      _currentIndex = (_currentIndex + 1) % PLAYLIST.length;
      if (_audio) {
        _audio.src = PLAYLIST[_currentIndex];
        _audio.load();
        _audio.play().catch(() => {});
      }
    });
  }
  return _audio;
}

// Call this from any guaranteed user-gesture (e.g. form submit button)
export function startBackgroundMusic() {
  if (_unlocked) return;
  _unlocked = true;
  const audio = getBackgroundAudio();
  // Must call play() synchronously within the gesture call stack.
  // Waiting for canplay breaks Android Chrome's autoplay policy.
  audio.play().catch(() => {});
}

const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

export default function BackgroundMusic() {
  const [muted, setMuted] = useState(_muted);
  const [showToast, setShowToast] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!isProd) return;
    const audio = getBackgroundAudio();

    // Try autoplay (desktop / Android without restrictions)
    audio.play().catch(() => {});

    const unlock = () => {
      startBackgroundMusic();
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
    };

    // Capture phase = earliest possible point, before React's event system
    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("mousedown", unlock, { capture: true });

    // Pause when user leaves tab/app; resume when they return (unless manually muted)
    const onVisibility = () => {
      if (document.hidden) {
        if (!audio.paused) {
          audio.pause();
          _pausedByVisibility = true;
        }
      } else {
        if (_pausedByVisibility && !_muted) {
          audio.play().catch(() => {});
        }
        _pausedByVisibility = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Show return-visit toast (guest has already seen the invitation)
    const isReturnVisit = typeof window !== "undefined" && !!localStorage.getItem("invitation_seen");
    if (isReturnVisit) {
      setShowToast(true);
      setTimeout(() => setToastVisible(true), 50);
      setTimeout(() => setToastVisible(false), 4000);
      setTimeout(() => setShowToast(false), 4600);
    }

    return () => {
      document.removeEventListener("touchstart", unlock, true);
      document.removeEventListener("mousedown", unlock, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = getBackgroundAudio();
    if (_muted) {
      audio.muted = false;
      audio.volume = 0.35;
      if (_unlocked) audio.play().catch(() => {});
      _muted = false;
      setMuted(false);
    } else {
      audio.muted = true;
      _muted = true;
      setMuted(true);
    }
  };

  if (!isProd) return null;

  return (
    <>
      {/* Return-visit hint toast */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: 64,
            left: 20,
            zIndex: 9999,
            background: "rgba(253,246,236,0.95)",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 12,
            padding: "8px 14px",
            boxShadow: "0 2px 16px rgba(90,31,46,0.12)",
            backdropFilter: "blur(8px)",
            fontSize: 12,
            color: "#5a1f2e",
            fontFamily: "var(--font-body, Georgia, serif)",
            whiteSpace: "nowrap",
            opacity: toastVisible ? 1 : 0,
            transform: toastVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
            pointerEvents: "none",
          }}
        >
          🎵 Tap the icon to mute or unmute
        </div>
      )}

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
    </>
  );
}
