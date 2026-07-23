"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { buildGoogleCalendarUrl, buildIcsDataUrl } from "@/lib/calendar";
import { useSiteContent } from "@/lib/SiteContentContext";

const PetalScene = dynamic(() => import("@/components/webgl/PetalScene"), { ssr: false });

interface Props {
  guestName: string;
  onExplore: () => void;
}

// Stages: front → (flip) → back → (seal break + open) → card
type Stage = "front" | "back" | "card";
type FlipPhase = "idle" | "out" | "in";

const GOLD = "#D4AF37";
const ROSE = "#5a1f2e";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;
const S = 90; // seal size

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GA(0.45)})` }} />
      <span style={{ fontSize: 8, color: GA(0.6) }}>✦</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GA(0.45)}, transparent)` }} />
    </div>
  );
}

// ── Video crossfade backdrop ─────────────────────────────────────────────────
const FADE_MS = 1500;
const INTERVAL_MS = 10000;

function VideoBackdrop() {
  const [srcs, setSrcs]       = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [next, setNext]       = useState<number | null>(null);
  const refs        = useRef<(HTMLVideoElement | null)[]>([]);
  const curRef      = useRef(0);
  const fadingRef   = useRef(false);

  useEffect(() => {
    fetch("/videos/manifest.json")
      .then(r => r.json())
      .then((files: string[]) => {
        setSrcs(files.map(f => `/videos/${f}`));
      })
      .catch(() => {});
  }, []);

  const preloadVideo = useCallback((idx: number) => {
    const vid = refs.current[idx];
    if (!vid || vid.preload !== "none") return;
    vid.preload = "auto";
    vid.load();
  }, []);

  const goNext = useCallback(() => {
    if (fadingRef.current) return;
    const nxt = (curRef.current + 1) % srcs.length;
    const vid = refs.current[nxt];
    if (!vid) return;
    vid.currentTime = 0;
    vid.play().catch(() => {});
    fadingRef.current = true;
    setNext(nxt);
    setTimeout(() => {
      curRef.current = nxt;
      setCurrent(nxt);
      setNext(null);
      fadingRef.current = false;
      // Preload the video after next so it's ready in time
      preloadVideo((nxt + 1) % srcs.length);
    }, FADE_MS);
  }, [srcs, preloadVideo]);

  useEffect(() => {
    if (srcs.length === 0) return;
    refs.current[0]?.play().catch(() => {});
    // Preload video 1 after a short delay so video 0 gets bandwidth priority
    const preloadTimer = setTimeout(() => preloadVideo(1), 4000);
    const id = setInterval(goNext, INTERVAL_MS);
    return () => { clearInterval(id); clearTimeout(preloadTimer); };
  }, [srcs, goNext, preloadVideo]);

  if (srcs.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {srcs.map((src, i) => {
        const opacity = (i === current && next === null) ? 1
                      : (i === next)                    ? 1
                      : 0;
        return (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={src}
            ref={el => { refs.current[i] = el; }}
            src={src}
            muted
            playsInline
            autoPlay={i === 0}
            loop={i === 0}
            preload={i === 0 ? "auto" : "none"}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
              pointerEvents: "none",
            }}
          />
        );
      })}
      {/* Cinematic overlay — darkens edges, keeps card readable */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)",
      }} />
      {/* Subtle warm tint to harmonise with cream card */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(20,8,5,0.25) 0%, rgba(20,8,5,0.1) 50%, rgba(20,8,5,0.3) 100%)",
      }} />
    </div>
  );
}

// ── Wax seal that splits in half ────────────────────────────────────────────
function WaxSeal({ breaking }: { breaking: boolean }) {
  const half = S / 2;
  const imgBase: React.CSSProperties = {
    position: "absolute", top: 0, left: 0,
    width: S, height: S,
    objectFit: "cover", objectPosition: "center",
    display: "block", userSelect: "none", pointerEvents: "none",
  };
  return (
    <div style={{ position: "relative", width: S, height: S }}>
      {/* Left half */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wax-seal.png" alt="" draggable={false} style={{
        ...imgBase,
        clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
        transform: breaking ? `translateX(-${half + 14}px) translateY(14px) rotate(-26deg)` : "none",
        opacity: breaking ? 0 : 1,
        transition: "transform 0.58s cubic-bezier(0.3,0,0.8,1), opacity 0.42s ease 0.1s",
      }} />
      {/* Right half */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wax-seal.png" alt="" draggable={false} style={{
        ...imgBase,
        clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
        transform: breaking ? `translateX(${half + 14}px) translateY(14px) rotate(26deg)` : "none",
        opacity: breaking ? 0 : 1,
        transition: "transform 0.58s cubic-bezier(0.3,0,0.8,1), opacity 0.42s ease 0.1s",
      }} />
      {/* J & S monogram */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none", zIndex: 2,
        opacity: breaking ? 0 : 1,
        transition: "opacity 0.15s ease",
      }}>
        <span style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic", fontSize: 12,
          fontWeight: "bold", color: "rgba(45,22,0,0.45)",
          letterSpacing: 1.5, userSelect: "none",
        }}>J &amp; S</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function InvitationCard({ guestName, onExplore }: Props) {
  const [stage, setStage]             = useState<Stage>("front");
  const [flipPhase, setFlipPhase]     = useState<FlipPhase>("idle");
  const [sealBreaking, setSealBreaking] = useState(false);
  const [flapOpen, setFlapOpen]       = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [ready, setReady]             = useState(false);
  const [guestCity, setGuestCity]     = useState("");
  const [isMobile, setIsMobile]       = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { invitation } = useSiteContent();
  const couplePhotoSrc = (sz: number) => `/api/couple-photo?sz=${sz}`;

  useEffect(() => {
    setGuestCity(localStorage.getItem("guest_city") ?? "");
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Tap on front → coin-flip to reveal sealed back
  function tapFront() {
    if (stage !== "front" || flipPhase !== "idle") return;
    setFlipPhase("out");
    const t1 = setTimeout(() => { setStage("back"); setFlipPhase("in"); }, 310);
    const t2 = setTimeout(() => setFlipPhase("idle"), 640);
    timers.current.push(t1, t2);
  }

  // Tap on seal → break, open flap, card rises, full card
  function tapBack() {
    if (stage !== "back" || sealBreaking) return;
    setSealBreaking(true);
    const t1 = setTimeout(() => setFlapOpen(true), 340);
    const t2 = setTimeout(() => setCardVisible(true), 640);
    const t3 = setTimeout(() => setStage("card"), 1550);
    timers.current.push(t1, t2, t3);
  }

  function handleExplore() {
    localStorage.setItem("invitation_seen", "true");
    onExplore();
  }

  // Coin-flip scaleX values
  const flipTransform  = flipPhase === "out" ? "scaleX(0.02)" : "scaleX(1)";
  const flipTransition = flipPhase === "out" ? "transform 0.31s ease-in"
                       : flipPhase === "in"  ? "transform 0.33s ease-out"
                       : "none";

  const isBack = stage === "back";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0f0a08" }}>

      {/* Video backdrop — desktop-optimised, gracefully hides on small screens if videos absent */}
      <VideoBackdrop />

      {/* Aurora blobs — subtle warmth over video */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 520, height: 320, top: "5%", left: "-10%", background: "radial-gradient(ellipse,rgba(244,194,194,0.18) 0%,transparent 70%)", filter: "blur(60px)", animation: "aurora-1 12s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ width: 400, height: 260, top: "20%", right: "-8%", background: "radial-gradient(ellipse,rgba(139,94,131,0.14) 0%,transparent 70%)", filter: "blur(55px)", animation: "aurora-2 16s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ width: 460, height: 200, bottom: "10%", left: "20%", background: "radial-gradient(ellipse,rgba(212,175,55,0.1) 0%,transparent 70%)", filter: "blur(50px)", animation: "aurora-3 14s ease-in-out infinite" }} />
      </div>
      {/* Skip WebGL petals on mobile — video + WebGL simultaneously causes stutter */}
      {!isMobile && <PetalScene />}

      {/* ── ENVELOPE SCENE ───────────────────────────────────────────────── */}
      {stage !== "card" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0)" : "translateY(28px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          zIndex: 10, position: "relative",
        }}>
          {/* Context line */}
          <p style={{
            fontFamily: "var(--font-script), Georgia, serif", fontStyle: "italic",
            fontSize: 15, color: RA(0.75), letterSpacing: "1px",
            animation: "fade-in 0.5s ease both",
          }}>
            {stage === "front" ? "You have received a letter" : "Sealed with love"}
          </p>

          {/* Envelope + rising card container */}
          <div style={{ position: "relative", width: "min(460px, calc(100vw - 24px))" }}>

            {/* Card that rises from INSIDE envelope (z:2 < envelope z:3) */}
            <div style={{
              position: "absolute", left: "50%", bottom: 0,
              transform: cardVisible
                ? "translateX(-50%) translateY(-295px)"
                : "translateX(-50%) translateY(20px)",
              transition: "transform 0.95s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease",
              opacity: cardVisible ? 1 : 0,
              zIndex: 2, width: "90%", pointerEvents: "none",
            }}>
              <div style={{
                background: "#fffdf9", borderRadius: 10,
                boxShadow: `0 20px 60px rgba(0,0,0,0.22), 0 0 0 1px ${GA(0.2)}`,
                overflow: "hidden",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={couplePhotoSrc(600)} alt="" style={{ width: "100%", height: 130, objectFit: "cover", objectPosition: "50% 20%", display: "block" }} />
                <div style={{ padding: "10px 14px 12px", textAlign: "center" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 16, color: ROSE, margin: 0 }}>{invitation.couple_name}</p>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: RA(0.5), margin: "4px 0 0" }}>{invitation.date}</p>
                </div>
              </div>
            </div>

            {/* Perspective wrapper for 3-D flap rotation */}
            <div style={{ perspective: "900px", perspectiveOrigin: "50% 0%", position: "relative", zIndex: 3 }}>
              {/* Coin-flip container */}
              <div style={{ transform: flipTransform, transition: flipTransition }}>
                <div
                  style={{ width: "100%", aspectRatio: "1.62 / 1", position: "relative", cursor: "pointer" }}
                  onClick={stage === "front" ? tapFront : tapBack}
                >
                  {/* ── Shared envelope body ── */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "#fefaf3",
                    border: `1.5px solid ${GA(0.45)}`,
                    borderRadius: 6,
                    boxShadow: `0 22px 65px rgba(0,0,0,0.13), 0 4px 18px rgba(0,0,0,0.07)`,
                    overflow: "hidden",
                  }}>
                    {/* ── Four-flap diamond pattern (back view only) ── */}
                    {isBack && (
                      <>
                        {/* Left flap triangle */}
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                          clipPath: "polygon(0% 0%, 0% 100%, 50% 50%)",
                          background: "linear-gradient(90deg, #f5edd8 0%, #faf5ec 100%)",
                        }} />
                        {/* Right flap triangle */}
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                          clipPath: "polygon(100% 0%, 100% 100%, 50% 50%)",
                          background: "linear-gradient(-90deg, #f5edd8 0%, #faf5ec 100%)",
                        }} />
                        {/* Bottom flap triangle */}
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                          clipPath: "polygon(0% 100%, 100% 100%, 50% 50%)",
                          background: "linear-gradient(0deg, #f0e8d2 0%, #faf5ec 80%)",
                        }} />
                        {/* Fold crease lines — thin gold edges between flaps */}
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
                          background: `
                            linear-gradient(135deg, transparent 49.6%, ${GA(0.22)} 49.6%, ${GA(0.22)} 50.4%, transparent 50.4%),
                            linear-gradient(-135deg, transparent 49.6%, ${GA(0.22)} 49.6%, ${GA(0.22)} 50.4%, transparent 50.4%)
                          `,
                        }} />
                      </>
                    )}

                    {/* Front face fold lines (subtle) */}
                    {stage === "front" && (
                      <div style={{
                        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                        background: `
                          linear-gradient(135deg, transparent 49.6%, ${GA(0.09)} 49.6%, ${GA(0.09)} 50.4%, transparent 50.4%),
                          linear-gradient(-135deg, transparent 49.6%, ${GA(0.09)} 49.6%, ${GA(0.09)} 50.4%, transparent 50.4%)
                        `,
                      }} />
                    )}

                    {/* ── FRONT FACE content ── */}
                    {stage === "front" && (
                      <>
                        {/* Return address — top left */}
                        <div style={{ position: "absolute", top: 10, left: 14, zIndex: 2 }}>
                          <p style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: "#9C4A5A", margin: "0 0 3px" }}>From</p>
                          <p style={{ fontFamily: "var(--font-script), Georgia, serif", fontStyle: "italic", fontSize: 11, color: RA(0.8), margin: 0, lineHeight: 1.5 }}>
                            The family of<br />{invitation.couple_name}
                          </p>
                        </div>

                        {/* Postage stamp — top right */}
                        <div style={{
                          position: "absolute", top: 8, right: 10,
                          width: 24, height: 32,
                          border: `1px solid ${GA(0.4)}`,
                          borderRadius: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          zIndex: 2,
                        }}>
                          <span style={{ fontSize: 9, color: GA(0.65) }}>✦</span>
                        </div>

                        {/* Recipient — center */}
                        <div style={{
                          position: "absolute", inset: 0, zIndex: 2,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 5,
                        }}>
                          <p style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 10, letterSpacing: "3.5px", textTransform: "uppercase", color: "#9C4A5A", margin: 0 }}>
                            To
                          </p>
                          <p style={{ fontFamily: "var(--font-heading), Georgia, serif", fontStyle: "italic", fontSize: 26, color: ROSE, lineHeight: 1, margin: 0 }}>
                            {guestName}
                          </p>
                          {guestCity ? (
                            <p style={{ fontFamily: "var(--font-heading), Georgia, serif", fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", color: RA(0.75), margin: 0 }}>
                              {guestCity}
                            </p>
                          ) : null}
                        </div>

                        {/* Tap/click prompt — bottom */}
                        <div style={{ position: "absolute", bottom: 9, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
                          <p style={{ fontFamily: "var(--font-body), Georgia, serif", fontSize: 11, letterSpacing: "2px", color: RA(0.65), margin: 0, animation: "fade-up 0.5s ease 0.6s both" }}>
                            {isMobile ? "tap" : "click"} to open
                          </p>
                        </div>
                      </>
                    )}

                    {/* ── BACK FACE: hint text only — seal moved outside ── */}
                    {isBack && !sealBreaking && (
                      <p style={{
                        position: "absolute", bottom: 9, left: 0, right: 0, textAlign: "center",
                        fontFamily: "var(--font-body), Georgia, serif", fontStyle: "italic",
                        fontSize: 12, letterSpacing: "2px", color: RA(0.65), margin: 0, zIndex: 3,
                        animation: "fade-up 0.5s ease 0.3s both",
                      }}>
                        {isMobile ? "tap" : "click"} the seal to open
                      </p>
                    )}
                  </div>

                  {/* ── Wax seal — OUTSIDE envelope body, above flap (z:5) ── */}
                  {/* Positioned at the flap tip (top 56% = where all four flaps meet) */}
                  {isBack && (
                    <div style={{
                      position: "absolute",
                      top: "50%", left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 5,
                      filter: "drop-shadow(0 5px 16px rgba(0,0,0,0.35))",
                      pointerEvents: sealBreaking ? "none" : "auto",
                    }}>
                      <WaxSeal breaking={sealBreaking} />
                    </div>
                  )}

                  {/* ── Flap — gold triangle that rotates open (z:4, below seal z:5) ── */}
                  {isBack && (
                    <div style={{
                      position: "absolute",
                      top: -1, left: -1, right: -1,
                      height: "50%",
                      clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
                      background: "linear-gradient(175deg, #fef6e0 0%, #edd898 45%, #c8a040 100%)",
                      transformOrigin: "50% 0%",
                      transform: flapOpen ? "rotateX(-185deg)" : "rotateX(0deg)",
                      transition: "transform 0.92s cubic-bezier(0.42,0,0.18,1)",
                      backfaceVisibility: "hidden",
                      zIndex: 4,
                      pointerEvents: "none",
                      boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                    }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom cue text */}
          {stage === "front" && ready && (
            <p style={{ fontFamily: "var(--font-script), Georgia, serif", fontStyle: "italic", fontSize: 14, color: RA(0.65), animation: "fade-up 0.5s ease 0.5s both" }}>
              ✦ your letter awaits ✦
            </p>
          )}
        </div>
      )}

      {/* ── FULL INVITATION CARD ───────────────────────────────────────── */}
      {stage === "card" && (
        <div style={{
          position: "relative", zIndex: 20,
          width: "min(480px, calc(100vw - 24px))",
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto", borderRadius: 14,
          background: "#fffdf9",
          boxShadow: `0 32px 100px rgba(0,0,0,0.2), 0 0 0 1px ${GA(0.2)}`,
          animation: "card-rise 0.88s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {/* Couple photo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={couplePhotoSrc(1600)} alt="couple photo"
            style={{ width: "100%", height: 260, objectFit: "cover", objectPosition: "50% 20%", display: "block", borderRadius: "14px 14px 0 0" }} />

          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

          <div style={{ padding: "22px 20px 20px", textAlign: "center" }}>
            {/* Scripture */}
            <div style={{ animation: "blur-reveal 0.9s ease 0.05s both", marginBottom: 16 }}>
              <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: RA(0.6), lineHeight: 1.6, margin: "0 0 3px" }}>
                &ldquo;{invitation.scripture}&rdquo;
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "1.5px", color: GOLD, margin: 0 }}>
                — {invitation.scripture_ref}
              </p>
            </div>

            <Divider />

            {/* Both families */}
            <div style={{ animation: "blur-reveal 0.9s ease 0.2s both", margin: "14px 0" }}>
              <p style={{ fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 12.5, color: RA(0.8), margin: "0 0 2px", lineHeight: 1.4 }}>
                {invitation.hosts_groom}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 10, color: RA(0.4), margin: "3px 0", letterSpacing: "1px" }}>
                together with
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 12.5, color: RA(0.8), margin: 0, lineHeight: 1.4 }}>
                {invitation.hosts_bride}
              </p>
            </div>

            {/* Body text */}
            <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: RA(0.65), lineHeight: 1.7, margin: "0 0 14px", animation: "blur-reveal 0.9s ease 0.3s both" }}>
              {invitation.body}
            </p>

            {/* Couple names — hero */}
            <div style={{ animation: "blur-reveal 1s ease 0.4s both", marginBottom: 14 }}>
              <h1 style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(26px,7vw,34px)", lineHeight: 1.15,
                color: ROSE, margin: 0, fontWeight: "normal",
              }}>
                {invitation.couple_name.split(" & ")[0]}
              </h1>
              <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 16, color: GOLD, margin: "2px 0" }}>with</p>
              <h1 style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(26px,7vw,34px)", lineHeight: 1.15,
                color: ROSE, margin: 0, fontWeight: "normal",
              }}>
                {invitation.couple_name.split(" & ")[1]}
              </h1>
            </div>

            <Divider />

            {/* Date & time */}
            <div style={{ animation: "blur-reveal 0.9s ease 0.5s both", margin: "14px 0" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.5px", color: ROSE, margin: "0 0 2px", fontWeight: "bold" }}>
                {invitation.date}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: RA(0.6), margin: 0 }}>
                at {invitation.time}
              </p>
            </div>

            <Divider />

            {/* Ceremony */}
            <div style={{ animation: "blur-reveal 0.9s ease 0.6s both", margin: "14px 0", textAlign: "center" }}>
              {/* Church icon */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ display: "block", margin: "0 auto 8px" }}>
                <line x1="16" y1="1" x2="16" y2="9" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="4.5" x2="20" y2="4.5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M5 14 L16 8.5 L27 14" stroke={GOLD} strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
                <rect x="5" y="14" width="22" height="16" rx="0.5" stroke={GOLD} strokeWidth="1.3" fill="none"/>
                <path d="M12 30 L12 23 Q12 19 16 19 Q20 19 20 23 L20 30" stroke={GOLD} strokeWidth="1.1" fill="none"/>
                <rect x="7" y="16.5" width="4.5" height="4.5" rx="1" stroke={GOLD} strokeWidth="1" fill="none"/>
                <rect x="20.5" y="16.5" width="4.5" height="4.5" rx="1" stroke={GOLD} strokeWidth="1" fill="none"/>
              </svg>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: GOLD, margin: "0 0 5px" }}>
                {invitation.ceremony_label}
              </p>
              <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 15, color: ROSE, margin: "0 0 2px", lineHeight: 1.3 }}>
                {invitation.ceremony_line.split(",")[0]}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: RA(0.5), margin: "0 0 7px", lineHeight: 1.5 }}>
                {invitation.ceremony_line.split(",").slice(1).join(",").trim()}
              </p>
              <a href="https://maps.google.com/?q=St+Andrews+Kirk+Egmore+Chennai"
                 target="_blank" rel="noopener noreferrer"
                 style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", color: RA(0.42), fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 10.5, letterSpacing: "0.3px" }}>
                <svg width="9" height="12" viewBox="0 0 9 12" fill="none">
                  <path d="M4.5 0.5C2.57 0.5 1 2.07 1 4C1 6.63 4.5 11.5 4.5 11.5C4.5 11.5 8 6.63 8 4C8 2.07 6.43 0.5 4.5 0.5Z" stroke={GOLD} strokeWidth="0.9" fill={GA(0.14)}/>
                  <circle cx="4.5" cy="4" r="1.3" stroke={GOLD} strokeWidth="0.9"/>
                </svg>
                Get directions
              </a>
            </div>

            {/* "followed by" */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0", animation: "blur-reveal 0.9s ease 0.65s both" }}>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GA(0.35)})` }} />
              <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 10, color: RA(0.38), margin: 0 }}>followed by</p>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GA(0.35)}, transparent)` }} />
            </div>

            {/* Reception */}
            <div style={{ animation: "blur-reveal 0.9s ease 0.7s both", margin: "2px 0 14px", textAlign: "center" }}>
              {/* Auditorium / hall icon */}
              <svg width="34" height="28" viewBox="0 0 34 28" fill="none" style={{ display: "block", margin: "0 auto 8px" }}>
                <path d="M1 13 L17 2 L33 13" stroke={GOLD} strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
                <line x1="1" y1="13" x2="33" y2="13" stroke={GOLD} strokeWidth="0.9"/>
                <line x1="6"  y1="13" x2="6"  y2="23" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="12" y1="13" x2="12" y2="23" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="17" y1="13" x2="17" y2="23" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="22" y1="13" x2="22" y2="23" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="28" y1="13" x2="28" y2="23" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="1"  y1="23" x2="33" y2="23" stroke={GOLD} strokeWidth="1.3"/>
                <line x1="0"  y1="26" x2="34" y2="26" stroke={GOLD} strokeWidth="1"/>
              </svg>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: GOLD, margin: "0 0 5px" }}>
                {invitation.reception_label}
              </p>
              <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontSize: 15, color: ROSE, margin: "0 0 2px", lineHeight: 1.3 }}>
                {invitation.reception_line.split(",")[0]}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: RA(0.5), margin: "0 0 7px", lineHeight: 1.5 }}>
                {invitation.reception_line.split(",").slice(1).join(",").trim()}
              </p>
              <a href="https://maps.google.com/?q=BKN+Auditorium+Ritherdon+Road+Vepery+Chennai"
                 target="_blank" rel="noopener noreferrer"
                 style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", color: RA(0.42), fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 10.5, letterSpacing: "0.3px" }}>
                <svg width="9" height="12" viewBox="0 0 9 12" fill="none">
                  <path d="M4.5 0.5C2.57 0.5 1 2.07 1 4C1 6.63 4.5 11.5 4.5 11.5C4.5 11.5 8 6.63 8 4C8 2.07 6.43 0.5 4.5 0.5Z" stroke={GOLD} strokeWidth="0.9" fill={GA(0.14)}/>
                  <circle cx="4.5" cy="4" r="1.3" stroke={GOLD} strokeWidth="0.9"/>
                </svg>
                Get directions
              </a>
            </div>

            <Divider />

            {/* Closing blessing */}
            <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: RA(0.65), lineHeight: 1.7, margin: "14px 0 16px", animation: "blur-reveal 0.9s ease 0.75s both" }}>
              {invitation.presence_line}
            </p>

            {/* Save the date */}
            <div style={{ animation: "blur-reveal 0.9s ease 0.85s both", marginBottom: 14 }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: RA(0.35), marginBottom: 10 }}>
                Save the date
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                <a href={buildGoogleCalendarUrl(guestName)} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "8px 14px", borderRadius: 99, border: `1px solid ${ROSE}`, color: ROSE, fontSize: 11, textDecoration: "none", fontFamily: "Georgia, serif" }}>
                  Google Calendar
                </a>
                <a href={buildIcsDataUrl(guestName)} download="james-sharon-wedding.ics"
                  style={{ padding: "8px 14px", borderRadius: 99, border: `1px solid ${ROSE}`, color: ROSE, fontSize: 11, textDecoration: "none", fontFamily: "Georgia, serif" }}>
                  Apple / Windows
                </a>
              </div>
            </div>

            <button onClick={handleExplore}
              style={{ width: "100%", padding: "14px", background: ROSE, color: "#fef9f0", border: "none", borderRadius: 10, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", cursor: "pointer", animation: "blur-reveal 0.9s ease 0.95s both, btn-glow 2.2s ease-in-out 2s infinite" }}>
              {invitation.explore_btn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
