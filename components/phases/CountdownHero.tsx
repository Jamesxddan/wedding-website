"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { WEDDING_DATE, MUSIC_URL } from "@/lib/constants";
import Nav from "@/components/ui/Nav";
import ParticleCanvas from "@/components/ui/ParticleCanvas";
import CinematicSlideshow from "@/components/ui/CinematicSlideshow";
import type { DrivePhoto } from "@/lib/drive";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(now: Date): TimeLeft {
  const target = WEDDING_DATE.getTime();
  const diff = Math.max(0, target - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function SplitText({ text, delayBase = 300, stagger = 55 }: {
  text: string; delayBase?: number; stagger?: number;
}) {
  return (
    <span aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: "inline-block",
            animation: `split-in 0.75s cubic-bezier(0.22, 1, 0.36, 1) both`,
            animationDelay: `${delayBase + i * stagger}ms`,
          }}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}

// Draws thumbnail on a tiny offscreen canvas and returns average relative luminance (0–1).
// Uses same-origin /api/drive-image URLs so no crossOrigin attribute is needed.
async function analyzeImageLuminance(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = 40;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(0.2); return; }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        let total = 0;
        const count = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          // ITU-R BT.709 relative luminance
          total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        resolve(total / count);
      } catch {
        resolve(0.2);
      }
    };
    img.onerror = () => resolve(0.2);
    img.src = src;
  });
}

interface Props {
  guestName: string;
  sessionRestored?: boolean;
  onViewInvitation?: () => void;
}

export default function CountdownHero({ guestName, sessionRestored = false, onViewInvitation }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(new Date()));
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(false);
  const [appeared, setAppeared] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  // Luminance tracking
  const luminanceCache = useRef<Map<string, number>>(new Map());
  const [currentLuminance, setCurrentLuminance] = useState(0.2); // default: dark → white text

  // Animated countdown — counts up from 0 to real value on mount
  const [animDone, setAnimDone] = useState(false);
  const [animValues, setAnimValues] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const initial = getTimeLeft(new Date());
    const duration = 1500;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimValues({
        days: Math.round(ease * initial.days),
        hours: Math.round(ease * initial.hours),
        minutes: Math.round(ease * initial.minutes),
        seconds: Math.round(ease * initial.seconds),
      });
      if (t < 1) requestAnimationFrame(step);
      else setAnimDone(true);
    }
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);

  const displayTime = animDone ? timeLeft : animValues;

  // Live countdown ticker
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch engagement photos for the slideshow — use device-specific folder
  useEffect(() => {
    const sessionToken = localStorage.getItem("session_token");
    const headers: HeadersInit = sessionToken ? { "x-session-token": sessionToken } : {};
    const devVp = localStorage.getItem("dev_viewport");
    const isMobile = devVp ? devVp === "mobile" : window.innerWidth < 768;
    const device = isMobile ? "mobile" : "desktop";
    fetch(`/api/drive-photos?folder=engagement&device=${device}&view=albums`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (!d.photos?.length) return;
        setPhotos(d.photos);
      })
      .catch(() => {});
  }, []);

  // Analyse all thumbnails in the background once photos load
  useEffect(() => {
    if (!photos.length) return;
    let cancelled = false;
    async function runAnalysis() {
      for (const photo of photos) {
        if (cancelled) break;
        if (luminanceCache.current.has(photo.id)) continue;
        const lum = await analyzeImageLuminance(photo.thumbnailUrl);
        luminanceCache.current.set(photo.id, lum);
      }
    }
    runAnalysis();
    return () => { cancelled = true; };
  }, [photos]);

  // Called by CinematicSlideshow when the active photo changes
  const handlePhotoChange = useCallback((index: number) => {
    const photo = photos[index];
    if (!photo) return;
    const cached = luminanceCache.current.get(photo.id);
    if (cached !== undefined) {
      setCurrentLuminance(cached);
    } else {
      // Not analysed yet — run it now (first photo on initial load)
      analyzeImageLuminance(photo.thumbnailUrl).then((lum) => {
        luminanceCache.current.set(photo.id, lum);
        setCurrentLuminance(lum);
      });
    }
  }, [photos]);

  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 100);
    return () => clearTimeout(t);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setMousePos({ x: (e.clientX - cx) / cx, y: (e.clientY - cy) / cy });
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setMousePos({ x: (touch.clientX - cx) / cx, y: (touch.clientY - cy) / cy });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [onMouseMove, onTouchMove]);

  useEffect(() => {
    if (!MUSIC_URL) return;
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, []);

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  const px = mousePos.x * 14;
  const py = mousePos.y * 8;
  const tx = -mousePos.x * 5;
  const ty = -mousePos.y * 3;

  const fadeIn = (delay: number) =>
    `transition-all duration-1000 ease-out ${appeared ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-8 blur-sm"}`;

  // ─── Adaptive colour palette ───────────────────────────────────────────────
  const isLight = currentLuminance > 0.45;
  const CT = "1.5s ease"; // colour transition duration

  const cPrimary       = isLight ? "rgba(18,12,8,0.95)"   : "rgba(255,255,255,1.0)";
  const cSecondary     = isLight ? "rgba(18,12,8,0.85)"   : "rgba(255,255,255,0.90)";
  const cMuted         = isLight ? "rgba(18,12,8,0.68)"   : "rgba(255,255,255,0.72)";
  const cScript        = isLight ? "rgba(140,50,70,0.95)" : "rgba(244,194,194,0.9)";
  // Outline + halo: 4-direction pixel offsets give a crisp edge; glow adds depth
  const cHalo = isLight
    ? "-1px -1px 0 rgba(255,255,255,0.75), 1px -1px 0 rgba(255,255,255,0.75), -1px 1px 0 rgba(255,255,255,0.75), 1px 1px 0 rgba(255,255,255,0.75), 0 1px 10px rgba(255,255,255,0.95), 0 2px 28px rgba(255,255,255,0.7)"
    : "-1px -1px 0 rgba(0,0,0,0.65),       1px -1px 0 rgba(0,0,0,0.65),       -1px 1px 0 rgba(0,0,0,0.65),       1px 1px 0 rgba(0,0,0,0.65),       0 1px 10px rgba(0,0,0,0.90), 0 2px 28px rgba(0,0,0,0.6)";
  const cHeadShadow = isLight
    ? "-1px -1px 0 rgba(255,255,255,0.55), 1px -1px 0 rgba(255,255,255,0.55), -1px 1px 0 rgba(255,255,255,0.55), 1px 1px 0 rgba(255,255,255,0.55), 0 2px 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.5)"
    : "-1px -1px 0 rgba(0,0,0,0.45),       1px -1px 0 rgba(0,0,0,0.45),       -1px 1px 0 rgba(0,0,0,0.45),       1px 1px 0 rgba(0,0,0,0.45),       0 2px 40px rgba(244,194,194,0.35), 0 0 80px rgba(181,101,118,0.2)";
  const cPillBg        = isLight ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.06)";
  const cPillBorder    = isLight ? "rgba(18,12,8,0.20)"     : "rgba(255,255,255,0.20)";
  const cBoxBg         = isLight ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0.08)";
  const cBoxBorder     = isLight ? "rgba(18,12,8,0.15)"     : "rgba(255,255,255,0.18)";
  const cBoxShadow     = isLight
    ? "0 4px 32px rgba(18,12,8,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"
    : "0 4px 32px rgba(244,194,194,0.15), inset 0 1px 0 rgba(255,255,255,0.12)";
  const cMusicBtnColor  = isLight ? "rgba(18,12,8,0.65)"     : "rgba(255,255,255,0.70)";
  const cMusicBtnBorder = isLight ? "rgba(18,12,8,0.22)"     : "rgba(255,255,255,0.20)";
  const cMusicBtnBg     = isLight ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.20)";
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />
      <section
        ref={heroRef}
        id="home"
        className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden"
      >
        <CinematicSlideshow
          photos={photos}
          parallaxX={px}
          parallaxY={py}
          onPhotoChange={handlePhotoChange}
          lightBackdrop={isLight}
        />
        <ParticleCanvas mouseX={mousePos.x} mouseY={mousePos.y} />

        {MUSIC_URL && (
          <button
            onClick={toggleMusic}
            aria-label={playing ? "Pause music" : "Play ambient music"}
            className="absolute top-20 right-6 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300"
            style={{
              zIndex: 20,
              color: cMusicBtnColor,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: cMusicBtnBorder,
              background: cMusicBtnBg,
              transition: `color ${CT}, border-color ${CT}, background-color ${CT}`,
            }}
          >
            {playing ? (
              <span className="music-playing flex gap-0.5 items-end h-4">
                <span className="w-0.5 bg-current rounded-full animate-music-bar-1" style={{ height: "100%" }} />
                <span className="w-0.5 bg-current rounded-full animate-music-bar-2" style={{ height: "60%" }} />
                <span className="w-0.5 bg-current rounded-full animate-music-bar-3" style={{ height: "80%" }} />
                <span className="w-0.5 bg-current rounded-full animate-music-bar-2" style={{ height: "40%" }} />
              </span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 18V5l12-2v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            )}
          </button>
        )}

        <div
          className="relative z-10 flex flex-col items-center gap-8 px-6 text-center select-none"
          style={{ transform: `translate(${tx}px, ${ty}px)`, transition: "transform 0.15s ease-out" }}
        >
          {/* Eyebrow */}
          <p
            className={`font-body text-[13px] font-semibold tracking-[0.4em] uppercase ${fadeIn(0)}`}
            style={{
              transitionDelay: "0ms",
              color: cSecondary,
              textShadow: cHalo,
              transition: `color ${CT}, text-shadow ${CT}`,
            }}
          >
            You are warmly invited to celebrate
          </p>

          {/* Couple names — split text letter-by-letter */}
          <div className={fadeIn(1)} style={{ transitionDelay: "150ms" }}>
            <h1
              className="font-heading leading-none"
              style={{
                fontSize: "clamp(2.6rem, 9vw, 9rem)",
                letterSpacing: "-0.01em",
                color: cPrimary,
                textShadow: cHeadShadow,
                transition: `color ${CT}, text-shadow ${CT}`,
              }}
            >
              <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                <SplitText text="James" delayBase={350} stagger={60} />
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  margin: "0 0.18em",
                  animation: "split-in 0.75s cubic-bezier(0.22,1,0.36,1) both",
                  animationDelay: "710ms",
                }}
              >
                &amp;
              </span>
              <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                <SplitText text="Sharon" delayBase={780} stagger={60} />
              </span>
            </h1>
            <p
              className="font-script italic mt-3"
              style={{
                fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)",
                animation: "blur-reveal 1.4s ease both",
                animationDelay: "1300ms",
                color: cScript,
                textShadow: cHalo,
                transition: `color ${CT}, text-shadow ${CT}`,
              }}
            >
              &ldquo;God&apos;s will was on our marriage&rdquo;
            </p>
          </div>

          {/* Date pill */}
          <div
            className={`px-6 py-2 rounded-full backdrop-blur-sm ${fadeIn(2)}`}
            style={{
              transitionDelay: "400ms",
              background: cPillBg,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: cPillBorder,
              transition: `background-color ${CT}, border-color ${CT}`,
            }}
          >
            <p
              className="font-heading tracking-widest text-[15px] font-semibold uppercase"
              style={{ color: cSecondary, textShadow: cHalo, transition: `color ${CT}, text-shadow ${CT}` }}
            >
              October 8 th &nbsp;·&nbsp; 2026 &nbsp;·&nbsp; Chennai
            </p>
          </div>

          {/* Countdown — animated from 0 to real values */}
          <div
            className={`flex gap-4 md:gap-8 ${fadeIn(3)}`}
            style={{ transitionDelay: "600ms" }}
          >
            {[
              { value: displayTime.days, label: "Days" },
              { value: displayTime.hours, label: "Hours" },
              { value: displayTime.minutes, label: "Minutes" },
              { value: displayTime.seconds, label: "Seconds" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className="relative flex items-center justify-center rounded-xl backdrop-blur-md"
                  style={{
                    width: "clamp(64px, 14vw, 110px)",
                    height: "clamp(64px, 14vw, 110px)",
                    background: cBoxBg,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: cBoxBorder,
                    boxShadow: cBoxShadow,
                    transition: `background-color ${CT}, border-color ${CT}, box-shadow ${CT}`,
                  }}
                >
                  <span
                    className="font-heading tabular-nums"
                    style={{
                      fontSize: "clamp(1.6rem, 4vw, 3.2rem)",
                      color: cPrimary,
                      textShadow: cHalo,
                      transition: `color ${CT}, text-shadow ${CT}`,
                    }}
                  >
                    {label === "Days" ? value : pad(value)}
                  </span>
                </div>
                <span
                  className="font-body text-[12px] md:text-[13px] font-semibold tracking-widest uppercase"
                  style={{ color: cMuted, textShadow: cHalo, transition: `color ${CT}, text-shadow ${CT}` }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Live-day teaser */}
          <p
            className={`font-body ${fadeIn(4)}`}
            style={{
              transitionDelay: "750ms",
              fontSize: "clamp(11px, 1.8vw, 13px)",
              fontStyle: "italic",
              letterSpacing: "0.03em",
              color: cMuted,
              textShadow: cHalo,
              transition: `color ${CT}, text-shadow ${CT}`,
              maxWidth: 340,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            On October 8th, return here to watch the ceremony &amp; reception live ✨
          </p>

          {/* Greeting */}
          <p
            className={`font-script italic ${fadeIn(5)}`}
            style={{
              transitionDelay: "900ms",
              fontSize: "clamp(1.1rem, 2vw, 1.45rem)",
              color: cSecondary,
              textShadow: cHalo,
              transition: `color ${CT}, text-shadow ${CT}`,
            }}
          >
            Counting down with you, {guestName} 🌸
          </p>

          {onViewInvitation && (
            <button
              onClick={onViewInvitation}
              className={`font-body ${fadeIn(5)}`}
              style={{
                transitionDelay: "1000ms",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.06em",
                padding: "9px 22px",
                borderRadius: 24,
                border: `1px solid ${cPillBorder}`,
                background: cPillBg,
                color: cSecondary,
                textShadow: cHalo,
                backdropFilter: "blur(6px)",
                cursor: "pointer",
                transition: `color ${CT}, border-color ${CT}, background-color ${CT}`,
              }}
            >
              💌 View Invitation Again
            </button>
          )}
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 transition-all duration-1000 ${appeared ? "opacity-60" : "opacity-0"}`}
          style={{ transitionDelay: "1200ms" }}
        >
          <span
            className="font-body text-[11px] font-medium tracking-widest uppercase"
            style={{ color: cMuted, textShadow: cHalo, transition: `color ${CT}, text-shadow ${CT}` }}
          >
            Scroll
          </span>
          <div
            className="w-px h-10 animate-scroll-line"
            style={{
              background: `linear-gradient(to bottom, ${cMuted}, transparent)`,
              transition: `background ${CT}`,
            }}
          />
        </div>
      </section>
    </>
  );
}
