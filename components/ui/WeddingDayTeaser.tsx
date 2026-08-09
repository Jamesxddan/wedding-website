"use client";

import { useEffect, useState } from "react";
import { buildGoogleCalendarUrl, buildIcsDataUrl } from "@/lib/calendar";

const GOLD = "#D4AF37";
const ROSE = "#5a1f2e";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;

interface Props {
  guestName?: string | null;
  guestId?: string | null;
  onOpenInvitation?: () => void;
}

type RsvpResponse = "attending" | "not_attending" | "maybe";

export default function WeddingDayTeaser({ guestName, guestId, onOpenInvitation }: Props) {
  const [pillVisible, setPillVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIn, setModalIn] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpResponse | null | "loading">("loading");

  const name = guestName ?? "Friend";

  function openModal() {
    setModalOpen(true);
    setTimeout(() => setModalIn(true), 30);
    if (guestId) {
      setRsvpStatus("loading");
      let token: string | null = null;
      try { token = localStorage.getItem("session_token"); } catch {}
      const headers: HeadersInit = token ? { "x-session-token": token } : {};
      fetch("/api/rsvp", { headers })
        .then(r => r.ok ? r.json() : null)
        .then((d: { rsvp?: { response: RsvpResponse } } | null) => {
          setRsvpStatus(d?.rsvp?.response ?? null);
        })
        .catch(() => setRsvpStatus(null));
    } else {
      setRsvpStatus(null);
    }
  }

  function closeModal() {
    setModalIn(false);
    setTimeout(() => { setModalOpen(false); setCalOpen(false); }, 350);
  }

  useEffect(() => {
    const wallEl = document.getElementById("wall-of-love");
    if (!wallEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPillVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(wallEl);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ── Floating pill ─────────────────────────────────────────── */}
      <div
        onClick={openModal}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 44,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: 99,
          background: `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`,
          color: "#fef9f0",
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: 12,
          letterSpacing: "0.06em",
          boxShadow: `0 4px 24px ${RA(0.35)}, 0 0 0 2px ${GA(0.25)}`,
          cursor: "pointer",
          userSelect: "none",
          opacity: pillVisible ? 1 : 0,
          transform: pillVisible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.92)",
          transition: "opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
          pointerEvents: pillVisible ? "auto" : "none",
          animation: pillVisible ? "teaser-bounce 2.4s ease-in-out 0.5s infinite" : "none",
        }}
      >
        <span style={{ fontSize: 16 }}>🎊</span>
        <span>Oct 8 — something awaits</span>
        <span style={{ fontSize: 11, opacity: 0.75 }}>→</span>
      </div>

      {/* ── Modal overlay ─────────────────────────────────────────── */}
      {modalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(15,8,5,0.72)",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px 16px",
            opacity: modalIn ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              background: "#fffdf9",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: `0 32px 100px ${RA(0.25)}, 0 0 0 1px ${GA(0.2)}`,
              transform: modalIn ? "translateY(0) scale(1)" : "translateY(32px) scale(0.96)",
              transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* Gold header bar */}
            <div style={{ height: 4, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

            <div style={{ padding: "28px 24px 24px" }}>

              {rsvpStatus === "attending" ? (
                /* ── Already confirmed attending ── */
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>🙏</div>
                  <h2 style={{
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: "clamp(1.1rem, 3vw, 1.35rem)",
                    color: ROSE,
                    margin: "0 0 12px",
                    letterSpacing: "0.02em",
                  }}>
                    You&apos;re confirmed!
                  </h2>
                  <p style={{
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 14,
                    color: RA(0.65),
                    lineHeight: 1.75,
                    margin: "0 0 24px",
                  }}>
                    You&apos;ve let us know you&apos;ll be there.<br />
                    We&apos;ll be seeing you on{" "}
                    <strong style={{ fontStyle: "normal", color: ROSE }}>October 8</strong>,
                    God willing! 🎊
                  </p>

                  {/* Calendar */}
                  <button
                    onClick={() => setCalOpen(!calOpen)}
                    style={{
                      width: "100%", padding: "10px",
                      border: `1px solid ${GA(0.4)}`, borderRadius: 10,
                      background: "transparent",
                      fontFamily: "var(--font-heading, Georgia, serif)",
                      fontSize: 11, letterSpacing: "0.18em",
                      textTransform: "uppercase", color: ROSE,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span>📅</span> Add to my calendar
                    <span style={{ fontSize: 9, opacity: 0.5 }}>{calOpen ? "▲" : "▼"}</span>
                  </button>
                  {calOpen && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, animation: "teaser-fade-down 0.25s ease both" }}>
                      <a href={buildGoogleCalendarUrl(name)} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${RA(0.2)}`, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 12, color: ROSE, textDecoration: "none" }}>
                        Google
                      </a>
                      <a href={buildIcsDataUrl(name)} download="james-sharon-wedding.ics"
                        style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${RA(0.2)}`, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 12, color: ROSE, textDecoration: "none" }}>
                        Apple / Windows
                      </a>
                    </div>
                  )}

                  <button
                    onClick={closeModal}
                    style={{
                      width: "100%", padding: "13px",
                      border: "none", borderRadius: 10,
                      background: `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`,
                      color: "#fef9f0",
                      fontFamily: "var(--font-heading, Georgia, serif)",
                      fontSize: 11, letterSpacing: "0.22em",
                      textTransform: "uppercase", cursor: "pointer",
                      boxShadow: `0 4px 18px ${RA(0.25)}`,
                      marginBottom: 10,
                    }}
                  >
                    See you there! 💍
                  </button>

                  {onOpenInvitation && (
                    <button
                      onClick={() => { closeModal(); setTimeout(() => onOpenInvitation(), 360); }}
                      style={{
                        background: "none", border: "none",
                        fontFamily: "Georgia, serif", fontStyle: "italic",
                        fontSize: 12, color: RA(0.35),
                        cursor: "pointer", textDecoration: "underline",
                      }}
                    >
                      Update my RSVP
                    </button>
                  )}
                </div>
              ) : (
                /* ── Not yet RSVP'd / maybe / not attending ── */
                <>
                  {/* Calendar card */}
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <div style={{ display: "inline-block", borderRadius: 14, overflow: "hidden", boxShadow: `0 6px 28px ${RA(0.14)}, 0 0 0 1px ${GA(0.25)}`, width: 88 }}>
                      <div style={{ background: `linear-gradient(135deg, ${ROSE}, #8B4A6B)`, padding: "5px 0", textAlign: "center", fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#fef9f0" }}>
                        October
                      </div>
                      <div style={{ background: "#fff", padding: "8px 0 10px", textAlign: "center" }}>
                        <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 38, fontWeight: "bold", color: ROSE, lineHeight: 1, display: "block" }}>8</span>
                        <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 9, letterSpacing: "0.2em", color: GA(0.9), display: "block", marginTop: 2 }}>2026</span>
                      </div>
                    </div>

                    <p style={{ fontFamily: "var(--font-script, Georgia, serif)", fontStyle: "italic", fontSize: 18, color: RA(0.85), margin: "14px 0 2px" }}>
                      Something beautiful awaits
                    </p>
                    <p style={{ fontFamily: "var(--font-body, Georgia, serif)", fontSize: 12, color: RA(0.5), margin: 0 }}>
                      Return to this same link on our wedding day
                    </p>
                  </div>

                  {/* What awaits */}
                  <div style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.06), rgba(90,31,46,0.04))", border: `1px solid ${GA(0.2)}`, borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                    <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD, margin: "0 0 10px" }}>
                      Exclusively for you on Oct 8
                    </p>
                    {[
                      { icon: "🎥", text: "Live wedding ceremony updates" },
                      { icon: "📸", text: "Wedding photos, fresh from the day" },
                      { icon: "🎞", text: "Video highlights & memories" },
                      { icon: "💌", text: "More surprises just for guests" },
                    ].map(({ icon, text }) => (
                      <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, fontFamily: "var(--font-body, Georgia, serif)", fontSize: 13, color: RA(0.75) }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                        {text}
                      </div>
                    ))}
                  </div>

                  {/* RSVP prompt */}
                  {rsvpStatus !== "loading" && onOpenInvitation && (
                    <div style={{ marginBottom: 18 }}>
                      <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 13, color: RA(0.6), margin: "0 0 10px", textAlign: "center" }}>
                        {rsvpStatus === null
                          ? "Please let us know if you can make it!"
                          : "Changed your mind? You can update your RSVP anytime."}
                      </p>
                      <button
                        onClick={() => { closeModal(); setTimeout(() => onOpenInvitation(), 360); }}
                        style={{
                          width: "100%", padding: "11px",
                          border: "none", borderRadius: 10,
                          background: `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`,
                          color: "#fef9f0",
                          fontFamily: "var(--font-heading, Georgia, serif)",
                          fontSize: 11, letterSpacing: "0.22em",
                          textTransform: "uppercase", cursor: "pointer",
                          boxShadow: `0 4px 18px ${RA(0.25)}`,
                        }}
                      >
                        {rsvpStatus === null ? "Open Invitation & RSVP" : "Update my RSVP"}
                      </button>
                    </div>
                  )}

                  {/* Engagement gallery nudge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(168,184,160,0.1)", border: "1px solid rgba(168,184,160,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontFamily: "var(--font-body, Georgia, serif)", fontSize: 12, color: "#5a7a52" }}>
                    <span style={{ fontSize: 16 }}>🌿</span>
                    <span>Meanwhile, our <strong>engagement gallery</strong> is live — scroll up to explore anytime ↑</span>
                  </div>

                  {/* Calendar */}
                  <div style={{ marginBottom: 14 }}>
                    <button
                      onClick={() => setCalOpen(!calOpen)}
                      style={{ width: "100%", padding: "11px", border: `1px solid ${GA(0.4)}`, borderRadius: 10, background: "transparent", fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: ROSE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <span>📅</span> Add to my calendar
                      <span style={{ fontSize: 9, opacity: 0.5 }}>{calOpen ? "▲" : "▼"}</span>
                    </button>
                    {calOpen && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8, animation: "teaser-fade-down 0.25s ease both" }}>
                        <a href={buildGoogleCalendarUrl(name)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${RA(0.2)}`, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 12, color: ROSE, textDecoration: "none" }}>Google</a>
                        <a href={buildIcsDataUrl(name)} download="james-sharon-wedding.ics" style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${RA(0.2)}`, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 12, color: ROSE, textDecoration: "none" }}>Apple / Windows</a>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={closeModal}
                    style={{ width: "100%", padding: "13px", border: "none", borderRadius: 10, background: `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`, color: "#fef9f0", fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", boxShadow: `0 4px 18px ${RA(0.25)}` }}
                  >
                    I&apos;ll be there 💍
                  </button>
                </>
              )}
            </div>

            {/* Gold footer bar */}
            <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${GA(0.5)}, transparent)` }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes teaser-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-5px) scale(1.02); }
        }
        @keyframes teaser-fade-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
