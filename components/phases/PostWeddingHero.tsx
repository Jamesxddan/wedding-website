"use client";

import { useEffect, useState } from "react";
import { HIGHLIGHTS_VIDEO_URL } from "@/lib/constants";
import Nav from "@/components/ui/Nav";
import Gallery from "@/components/sections/Gallery";
import Comments from "@/components/sections/Comments";
import Footer from "@/components/ui/Footer";

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? null;
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0] || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

const GOLD = "#D4AF37";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;

const PETALS = [
  { left: "5%",   delay: "0s",   dur: "10s",  size: 8  },
  { left: "15%",  delay: "2s",   dur: "13s",  size: 6  },
  { left: "28%",  delay: "0.7s", dur: "9s",   size: 10 },
  { left: "42%",  delay: "3.2s", dur: "11s",  size: 7  },
  { left: "55%",  delay: "1.4s", dur: "8.5s", size: 9  },
  { left: "67%",  delay: "4.1s", dur: "12s",  size: 7  },
  { left: "80%",  delay: "0.9s", dur: "10s",  size: 8  },
  { left: "90%",  delay: "2.5s", dur: "9s",   size: 6  },
  { left: "33%",  delay: "5.5s", dur: "11s",  size: 9  },
  { left: "72%",  delay: "3.8s", dur: "8s",   size: 7  },
];

const PETAL_COLORS = [
  "rgba(244,194,194,0.55)", "rgba(212,175,55,0.4)",
  "rgba(244,194,194,0.5)",  "rgba(212,175,55,0.35)",
  "rgba(181,101,118,0.4)",  "rgba(244,194,194,0.5)",
  "rgba(212,175,55,0.45)",  "rgba(244,194,194,0.6)",
  "rgba(181,101,118,0.35)", "rgba(212,175,55,0.5)",
];

interface Props { guestName: string; }

export default function PostWeddingHero({ guestName }: Props) {
  const highlightsId = HIGHLIGHTS_VIDEO_URL ? extractYoutubeId(HIGHLIGHTS_VIDEO_URL) : null;
  const [appeared, setAppeared] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 80);
    return () => clearTimeout(t);
  }, []);

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
            "radial-gradient(ellipse at 25% 25%, rgba(212,175,55,0.18) 0%, transparent 55%)",
            "radial-gradient(ellipse at 75% 70%, rgba(244,194,194,0.35) 0%, transparent 50%)",
            "radial-gradient(ellipse at 50% 50%, rgba(245,230,195,0.22) 0%, transparent 70%)",
            "linear-gradient(160deg, #fdf6ec 0%, #f5ede0 50%, #f9f0e8 100%)",
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
                transform: "rotate(45deg)",
                animation: `petal-fall ${p.dur} linear ${p.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* Gold border frame */}
        <div
          className="pointer-events-none absolute"
          style={{
            inset: 20, border: `1px solid ${GA(0.25)}`, borderRadius: 4, zIndex: 1,
            opacity: appeared ? 1 : 0, transition: "opacity 1.5s ease 0.5s",
          }}
        >
          <div style={{ position: "absolute", inset: 6, border: `1px solid ${GA(0.1)}`, borderRadius: 2 }} />
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
              boxShadow: `0 0 8px ${GA(0.5)}`,
              opacity: appeared ? 1 : 0,
              transform: appeared ? "rotate(45deg) scale(1)" : "rotate(45deg) scale(0)",
              transition: `opacity 0.5s ease ${0.3 + i * 0.1}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.1}s`,
              zIndex: 3,
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-6" style={{ maxWidth: 580 }}>

          {/* Script opening */}
          <p
            className="font-script italic"
            style={{ ...fade(0), fontSize: "clamp(1rem, 2.5vw, 1.4rem)", color: RA(0.55) }}
          >
            Dear {guestName},
          </p>

          {/* Main title with shimmer */}
          <div style={fade(200)}>
            <h1
              className="font-heading shimmer-text"
              style={{ fontSize: "clamp(2.2rem, 8vw, 5rem)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
            >
              Mr &amp; Mrs James Daniel
            </h1>
          </div>

          {/* Gold divider */}
          <div style={{ ...fade(350), display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 320 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GA(0.6)})` }} />
            <span style={{ fontSize: 9, color: GA(0.75), letterSpacing: "0.2em" }}>✦ FOREVER ✦</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GA(0.6)}, transparent)` }} />
          </div>

          {/* Script subtitle */}
          <p
            className="font-script italic"
            style={{ ...fade(500), fontSize: "clamp(1.2rem, 3vw, 1.7rem)", color: RA(0.65) }}
          >
            welcome you with joy 🌸
          </p>

          {/* Thank you message */}
          <p
            className="font-body leading-relaxed"
            style={{
              ...fade(650),
              fontSize: "clamp(13px, 1.8vw, 15px)",
              color: RA(0.58), maxWidth: 460,
              textAlign: "center",
            }}
          >
            Thank you for your presence, love, and prayers on our special day.
            Wedding photos will be uploaded here soon — come back to relive the memories with us.
          </p>

          {/* Stats row */}
          <div
            style={{ ...fade(800), display: "flex", gap: 32 }}
          >
            {[
              { value: "Oct 8", label: "The Day" },
              { value: "Chennai", label: "Home" },
              { value: "2026", label: "Year" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span
                  className="font-heading"
                  style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)", color: RA(0.82) }}
                >
                  {value}
                </span>
                <span
                  className="font-body text-[10px] tracking-[0.3em] uppercase"
                  style={{ color: RA(0.4) }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          style={{ opacity: appeared ? 0.5 : 0, transition: "opacity 1s ease 1.5s" }}
        >
          <span className="font-body text-[10px] tracking-widest uppercase" style={{ color: RA(0.4) }}>Scroll</span>
          <div className="w-px h-10 animate-scroll-line" style={{ background: `linear-gradient(to bottom, ${RA(0.4)}, transparent)` }} />
        </div>
      </section>

      {/* ── HIGHLIGHTS ────────────────────────────────────────────────────────── */}
      {highlightsId && (
        <section className="py-24 px-6" style={{ background: "#fffdf9" }}>
          <div className="max-w-3xl mx-auto flex flex-col gap-10">
            <div className="text-center">
              <p className="font-body text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: "rgba(135,168,120,0.8)" }}>
                Watch together
              </p>
              <h2 className="font-heading text-4xl md:text-5xl text-deep-rose mb-3">Wedding Highlights</h2>
              <p className="font-script italic text-sage text-xl">Relive the joy</p>
            </div>
            <div
              className="relative w-full rounded-3xl overflow-hidden"
              style={{
                paddingBottom: "56.25%",
                boxShadow: `0 24px 80px rgba(90,31,46,0.14), 0 0 0 1px ${GA(0.2)}`,
              }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${highlightsId}?rel=0`}
                title="Wedding Highlights"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {!highlightsId && (
        <section className="py-16 px-6" style={{ background: "#fffdf9" }}>
          <div
            className="max-w-xl mx-auto flex flex-col items-center gap-5 text-center p-14 rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: `1px solid ${GA(0.25)}`,
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 40px rgba(90,31,46,0.06)",
            }}
          >
            <div style={{ fontSize: 40 }}>🎬</div>
            <h3 className="font-heading text-deep-rose text-xl">Highlights coming soon</h3>
            <p className="font-body text-deep-rose/60 text-sm max-w-xs leading-relaxed">
              The wedding highlights video will appear here once it&apos;s ready. Check back soon!
            </p>
          </div>
        </section>
      )}

      <Gallery folder="wedding" title="Wedding Gallery" />
      <Comments />
      <Footer />
    </>
  );
}
