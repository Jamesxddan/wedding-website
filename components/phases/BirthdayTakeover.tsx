"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BIRTHDAY_AGE, useIsBirthday } from "@/lib/birthday";

// ─────────────────────────────────────────────────────────────────────────────
// James's birthday takeover (16 Oct only - see lib/birthday.ts).
//   1. Hero: confetti blast on arrival + on every tap, giant "29", photo, twin line,
//      Sharon's note, "Send a birthday wish" (→ Wall of Love) and a birthday tune.
//   2. Cake with 29 candles: tap the cake, or blow into the mic, to put them out;
//      the last one sets off a huge blast.
// ─────────────────────────────────────────────────────────────────────────────

// Sharon's message comes from the admin panel (setting "birthday_sharon_note", super admins only).
// SHARON_NOTE_FALLBACK is the note she emailed on 16 Oct - shown while the setting is empty.
const SHARON_NOTE_FALLBACK = `My dear lovely husband ,
A very Happy birthday to you 🥳
I love you so much and Praise God for having me paired with a person who can understand me so well even before I say anything.
Can’t wait to share many more birthdays with you .Love you ammu ❤️.I will always support you and stay with you in all the circumstances of life🫂`;

const GOLD = "#D4AF37";
const CANDLES = BIRTHDAY_AGE;
const COLORS = ["#D4AF37", "#f5d77a", "#ff9ec4", "#f472b6", "#ffffff", "#c084fc", "#80d4ff", "#ff6b6b", "#4dd0b0"];

// ── confetti engine (canvas, no dependency) ─────────────────────────────────
type Piece = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; color: string; round: boolean; life: number };

function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pieces = useRef<Piece[]>([]);
  const raf = useRef(0);

  const loop = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) { raf.current = 0; return; }
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== window.innerWidth * dpr || c.height !== window.innerHeight * dpr) {
      c.width = window.innerWidth * dpr; c.height = window.innerHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const H = window.innerHeight;
    pieces.current = pieces.current.filter((p) => p.y < H + 30 && p.life > 0);
    for (const p of pieces.current) {
      p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
      ctx.restore();
    }
    raf.current = pieces.current.length ? requestAnimationFrame(loop) : 0;
  }, []);

  const start = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(loop); }, [loop]);

  /** burst from (x,y) towards `angle` (radians, -PI/2 = straight up) */
  const burst = useCallback((x: number, y: number, count: number, angle = -Math.PI / 2, spread = Math.PI / 2, speed = 14) => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const n = reduce ? Math.ceil(count / 4) : count;
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.45 + Math.random() * 0.75);
      pieces.current.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 7, h: 8 + Math.random() * 8,
        color: COLORS[(Math.random() * COLORS.length) | 0], round: Math.random() < 0.3, life: 220 + Math.random() * 120,
      });
    }
    start();
  }, [start]);

  /** the big one: both bottom corners + a shower from the top */
  const blast = useCallback(() => {
    const W = window.innerWidth, H = window.innerHeight;
    burst(0, H, 90, -Math.PI / 3, Math.PI / 4, 22);
    burst(W, H, 90, (-2 * Math.PI) / 3, Math.PI / 4, 22);
    for (let i = 0; i < 6; i++) burst(Math.random() * W, -10, 12, Math.PI / 2, Math.PI / 3, 4);
  }, [burst]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { canvasRef, burst, blast };
}

// ── Happy Birthday tune (public-domain melody, synthesised with WebAudio) ──
const NOTES: [number, number][] = [
  [392, 0.75], [392, 0.25], [440, 1], [392, 1], [523.25, 1], [493.88, 2],
  [392, 0.75], [392, 0.25], [440, 1], [392, 1], [587.33, 1], [523.25, 2],
  [392, 0.75], [392, 0.25], [783.99, 1], [659.25, 1], [523.25, 1], [493.88, 1], [440, 2],
  [698.46, 0.75], [698.46, 0.25], [659.25, 1], [523.25, 1], [587.33, 1], [523.25, 2.5],
];
function playTune(): () => void {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  const beat = 0.42;
  let t = ac.currentTime + 0.05;
  for (const [f, d] of NOTES) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d * beat * 0.95);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + d * beat);
    t += d * beat;
  }
  const total = (t - ac.currentTime) * 1000;
  const timer = setTimeout(() => ac.close(), total + 200);
  return () => { clearTimeout(timer); ac.close().catch(() => {}); };
}

export default function BirthdayTakeover({ guestName }: { guestName?: string }) {
  const isBirthday = useIsBirthday();
  const [sharonNote, setSharonNote] = useState(SHARON_NOTE_FALLBACK);
  useEffect(() => {
    if (!isBirthday) return;
    const load = () =>
      fetch("/api/settings")
        .then((r) => (r.ok ? r.json() : {}))
        .then((s: Record<string, string>) => setSharonNote((s.birthday_sharon_note ?? "").trim() || SHARON_NOTE_FALLBACK))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000); // her edits show up without a reload
    return () => clearInterval(id);
  }, [isBirthday]);
  const { canvasRef, burst, blast } = useConfetti();
  const [playing, setPlaying] = useState(false);
  const stopTune = useRef<null | (() => void)>(null);

  // candles
  const [lit, setLit] = useState<boolean[]>(() => Array(CANDLES).fill(true));
  const [smoke, setSmoke] = useState<number[]>([]);
  const litCount = lit.filter(Boolean).length;
  const [allOut, setAllOut] = useState(false);
  const [mic, setMic] = useState<"off" | "on" | "denied">("off");
  const [level, setLevel] = useState(0);
  const micRef = useRef<{ stream: MediaStream; ac: AudioContext; raf: number } | null>(null);
  const cakeRef = useRef<HTMLDivElement>(null);

  // arrival blast (twice)
  useEffect(() => {
    if (!isBirthday) return;
    const a = setTimeout(blast, 400);
    const b = setTimeout(blast, 1700);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [isBirthday, blast]);

  const stopMic = useCallback(() => {
    const m = micRef.current;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    m.stream.getTracks().forEach((t) => t.stop());
    m.ac.close().catch(() => {});
    micRef.current = null;
    setMic("off"); setLevel(0);
  }, []);
  useEffect(() => () => { stopMic(); stopTune.current?.(); }, [stopMic]);

  const litRef = useRef(lit);
  litRef.current = lit;
  const blowOut = useCallback((n: number) => {
    const prev = litRef.current;
    const idx = prev.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return;
    const next = [...prev];
    const gone: number[] = [];
    for (let k = 0; k < n && idx.length; k++) {
      const i = idx.splice((Math.random() * idx.length) | 0, 1)[0];
      next[i] = false; gone.push(i);
    }
    litRef.current = next;
    setLit(next);
    setSmoke((s) => [...s, ...gone]);
    setTimeout(() => setSmoke((s) => s.filter((i) => !gone.includes(i))), 1400);
  }, []);

  // last candle out -> the big finale
  useEffect(() => {
    if (litCount === 0 && !allOut) {
      setAllOut(true);
      stopMic();
      const r = cakeRef.current?.getBoundingClientRect();
      if (r) burst(r.left + r.width / 2, r.top + r.height / 3, 160, -Math.PI / 2, Math.PI * 0.9, 18);
      setTimeout(blast, 300); setTimeout(blast, 1300);
    }
  }, [litCount, allOut, stopMic, burst, blast]);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      const an = ac.createAnalyser(); an.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      let last = 0;
      const tick = () => {
        an.getFloatTimeDomainData(buf);
        let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        const rms = Math.sqrt(s / buf.length);
        setLevel(Math.min(1, rms * 4));
        const now = performance.now();
        if (rms > 0.09 && now - last > 110) { last = now; blowOut(rms > 0.25 ? 3 : 1); } // a blow is loud, broadband noise
        if (micRef.current) micRef.current.raf = requestAnimationFrame(tick);
      };
      micRef.current = { stream, ac, raf: 0 };
      setMic("on");
      tick();
    } catch {
      setMic("denied");
    }
  };

  const relight = () => { setLit(Array(CANDLES).fill(true)); setAllOut(false); setSmoke([]); };

  const toggleTune = () => {
    if (playing) { stopTune.current?.(); stopTune.current = null; setPlaying(false); return; }
    stopTune.current = playTune(); setPlaying(true);
    setTimeout(() => setPlaying(false), 15000);
  };

  // New visitors (registration form below) have no Wall of Love yet - take them to the form instead.
  const toWall = () =>
    (document.getElementById("wall-of-love") ?? document.getElementById("birthday-cake")?.nextElementSibling)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (!isBirthday) return null;

  // candle layout: back row 15, front row 14
  const back = Array.from({ length: 15 }, (_, i) => i);
  const front = Array.from({ length: CANDLES - 15 }, (_, i) => i + 15);
  const candle = (i: number) => (
    <div key={i} style={{ position: "relative", width: 9, height: 34, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      {lit[i] && <span className="bday-flame" style={{ animationDelay: `${(i % 7) * 0.13}s` }} />}
      {smoke.includes(i) && <span className="bday-smoke" />}
      <span style={{ width: 7, height: 24, borderRadius: 2, background: i % 3 === 0 ? "repeating-linear-gradient(135deg,#fff 0 4px,#f472b6 4px 8px)" : i % 3 === 1 ? "repeating-linear-gradient(135deg,#fff 0 4px,#D4AF37 4px 8px)" : "repeating-linear-gradient(135deg,#fff 0 4px,#80d4ff 4px 8px)" }} />
    </div>
  );

  return (
    <>
      <canvas ref={canvasRef} aria-hidden style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 60 }} />

      {/* ── HERO ── */}
      <section
        id="birthday-takeover"
        onPointerDown={(e) => burst(e.clientX, e.clientY, 45, -Math.PI / 2, Math.PI * 1.2, 11)}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{
          paddingTop: 104, paddingBottom: 96, cursor: "pointer",
          background: [
            "radial-gradient(ellipse at 20% 15%, rgba(212,175,55,0.28) 0%, transparent 50%)",
            "radial-gradient(ellipse at 85% 85%, rgba(244,114,182,0.22) 0%, transparent 55%)",
            "linear-gradient(160deg, #2a0a14 0%, #5a1f2e 55%, #7a3048 100%)",
          ].join(", "),
        }}
      >
        <div className="relative z-10 flex flex-col items-center" style={{ maxWidth: 640, gap: 18 }}>
          <p className="font-body text-[11px] tracking-[0.45em] uppercase" style={{ color: "rgba(253,246,236,0.65)" }}>
            16 · October · 2026
          </p>
          <div
            className="font-heading bday-pop"
            style={{
              fontSize: "clamp(6rem, 26vw, 11rem)", lineHeight: 0.9, fontWeight: 700,
              color: "#f5d77a",
              textShadow: "0 2px 0 #a87f1f, 0 0 40px rgba(245,215,122,0.55), 0 0 90px rgba(212,175,55,0.35)",
            }}
          >
            {BIRTHDAY_AGE}
          </div>
          <h1 className="font-heading" style={{ color: "#fdf6ec", fontSize: "clamp(2rem, 7vw, 3.6rem)", lineHeight: 1.1, margin: 0 }}>
            Happy Birthday, James! 🎂
          </h1>
          <p className="font-script italic" style={{ color: "#f5d77a", fontSize: "clamp(1.2rem, 3.4vw, 1.8rem)", margin: 0 }}>
            His first birthday as a married man 💍
          </p>

          {/* photo in a gold ring */}
          <div style={{ position: "relative", margin: "8px 0" }}>
            <div className="bday-ring" style={{ width: 168, height: 168, borderRadius: "50%", padding: 5, background: `conic-gradient(${GOLD}, #fff3c4, #f472b6, ${GOLD})` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/james-profile.jpg" alt="James" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "4px solid #2a0a14" }} />
            </div>
            <span style={{ position: "absolute", top: -6, right: -8, fontSize: 34 }} aria-hidden>🥳</span>
          </div>

          <p className="font-body" style={{ color: "rgba(253,246,236,0.75)", fontSize: 14, margin: 0 }}>
            …and a very happy birthday to his twin, <strong style={{ color: "#fdf6ec" }}>John Jebasingh</strong>! 🎉
          </p>

          {sharonNote && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                marginTop: 6, maxWidth: 520, padding: "18px 22px", borderRadius: 16, cursor: "default", textAlign: "left",
                background: "rgba(253,246,236,0.08)", border: "1px solid rgba(212,175,55,0.45)", backdropFilter: "blur(6px)",
              }}
            >
              <p className="font-body" style={{ color: GOLD, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 8px" }}>
                From your wife, Sharon 💕
              </p>
              <p className="font-script italic" style={{ color: "#fdf6ec", fontSize: "1.15rem", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                {sharonNote}
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center" style={{ gap: 12, marginTop: 8 }} onPointerDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => { toWall(); }}
              className="font-heading"
              style={{ padding: "12px 24px", borderRadius: 999, border: "none", cursor: "pointer", background: GOLD, color: "#2a0a14", fontSize: 13, letterSpacing: "0.12em", fontWeight: 700, boxShadow: "0 8px 30px rgba(212,175,55,0.35)" }}
            >
              Send a birthday wish 💌
            </button>
            <button
              onClick={toggleTune}
              className="font-heading"
              style={{ padding: "12px 22px", borderRadius: 999, cursor: "pointer", background: "transparent", color: "#fdf6ec", border: "1px solid rgba(253,246,236,0.45)", fontSize: 13, letterSpacing: "0.1em" }}
            >
              {playing ? "⏸ Stop the tune" : "🎵 Play birthday tune"}
            </button>
          </div>
          <p className="font-body" style={{ color: "rgba(253,246,236,0.5)", fontSize: 12, margin: 0 }}>
            Tap anywhere for more confetti 🎉 {guestName && guestName !== "Friend" ? `· thanks for celebrating, ${guestName.split(" ")[0]}!` : ""}
          </p>
        </div>
        <a
          href="#birthday-cake"
          onPointerDown={(e) => e.stopPropagation()}
          className="font-body"
          style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", color: "rgba(253,246,236,0.6)", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", textDecoration: "none" }}
        >
          Blow out the candles ↓
        </a>
      </section>

      {/* ── CAKE & 29 CANDLES ── */}
      <section id="birthday-cake" className="relative px-6 text-center" style={{ paddingTop: 72, paddingBottom: 80, background: "linear-gradient(180deg,#fdf6ec 0%,#f9ece0 100%)" }}>
        <p className="font-body text-[11px] tracking-[0.4em] uppercase" style={{ color: "rgba(90,31,46,0.6)", margin: "0 0 10px" }}>Make a wish</p>
        <h2 className="font-heading" style={{ color: "#5a1f2e", fontSize: "clamp(1.8rem, 5.5vw, 2.8rem)", margin: "0 0 8px" }}>
          Help James blow out his {CANDLES} candles 🕯️
        </h2>
        <p className="font-script italic" style={{ color: "#87A878", fontSize: "1.2rem", margin: "0 0 28px" }}>
          {allOut ? "All out! Make a wish, James ✨" : `${litCount} candle${litCount === 1 ? "" : "s"} still burning — tap the cake or blow into your mic`}
        </p>

        {/* cake */}
        <div
          ref={cakeRef}
          onClick={() => blowOut(3)}
          role="button"
          aria-label="Tap to blow out candles"
          style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", cursor: "pointer", userSelect: "none", maxWidth: "100%" }}
        >
          <div style={{ display: "flex", gap: "clamp(4px, 1.4vw, 10px)", marginBottom: 6, zIndex: 2 }}>{back.map(candle)}</div>
          <div style={{ display: "flex", gap: "clamp(4px, 1.4vw, 10px)", marginBottom: -4, zIndex: 3, paddingLeft: 10 }}>{front.map(candle)}</div>
          <div style={{ width: "min(340px, 86vw)", height: 70, borderRadius: "14px 14px 6px 6px", background: "linear-gradient(180deg,#fff7fb 0%,#ffd6e7 100%)", boxShadow: "inset 0 -10px 0 rgba(244,114,182,0.25)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, borderRadius: "14px 14px 0 0", background: "repeating-radial-gradient(circle at 14px 0, #ffffff 0 10px, transparent 10px 28px)" }} />
            <p className="font-script italic" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#b56576", fontSize: "1.25rem", margin: 0, paddingTop: 10 }}>Happy {CANDLES}th, James</p>
          </div>
          <div style={{ width: "min(400px, 94vw)", height: 84, borderRadius: "10px 10px 6px 6px", background: "linear-gradient(180deg,#7a3048 0%,#5a1f2e 100%)", boxShadow: "inset 0 10px 0 rgba(212,175,55,0.35)", marginTop: -2 }} />
          <div style={{ width: "min(460px, 98vw)", height: 14, borderRadius: 999, background: "linear-gradient(180deg,#e9d6b8,#cdb48c)", marginTop: 2 }} />
        </div>

        {/* mic controls */}
        <div className="flex flex-col items-center" style={{ gap: 10, marginTop: 28 }}>
          {!allOut && mic !== "on" && (
            <button
              onClick={startMic}
              className="font-heading"
              style={{ padding: "12px 24px", borderRadius: 999, border: "none", cursor: "pointer", background: "#5a1f2e", color: "#fdf6ec", fontSize: 13, letterSpacing: "0.1em", boxShadow: "0 8px 26px rgba(90,31,46,0.3)" }}
            >
              🎤 Blow with your mic
            </button>
          )}
          {mic === "on" && !allOut && (
            <>
              <p className="font-body" style={{ color: "#5a1f2e", fontSize: 14, margin: 0 }}>Listening… now blow! 🌬️</p>
              <div style={{ width: 200, height: 8, borderRadius: 999, background: "rgba(90,31,46,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${Math.round(level * 100)}%`, height: "100%", background: `linear-gradient(90deg,${GOLD},#f472b6)`, transition: "width 80ms linear" }} />
              </div>
              <button onClick={stopMic} className="font-body" style={{ background: "none", border: "none", color: "rgba(90,31,46,0.55)", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                stop using the mic
              </button>
            </>
          )}
          {mic === "denied" && <p className="font-body" style={{ color: "rgba(90,31,46,0.65)", fontSize: 13, margin: 0 }}>No mic access — just tap the cake instead 🎂</p>}
          {allOut && (
            <div className="flex flex-wrap justify-center" style={{ gap: 12 }}>
              <button onClick={toWall} className="font-heading" style={{ padding: "12px 24px", borderRadius: 999, border: "none", cursor: "pointer", background: GOLD, color: "#2a0a14", fontSize: 13, letterSpacing: "0.12em", fontWeight: 700 }}>
                Send a birthday wish 💌
              </button>
              <button onClick={relight} className="font-heading" style={{ padding: "12px 22px", borderRadius: 999, cursor: "pointer", background: "transparent", color: "#5a1f2e", border: "1px solid rgba(90,31,46,0.35)", fontSize: 13 }}>
                🕯️ Light them again
              </button>
            </div>
          )}
        </div>
      </section>

      <style>{`
        .bday-flame { position:absolute; top:-12px; width:10px; height:16px; border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;
          background: radial-gradient(circle at 50% 70%, #fff7c2 0%, #ffd34d 40%, #ff8a1f 75%, rgba(255,80,0,0) 100%);
          box-shadow: 0 0 10px 3px rgba(255,190,60,0.55); animation: bday-flicker 0.6s ease-in-out infinite alternate; transform-origin: 50% 90%; }
        @keyframes bday-flicker { 0% { transform: scale(1,1) rotate(-3deg); } 50% { transform: scale(0.92,1.08) rotate(2deg); } 100% { transform: scale(1.05,0.95) rotate(-1deg); } }
        .bday-smoke { position:absolute; top:-14px; width:8px; height:8px; border-radius:50%; background: rgba(140,140,140,0.55); animation: bday-smoke 1.3s ease-out forwards; }
        @keyframes bday-smoke { from { opacity: .8; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-34px) scale(2.6); } }
        .bday-pop { animation: bday-pop 0.9s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes bday-pop { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
        .bday-ring { animation: bday-spin 8s linear infinite; }
        .bday-ring img { animation: bday-spin 8s linear infinite reverse; }
        @keyframes bday-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .bday-ring, .bday-ring img, .bday-flame { animation: none; } }
      `}</style>
    </>
  );
}
