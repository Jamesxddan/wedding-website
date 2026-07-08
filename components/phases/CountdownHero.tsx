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
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}

interface Props {
  guestName: string;
  sessionRestored?: boolean;
}

export default function CountdownHero({ guestName, sessionRestored = false }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(new Date()));
  const [photos, setPhotos] = useState<DrivePhoto[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(false);
  const [appeared, setAppeared] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

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
    fetch(`/api/drive-photos?folder=engagement&device=${device}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (!d.photos?.length) return;
        setPhotos(d.photos);
      })
      .catch(() => {});
  }, []);

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

  return (
    <>
      <Nav />
      <section
        ref={heroRef}
        id="home"
        className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden"
      >
        <CinematicSlideshow photos={photos} parallaxX={px} parallaxY={py} />
        <ParticleCanvas mouseX={mousePos.x} mouseY={mousePos.y} />

        {MUSIC_URL && (
          <button
            onClick={toggleMusic}
            aria-label={playing ? "Pause music" : "Play ambient music"}
            className="absolute top-20 right-6 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white border border-white/20 hover:border-white/50 backdrop-blur-sm bg-black/20 transition-all duration-300"
            style={{ zIndex: 20 }}
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
            className={`font-body text-xs tracking-[0.4em] uppercase text-white/60 ${fadeIn(0)}`}
            style={{ transitionDelay: "0ms" }}
          >
            You are warmly invited to celebrate
          </p>

          {/* Couple names — split text letter-by-letter */}
          <div className={fadeIn(1)} style={{ transitionDelay: "150ms" }}>
            <h1
              className="font-heading leading-none text-white"
              style={{
                fontSize: "clamp(2.6rem, 9vw, 9rem)",
                textShadow: "0 2px 40px rgba(244,194,194,0.35), 0 0 80px rgba(181,101,118,0.2)",
                letterSpacing: "-0.01em",
              }}
            >
              <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                <SplitText text="James" delayBase={350} stagger={60} />
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  animation: "split-in 0.75s cubic-bezier(0.22,1,0.36,1) both",
                  animationDelay: "710ms",
                }}
              >
                {" & "}
              </span>
              <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                <SplitText text="Sharon" delayBase={780} stagger={60} />
              </span>
            </h1>
            <p
              className="font-script italic text-blush/80 mt-3"
              style={{
                fontSize: "clamp(1.1rem, 2.5vw, 1.6rem)",
                animation: "blur-reveal 1.4s ease both",
                animationDelay: "1300ms",
              }}
            >
              &ldquo;God&apos;s will was on our marriage&rdquo;
            </p>
          </div>

          {/* Date pill */}
          <div
            className={`px-6 py-2 rounded-full border border-white/20 backdrop-blur-sm ${fadeIn(2)}`}
            style={{ transitionDelay: "400ms", background: "rgba(255,255,255,0.06)" }}
          >
            <p className="font-heading text-white/80 tracking-widest text-sm uppercase">
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
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 4px 32px rgba(244,194,194,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
                >
                  <span
                    className="font-heading text-white tabular-nums"
                    style={{ fontSize: "clamp(1.6rem, 4vw, 3.2rem)" }}
                  >
                    {label === "Days" ? value : pad(value)}
                  </span>
                </div>
                <span className="font-body text-[10px] md:text-xs tracking-widest uppercase text-white/50">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Greeting */}
          <p
            className={`font-script italic text-white/60 ${fadeIn(4)}`}
            style={{ transitionDelay: "800ms", fontSize: "clamp(1rem, 2vw, 1.3rem)" }}
          >
            Counting down with you, {guestName} 🌸
          </p>

          {sessionRestored && (
            <button
              onClick={() => {
                localStorage.removeItem("guest_name");
                localStorage.removeItem("guest_city");
                localStorage.removeItem("invitation_seen");
                localStorage.removeItem("session_token");
                window.location.reload();
              }}
              className={`font-body text-[11px] text-white/50 underline underline-offset-4 hover:text-white/80 transition-colors ${fadeIn(5)}`}
              style={{ transitionDelay: "1000ms" }}
            >
              ↩ Replay the invitation
            </button>
          )}
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 transition-all duration-1000 ${appeared ? "opacity-60" : "opacity-0"}`}
          style={{ transitionDelay: "1200ms" }}
        >
          <span className="font-body text-[10px] tracking-widest uppercase text-white/50">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent animate-scroll-line" />
        </div>
      </section>
    </>
  );
}
