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
const ROSE = "#5a1f2e";
const GOLD = "#D4AF37";
const GA = (a: number) => `rgba(212,175,55,${a})`;

export default function BackgroundMusic() {
  const [muted, setMuted] = useState(_muted);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptIn, setPromptIn] = useState(false);

  useEffect(() => {
    if (!isProd) return;

    // Ask every visit — the browser blocks autoplay-with-sound anyway, so
    // this doubles as the explicit user gesture that satisfies it, instead
    // of silently guessing on the first tap/click anywhere on the page.
    setShowPrompt(true);
    const t = setTimeout(() => setPromptIn(true), 60);

    // Pause when user leaves tab/app; resume when they return (unless manually muted)
    const onVisibility = () => {
      const audio = getBackgroundAudio();
      if (document.hidden) {
        if (!audio.paused) {
          audio.pause();
          _pausedByVisibility = true;
        }
      } else {
        if (_pausedByVisibility && !_muted && _unlocked) {
          audio.play().catch(() => {});
        }
        _pausedByVisibility = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function closePrompt() {
    setPromptIn(false);
    setTimeout(() => setShowPrompt(false), 300);
  }

  function playMusic() {
    startBackgroundMusic();
    _muted = false;
    setMuted(false);
    closePrompt();
  }

  function staySilent() {
    // Mark unlocked so a later tap on the mute button can still start
    // playback without fighting the autoplay policy a second time.
    const audio = getBackgroundAudio();
    audio.muted = true;
    _muted = true;
    setMuted(true);
    closePrompt();
  }

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = getBackgroundAudio();
    if (_muted) {
      audio.muted = false;
      audio.volume = 0.35;
      if (_unlocked) {
        audio.play().catch(() => {});
      } else {
        startBackgroundMusic();
      }
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
      {/* Ask-first music consent prompt — shown once per visit */}
      {showPrompt && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(253,246,236,0.97)",
            border: `1px solid ${GA(0.4)}`,
            boxShadow: "0 6px 28px rgba(90,31,46,0.18)",
            backdropFilter: "blur(10px)",
            fontFamily: "var(--font-body, Georgia, serif)",
            opacity: promptIn ? 1 : 0,
            transform: promptIn ? "translateY(0) scale(1)" : "translateY(10px) scale(0.96)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          <span style={{ fontSize: 18 }}>🎵</span>
          <span style={{ fontSize: 12, color: ROSE, lineHeight: 1.4, maxWidth: 170 }}>
            This site has background music — play it?
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              onClick={playMusic}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "none",
                background: `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`,
                color: "#fef9f0", fontSize: 11, fontWeight: 600,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Play music
            </button>
            <button
              onClick={staySilent}
              style={{
                padding: "5px 12px", borderRadius: 8, border: `1px solid ${GA(0.3)}`,
                background: "transparent", color: ROSE, fontSize: 11,
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Keep silent
            </button>
          </div>
        </div>
      )}

      <button
        onClick={toggle}
        title={muted ? "Unmute music" : "Mute music"}
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 9998,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1px solid rgba(212,175,55,0.4)",
          background: "rgba(253,246,236,0.85)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          display: showPrompt ? "none" : "flex",
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
