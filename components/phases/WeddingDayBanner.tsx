"use client";

import { useState, useEffect } from "react";
import { KIRK_STREAM_URL, BKN_STREAM_URL } from "@/lib/constants";
import Nav from "@/components/ui/Nav";
import LiveStream from "@/components/sections/LiveStream";
import CabDialog, { type CabMode } from "@/components/ui/CabDialog";
import Footer from "@/components/ui/Footer";
import Gallery from "@/components/sections/Gallery";
import Venue from "@/components/sections/Venue";
import Comments from "@/components/sections/Comments";

const GOLD = "#D4AF37";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;
const STREAM_DELAY = 4;

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

export default function WeddingDayBanner({ guestName, onViewInvitation }: Props) {
  const [cabMode, setCabMode] = useState<CabMode>(null);
  const [kirkUrl, setKirkUrl] = useState(KIRK_STREAM_URL);
  const [bknUrl, setBknUrl] = useState(BKN_STREAM_URL);
  const [appeared, setAppeared] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.youtube_ceremony_url) setKirkUrl(data.youtube_ceremony_url);
        if (data.youtube_reception_url) setBknUrl(data.youtube_reception_url);
      })
      .catch(() => {});
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

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{
          background: [
            "radial-gradient(ellipse at 30% 20%, rgba(244,194,194,0.45) 0%, transparent 55%)",
            "radial-gradient(ellipse at 70% 80%, rgba(212,175,55,0.18) 0%, transparent 50%)",
            "linear-gradient(160deg, #fdf6ec 0%, #f5ede0 60%, #f9f0e2 100%)",
          ].join(", "),
        }}
      >
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
            are getting married right now 🕊️
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
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          style={{ opacity: appeared ? 0.5 : 0, transition: "opacity 1s ease 1.5s" }}
        >
          <span className="font-body text-[10px] tracking-widest uppercase" style={{ color: RA(0.45) }}>Scroll</span>
          <div className="w-px h-10 animate-scroll-line" style={{ background: `linear-gradient(to bottom, ${RA(0.45)}, transparent)` }} />
        </div>
      </section>

      {/* ── LIVE STREAMS ─────────────────────────────────────────────────────── */}
      {hasAnyStream && (
        <section className="py-24 px-6" style={{ background: "linear-gradient(180deg, #fffdf9 0%, #fdf6ec 100%)" }}>
          <div className="max-w-4xl mx-auto flex flex-col gap-14">
            <div className="text-center">
              <p className="font-body text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: "rgba(135,168,120,0.8)" }}>
                Live coverage
              </p>
              <h2 className="font-heading text-4xl md:text-5xl text-deep-rose mb-3">Watch the Ceremony</h2>
              <p className="font-script italic text-sage text-xl">Wherever you are, you are with us 🌸</p>
            </div>
            <LiveStream url={kirkUrl} channel="St Andrews Kirk" label="Watch the ceremony live from St Andrews Kirk" delaySeconds={STREAM_DELAY} />
            <LiveStream url={bknUrl} channel="BKN Auditorium" label="Watch the reception live from BKN Auditorium" delaySeconds={STREAM_DELAY} />
          </div>
        </section>
      )}

      {!hasAnyStream && (
        <section className="py-16 px-6" style={{ background: "#fffdf9" }}>
          <div
            className="max-w-xl mx-auto flex flex-col items-center gap-5 text-center p-14 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${GA(0.25)}`,
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 40px rgba(90,31,46,0.07)",
            }}
          >
            <div style={{ fontSize: 40, animation: "pulse-glow 3s ease-in-out infinite" }}>📡</div>
            <h3 className="font-heading text-deep-rose text-xl">Live streams coming soon</h3>
            <p className="font-body text-deep-rose/60 text-sm max-w-xs leading-relaxed">
              Stream links will appear here once the media teams go live. Refresh in a few minutes.
            </p>
          </div>
        </section>
      )}

      <Venue />
      <Gallery folder="engagement" title="Engagement Gallery" />
      <Comments />
      <Footer />

      {cabMode && <CabDialog mode={cabMode} onClose={() => setCabMode(null)} />}
    </>
  );
}
