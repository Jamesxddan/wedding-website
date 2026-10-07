"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { KIRK_STREAM_URL, BKN_STREAM_URL, CEREMONY_START, RECEPTION_START } from "@/lib/constants";
import { previewStreamScene, streamSceneAt, type StreamScene } from "@/lib/stream-scene";
import Nav from "@/components/ui/Nav";
import LiveStream from "@/components/sections/LiveStream";
import CabDialog, { type CabMode } from "@/components/ui/CabDialog";
import Footer from "@/components/ui/Footer";
import Gallery from "@/components/sections/Gallery";
import Venue from "@/components/sections/Venue";
import Comments from "@/components/sections/Comments";
import { DamaskOverlay, OrnamentalFrame, ConfettiBurst } from "@/components/ui/OrnamentalMotifs";
import LiveTicker from "@/components/sections/LiveTicker";

const WeddingChatbot = dynamic(() => import("@/components/ui/WeddingChatbot"), { ssr: false });

const GOLD = "#D4AF37";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;
const STREAM_DELAY = 4;
const STREAM_FRAME = "/images/stream-frame.webp"; // James Daniel & Sharon photo frame around both live players
const STREAM_FRAME_OVERLAY = "/images/stream-frame-overlay.webp"; // same frame, window transparent (phones)

const PETALS = [
  { left: "7%",  delay: "0s",    dur: "9s",   size: 9,  rot: "45deg"  },
  { left: "18%", delay: "2.1s",  dur: "12s",  size: 7,  rot: "20deg"  },
  { left: "30%", delay: "0.8s",  dur: "10s",  size: 11, rot: "60deg"  },
  { left: "45%", delay: "3.5s",  dur: "8s",   size: 6,  rot: "135deg" },
  { left: "57%", delay: "1.2s",  dur: "11s",  size: 10, rot: "80deg"  },
  { left: "68%", delay: "4.0s",  dur: "9.5s", size: 8,  rot: "30deg"  },
  { left: "78%", delay: "0.5s",  dur: "13s",  size: 7,  rot: "100deg" },
  { left: "88%", delay: "2.8s",  dur: "10s",  size: 9,  rot: "55deg"  },
  { left: "93%", delay: "1.7s",  dur: "8.5s", size: 6,  rot: "160deg" },
  { left: "23%", delay: "5.2s",  dur: "11.5s",size: 8,  rot: "70deg"  },
  { left: "52%", delay: "6.0s",  dur: "9s",   size: 10, rot: "40deg"  },
  { left: "74%", delay: "3.0s",  dur: "12s",  size: 7,  rot: "90deg"  },
];

const PETAL_COLORS = [
  "rgba(244,194,194,0.65)",
  "rgba(212,175,55,0.45)",
  "rgba(244,194,194,0.5)",
  "rgba(212,175,55,0.35)",
  "rgba(181,101,118,0.4)",
  "rgba(244,194,194,0.6)",
  "rgba(212,175,55,0.4)",
  "rgba(244,194,194,0.55)",
  "rgba(181,101,118,0.35)",
  "rgba(212,175,55,0.5)",
  "rgba(244,194,194,0.45)",
  "rgba(181,101,118,0.4)",
];

interface Props {
  guestName: string;
  onViewInvitation?: () => void;
}

/** What's next on the day and how long until it - ceremony, then reception, then nothing. */
function nextEvent(now: number): { label: string; at: number } | null {
  if (now < CEREMONY_START.getTime()) return { label: "The ceremony begins in", at: CEREMONY_START.getTime() };
  if (now < RECEPTION_START.getTime()) return { label: "The reception begins in", at: RECEPTION_START.getTime() };
  return null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function DayCountdown({ now }: { now: number }) {
  const next = nextEvent(now);
  if (!next) return null;
  const diff = Math.max(0, next.at - now);
  const units = [
    { value: Math.floor(diff / 3_600_000), label: "Hours" },
    { value: Math.floor((diff % 3_600_000) / 60_000), label: "Minutes" },
    { value: Math.floor((diff % 60_000) / 1000), label: "Seconds" },
  ];
  return (
    <div className="flex flex-col items-center gap-3" aria-live="off">
      <p className="font-body text-[11px] tracking-[0.35em] uppercase" style={{ color: RA(0.55) }}>
        {next.label}
      </p>
      <div className="flex items-start gap-3 sm:gap-4">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-start gap-3 sm:gap-4">
            <div
              className="flex flex-col items-center"
              style={{
                width: 88, padding: "12px 0 8px", borderRadius: 12, // equal widths, whatever the label length
                background: "rgba(255,255,255,0.6)", border: `1px solid ${GA(0.35)}`,
                boxShadow: `0 6px 24px ${RA(0.08)}`, backdropFilter: "blur(8px)",
              }}
            >
              <span className="font-heading tabular-nums" style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)", lineHeight: 1, color: RA(0.85) }}>
                {pad2(u.value)}
              </span>
              <span className="font-body text-[9.5px] tracking-[0.2em] uppercase mt-2" style={{ color: RA(0.45) }}>
                {u.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="font-heading" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", color: GA(0.7), paddingTop: 10 }}>:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeddingDayBanner({ guestName, onViewInvitation }: Props) {
  const [cabMode, setCabMode] = useState<CabMode>(null);
  const [kirkUrl, setKirkUrl] = useState(KIRK_STREAM_URL);
  const [bknUrl, setBknUrl] = useState(BKN_STREAM_URL);
  const [appeared, setAppeared] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  // null until mounted: the clock only runs in the browser, so server and client HTML match (no hydration error)
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Live-stream layout by time of day, unless the owner is previewing a later scene from the gear menu.
  const [previewScene, setPreviewScene] = useState<StreamScene | null>(null);
  useEffect(() => { setPreviewScene(previewStreamScene()); }, []);
  const scene: StreamScene = previewScene ?? (now === null ? "ceremony" : streamSceneAt(now));

  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 80);
    const c = setTimeout(() => setConfetti(true), 500);
    return () => { clearTimeout(t); clearTimeout(c); };
  }, []);

  useEffect(() => {
    const load = () =>
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data: Record<string, string>) => {
          if (data.youtube_ceremony_url) setKirkUrl(data.youtube_ceremony_url);
          if (data.youtube_reception_url) setBknUrl(data.youtube_reception_url);
          setChatbotEnabled(data.chatbot_enabled === "true");
        })
        .catch(() => {});
    load();
    // Re-check every minute so a stream link pasted in admin replaces the "starts at 4:30" note
    // on pages guests already have open, without them refreshing.
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const hasAnyStream = !!kirkUrl || !!bknUrl;

  const fade = (delayMs: number): React.CSSProperties => ({
    opacity: appeared ? 1 : 0,
    transform: appeared ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.9s ease ${delayMs}ms, transform 0.9s cubic-bezier(0.22,1,0.36,1) ${delayMs}ms`,
  });

  return (
    <>
      <Nav />
      <ConfettiBurst active={confetti} onDone={() => setConfetti(false)} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{
          // keeps the content clear of the fixed top menu and of the "Scroll" hint at the bottom
          paddingTop: 104, paddingBottom: 136,
          background: [
            "radial-gradient(ellipse at 30% 20%, rgba(244,194,194,0.45) 0%, transparent 55%)",
            "radial-gradient(ellipse at 70% 80%, rgba(212,175,55,0.18) 0%, transparent 50%)",
            "linear-gradient(160deg, #fdf6ec 0%, #f5ede0 60%, #f9f0e2 100%)",
          ].join(", "),
        }}
      >
        <DamaskOverlay opacity={0.035} />

        {/* Floating petals */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {PETALS.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute", top: "-14px", left: p.left,
                width: p.size, height: p.size,
                background: PETAL_COLORS[i],
                borderRadius: "50% 0 50% 0",
                transform: `rotate(${p.rot})`,
                animation: `petal-fall ${p.dur} linear ${p.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* Gold border frame */}
        <div
          className="pointer-events-none absolute"
          style={{
            inset: 20, border: `1px solid ${GA(0.3)}`, borderRadius: 4, zIndex: 1,
            opacity: appeared ? 1 : 0, transition: "opacity 1.5s ease 0.4s",
          }}
        >
          <div style={{ position: "absolute", inset: 6, border: `1px solid ${GA(0.12)}`, borderRadius: 2 }} />
        </div>

        {/* Corner gems */}
        {[
          { top: 22, left: 22 }, { top: 22, right: 22 },
          { bottom: 22, left: 22 }, { bottom: 22, right: 22 },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              ...pos, width: 7, height: 7, background: GOLD,
              boxShadow: `0 0 8px ${GA(0.55)}`,
              opacity: appeared ? 1 : 0,
              transform: appeared ? "rotate(45deg) scale(1)" : "rotate(45deg) scale(0)",
              transition: `opacity 0.5s ease ${0.2 + i * 0.1}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.2 + i * 0.1}s`,
              zIndex: 3,
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6" style={{ maxWidth: 600 }}>

          {/* Eyebrow */}
          <div style={fade(0)}>
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 1, background: `linear-gradient(90deg, transparent, ${GA(0.6)})` }} />
              <p className="font-body text-[11px] tracking-[0.42em] uppercase" style={{ color: RA(0.5) }}>
                Today is the day
              </p>
              <div style={{ width: 40, height: 1, background: `linear-gradient(90deg, ${GA(0.6)}, transparent)` }} />
            </div>
          </div>

          {/* Couple names with shimmer */}
          <div style={fade(150)}>
            <h1
              className="font-heading shimmer-text"
              style={{ fontSize: "clamp(2.8rem, 10vw, 6rem)", lineHeight: 1.05, letterSpacing: "-0.01em" }}
            >
              James &amp; Sharon
            </h1>
          </div>

          {/* Script subtitle */}
          <p
            className="font-script italic"
            style={{ ...fade(300), fontSize: "clamp(1.2rem, 3vw, 1.8rem)", color: RA(0.72) }}
          >
            are getting married today 🕊️
          </p>

          {/* Date pill */}
          <div
            style={{
              ...fade(450),
              padding: "8px 24px", borderRadius: 99,
              background: "rgba(255,255,255,0.55)",
              border: `1px solid ${GA(0.3)}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="font-heading text-[13px] tracking-[0.35em] uppercase" style={{ color: RA(0.7) }}>
              October 8th &nbsp;·&nbsp; 2026 &nbsp;·&nbsp; Chennai
            </p>
          </div>

          {/* Live countdown: to the 4:30 PM ceremony, then to the 7 PM reception, then hidden */}
          <div style={fade(520)}>
            {now !== null && <DayCountdown now={now} />}
          </div>

          {/* Personal greeting */}
          <p
            className="font-script italic"
            style={{ ...fade(600), fontSize: "clamp(1rem, 2.2vw, 1.3rem)", color: RA(0.6) }}
          >
            Dear {guestName}, we are so glad you are with us today ✨
          </p>

          {/* Cab booking */}
          <div style={{ ...fade(750), width: "100%" }}>
            <p
              className="font-body text-[12px] mb-4"
              style={{ color: RA(0.42), fontStyle: "italic", letterSpacing: "0.02em" }}
            >
              Need a ride? We&apos;ve got you covered
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                aria-label="Get a ride to the venue"
                onClick={() => setCabMode("to-venue")}
                className="font-heading tracking-widest uppercase text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  padding: "10px 20px", borderRadius: 99,
                  background: RA(0.88), color: "#fef9f0",
                  boxShadow: `0 4px 20px ${RA(0.25)}`,
                  border: "none", cursor: "pointer",
                }}
              >
                Ride to venue
              </button>
              <button
                aria-label="Book a ride between ceremony and reception"
                onClick={() => setCabMode("ceremony-to-reception")}
                className="font-heading tracking-widest uppercase text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  padding: "10px 20px", borderRadius: 99,
                  background: "rgba(135,168,120,0.12)",
                  border: "1px solid rgba(135,168,120,0.5)",
                  color: "#5a7a52",
                  backdropFilter: "blur(6px)", cursor: "pointer",
                }}
              >
                Ceremony → Reception
              </button>
              <button
                aria-label="Book a ride home"
                onClick={() => setCabMode("home")}
                className="font-heading tracking-widest uppercase text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  padding: "10px 20px", borderRadius: 99,
                  background: "rgba(255,255,255,0.45)",
                  border: `1px solid ${GA(0.4)}`,
                  color: RA(0.65),
                  backdropFilter: "blur(6px)", cursor: "pointer",
                }}
              >
                Ride home
              </button>
            </div>
          </div>

          {onViewInvitation && (
            <button
              onClick={onViewInvitation}
              className="font-body text-[13px] font-medium tracking-widest transition-all duration-200 hover:opacity-80"
              style={{
                ...fade(900),
                padding: "8px 22px", borderRadius: 99,
                border: `1px solid ${RA(0.2)}`,
                color: RA(0.5),
                background: "rgba(255,255,255,0.3)",
                backdropFilter: "blur(4px)", cursor: "pointer",
              }}
            >
              💌 View the Invitation
            </button>
          )}
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute z-10 flex flex-col items-center gap-2"
          // positioned inline: the bottom-10 / -translate-x-1/2 utility classes aren't generated in this build,
          // which left the hint floating mid-hero on top of the date pill
          style={{ bottom: 40, left: "50%", transform: "translateX(-50%)", opacity: appeared ? 0.5 : 0, transition: "opacity 1s ease 1.5s" }}
        >
          <span className="font-body text-[10px] tracking-widest uppercase" style={{ color: RA(0.45) }}>Scroll</span>
          <div className="w-px h-10 animate-scroll-line" style={{ background: `linear-gradient(to bottom, ${RA(0.45)}, transparent)` }} />
        </div>
      </section>

      <LiveTicker />

      {/* ── LIVE STREAMS ─────────────────────────────────────────────────────── */}
      {hasAnyStream && (
        <section className="relative py-24 overflow-hidden" style={{ paddingLeft: "clamp(8px, 4vw, 24px)", paddingRight: "clamp(8px, 4vw, 24px)", background: "linear-gradient(180deg, #fffdf9 0%, #fdf6ec 100%)" }}>
          <DamaskOverlay opacity={0.03} />
          <div className="relative max-w-4xl mx-auto flex flex-col gap-16">
            {/* Layout by time (lib/stream-scene.ts): ceremony → reception-soon note at 5:45 PM →
                reception live on top + ceremony replay below at 6:30 PM */}
            {scene === "reception_live" ? (
              <>
                <div className="text-center">
                  <p className="font-body text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: RA(0.75) }}>
                    Live now · Wedding Reception
                  </p>
                  <h2 className="font-heading text-4xl md:text-5xl text-deep-rose mb-3">Click below to see the live</h2>
                  <p className="font-script italic text-sage text-xl">Celebrate with Mr &amp; Mrs James, wherever you are 🥂</p>
                </div>
                <OrnamentalFrame hangingRing padding={6}>
                  <div style={{ padding: "clamp(6px, 3vw, 26px) clamp(6px, 3vw, 26px) clamp(6px, 3vw, 22px)" }}>
                    <LiveStream url={bknUrl} channel="BKN Auditorium" label="Watch the reception live from BKN Auditorium" delaySeconds={STREAM_DELAY} frameSrc={STREAM_FRAME} frameOverlaySrc={STREAM_FRAME_OVERLAY} />
                  </div>
                </OrnamentalFrame>
                <div className="text-center">
                  <p className="font-body text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: RA(0.75) }}>
                    Replay
                  </p>
                  <h2 className="font-heading text-3xl md:text-4xl text-deep-rose">
                    Check out the replay of the Wedding Ceremony of James with Sharon
                  </h2>
                </div>
                <OrnamentalFrame hangingRing padding={6}>
                  <div style={{ padding: "clamp(6px, 3vw, 26px) clamp(6px, 3vw, 26px) clamp(6px, 3vw, 22px)" }}>
                    <LiveStream url={kirkUrl} channel="St Andrews Kirk" label="The Holy Matrimony at St Andrews Kirk" delaySeconds={STREAM_DELAY} frameSrc={STREAM_FRAME} frameOverlaySrc={STREAM_FRAME_OVERLAY} comingSoon="The ceremony replay will appear here soon" />
                  </div>
                </OrnamentalFrame>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="font-body text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: RA(0.75) }}>
                    Live coverage
                  </p>
                  <h2 className="font-heading text-4xl md:text-5xl text-deep-rose mb-3">Watch the Ceremony</h2>
                  <p className="font-script italic text-sage text-xl">Wherever you are, you are with us 🌸</p>
                </div>
                <OrnamentalFrame hangingRing padding={6}>
                  <div style={{ padding: "clamp(6px, 3vw, 26px) clamp(6px, 3vw, 26px) clamp(6px, 3vw, 22px)" }}>
                    <LiveStream url={kirkUrl} channel="St Andrews Kirk" label="Watch the ceremony live from St Andrews Kirk" delaySeconds={STREAM_DELAY} frameSrc={STREAM_FRAME} frameOverlaySrc={STREAM_FRAME_OVERLAY} comingSoon="The live stream will start at 4:30 PM" />
                  </div>
                </OrnamentalFrame>
                {/* Reception player stays hidden until 6:30 PM; from 5:45 PM a "starting soon" note shows instead */}
                {scene === "reception_soon" && (
                  <OrnamentalFrame hangingRing padding={6}>
                    <div className="flex flex-col items-center gap-4 text-center py-12 px-8">
                      <div style={{ fontSize: 40, animation: "pulse-glow 3s ease-in-out infinite" }}>🥂</div>
                      <h3 className="font-heading text-deep-rose text-2xl md:text-3xl">
                        The reception of Mr &amp; Mrs James will start soon
                      </h3>
                      <p className="font-script italic text-sage text-lg">
                        Stay right here — the live stream from BKN Auditorium will appear on this page ✨
                      </p>
                    </div>
                  </OrnamentalFrame>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {!hasAnyStream && (
        <section className="py-16 px-6" style={{ background: "#fffdf9" }}>
          <div className="max-w-xl mx-auto">
            <OrnamentalFrame hangingRing padding={6}>
              <div className="flex flex-col items-center gap-5 text-center py-14 px-10">
                <div style={{ fontSize: 40, animation: "pulse-glow 3s ease-in-out infinite" }}>📡</div>
                <h3 className="font-heading text-deep-rose text-xl">Live streams coming soon</h3>
                <p className="font-body text-deep-rose/60 text-sm max-w-xs leading-relaxed">
                  Stream links will appear here once the media teams go live. Refresh in a few minutes.
                </p>
              </div>
            </OrnamentalFrame>
          </div>
        </section>
      )}

      <Venue />
      <Gallery folder="wedding" title="Wedding Day Gallery" />
      <Gallery folder="engagement" title="Engagement Gallery" />
      <Comments />
      <Footer />

      {cabMode && <CabDialog mode={cabMode} onClose={() => setCabMode(null)} />}
      <WeddingChatbot enabled={chatbotEnabled} />
    </>
  );
}
