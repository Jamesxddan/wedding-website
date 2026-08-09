"use client";

import { useEffect, useState } from "react";
import { buildGoogleCalendarUrl, buildIcsUrl } from "@/lib/calendar";

const GOLD = "#D4AF37";
const ROSE = "#5a1f2e";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;

interface Props {
  guestName?: string | null;
  guestId?: string | null;
  onOpenInvitation?: () => void;
}

type RsvpData = {
  response: "attending" | "not_attending" | "maybe";
  attending_events: "ceremony" | "reception" | "both" | null;
} | null;

function getModalConfig(rsvp: RsvpData | "loading"): {
  icon: string;
  heading: string;
  body: string;
  showRsvpButton?: boolean;
  rsvpButtonLabel?: string;
  closeLabel: string;
  showUpdateLink?: boolean;
  showOnlineNote?: boolean;
  onlineNoteText?: string;
} {
  if (rsvp === "loading" || rsvp === null) {
    return {
      icon: "💌",
      heading: "Can you make it?",
      body: "Please let us know if you can join us — it only takes a moment!",
      showRsvpButton: true,
      rsvpButtonLabel: "Open Invitation & RSVP",
      closeLabel: "I'll be there 💍",
    };
  }

  const { response, attending_events } = rsvp;

  if (response === "not_attending") {
    return {
      icon: "📺",
      heading: "We'll miss you!",
      body: "Even though you can't be there in person, both the ceremony and the reception will be streamed live right here on this page on October 8 — come back and join us online!",
      closeLabel: "I'll watch online 🙏",
      showUpdateLink: true,
      showOnlineNote: true,
      onlineNoteText: "🎥  Live ceremony  ·  🎉  Live reception  —  both on Oct 8",
    };
  }

  if (response === "maybe") {
    return {
      icon: "🤞",
      heading: "We hope you can make it!",
      body: "If you're not able to join in person, both the ceremony and reception will be streamed live here on October 8 — you can watch from wherever you are.",
      showRsvpButton: true,
      rsvpButtonLabel: "Update my RSVP",
      closeLabel: "I'll be there 💍",
      showOnlineNote: true,
      onlineNoteText: "🎥  Live ceremony  ·  🎉  Live reception  —  both on Oct 8",
    };
  }

  // attending
  if (attending_events === "ceremony") {
    return {
      icon: "🙏",
      heading: "See you at the ceremony!",
      body: "You've confirmed for the ceremony — we can't wait! The reception will also be streamed live here on October 8, so you can join that too from wherever you are.",
      closeLabel: "See you there! 💍",
      showUpdateLink: true,
      showOnlineNote: true,
      onlineNoteText: "🎉  Reception also streams live on Oct 8",
    };
  }

  if (attending_events === "reception") {
    return {
      icon: "🙏",
      heading: "See you at the reception!",
      body: "You've confirmed for the reception — wonderful! The ceremony will also be streamed live here on October 8, so you can catch that too.",
      closeLabel: "See you there! 💍",
      showUpdateLink: true,
      showOnlineNote: true,
      onlineNoteText: "🎥  Ceremony also streams live on Oct 8",
    };
  }

  // attending both (or attending_events is null)
  return {
    icon: "🙏",
    heading: "You're confirmed!",
    body: "You've let us know you'll be there. We'll be seeing you on October 8, God willing! 🎊",
    closeLabel: "See you there! 💍",
    showUpdateLink: true,
  };
}

export default function WeddingDayTeaser({ guestName, guestId, onOpenInvitation }: Props) {
  const [pillVisible, setPillVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIn, setModalIn] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [rsvpData, setRsvpData] = useState<RsvpData | "loading">("loading");

  const name = guestName ?? "Friend";

  // Pill is always available — show shortly after page loads
  useEffect(() => {
    const t = setTimeout(() => setPillVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  function openModal() {
    setModalOpen(true);
    setTimeout(() => setModalIn(true), 30);
    if (guestId) {
      setRsvpData("loading");
      let token: string | null = null;
      try { token = localStorage.getItem("session_token"); } catch {}
      const headers: HeadersInit = token ? { "x-session-token": token } : {};
      fetch("/api/rsvp", { headers })
        .then(r => r.ok ? r.json() : null)
        .then((d: { rsvp?: RsvpData } | null) => setRsvpData(d?.rsvp ?? null))
        .catch(() => setRsvpData(null));
    } else {
      setRsvpData(null);
    }
  }

  function closeModal() {
    setModalIn(false);
    setTimeout(() => { setModalOpen(false); setCalOpen(false); }, 350);
  }

  const cfg = getModalConfig(rsvpData);

  return (
    <>
      {/* ── Floating pill — always visible after page loads ── */}
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
          padding: "10px 18px",
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
          transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          pointerEvents: pillVisible ? "auto" : "none",
          animation: pillVisible ? "teaser-bounce 2.8s ease-in-out 1s infinite" : "none",
        }}
      >
        <span style={{ fontSize: 16 }}>🎊</span>
        <span>Oct 8 — something awaits</span>
        <span style={{ fontSize: 11, opacity: 0.65 }}>→</span>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(15,8,5,0.75)",
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
            <div style={{ height: 4, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

            <div style={{ padding: "28px 24px 24px" }}>

              {/* Oct 8 calendar chip */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <div style={{ display: "inline-flex", borderRadius: 14, overflow: "hidden", boxShadow: `0 6px 28px ${RA(0.14)}, 0 0 0 1px ${GA(0.25)}`, width: 80 }}>
                  <div style={{ width: "100%" }}>
                    <div style={{ background: `linear-gradient(135deg, ${ROSE}, #8B4A6B)`, padding: "4px 0", textAlign: "center", fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#fef9f0" }}>
                      October
                    </div>
                    <div style={{ background: "#fff", padding: "6px 0 8px", textAlign: "center" }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 34, fontWeight: "bold", color: ROSE, lineHeight: 1, display: "block" }}>8</span>
                      <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 8, letterSpacing: "0.2em", color: GA(0.85), display: "block", marginTop: 2 }}>2026</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic content based on RSVP status */}
              {rsvpData === "loading" ? (
                <div style={{ textAlign: "center", padding: "12px 0", color: RA(0.4), fontFamily: "Georgia, serif", fontSize: 13 }}>
                  Checking your RSVP…
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 38, marginBottom: 12 }}>{cfg.icon}</div>

                  <h2 style={{
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: "clamp(1rem, 3vw, 1.3rem)",
                    color: ROSE,
                    margin: "0 0 10px",
                    letterSpacing: "0.02em",
                  }}>
                    {cfg.heading}
                  </h2>

                  <p style={{
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 13.5,
                    color: RA(0.65),
                    lineHeight: 1.75,
                    margin: "0 0 20px",
                  }}>
                    {cfg.body}
                  </p>

                  {/* Online streaming callout */}
                  {cfg.showOnlineNote && cfg.onlineNoteText && (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.07), rgba(90,31,46,0.04))",
                      border: `1px solid ${GA(0.2)}`,
                      borderRadius: 10,
                      padding: "11px 14px",
                      marginBottom: 18,
                      fontFamily: "var(--font-body, Georgia, serif)",
                      fontSize: 12,
                      color: RA(0.7),
                      letterSpacing: "0.01em",
                    }}>
                      {cfg.onlineNoteText}
                    </div>
                  )}

                  {/* Calendar */}
                  <button
                    onClick={() => setCalOpen(!calOpen)}
                    style={{
                      width: "100%", padding: "10px",
                      border: `1px solid ${GA(0.35)}`, borderRadius: 10,
                      background: "transparent",
                      fontFamily: "var(--font-heading, Georgia, serif)",
                      fontSize: 11, letterSpacing: "0.16em",
                      textTransform: "uppercase", color: ROSE,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span>📅</span> Add to my calendar
                    <span style={{ fontSize: 9, opacity: 0.45 }}>{calOpen ? "▲" : "▼"}</span>
                  </button>
                  {calOpen && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, animation: "teaser-fade-down 0.25s ease both" }}>
                      <a href={buildGoogleCalendarUrl(name)} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${RA(0.2)}`, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 12, color: ROSE, textDecoration: "none" }}>
                        Google
                      </a>
                      <a href={buildIcsUrl(name)} download="james-sharon-wedding.ics"
                        style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${RA(0.2)}`, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 12, color: ROSE, textDecoration: "none" }}>
                        Apple / Windows
                      </a>
                    </div>
                  )}

                  {/* RSVP / update CTA */}
                  {cfg.showRsvpButton && onOpenInvitation && (
                    <button
                      onClick={() => { closeModal(); setTimeout(() => onOpenInvitation(), 360); }}
                      style={{
                        width: "100%", padding: "12px",
                        border: "none", borderRadius: 10,
                        background: `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`,
                        color: "#fef9f0",
                        fontFamily: "var(--font-heading, Georgia, serif)",
                        fontSize: 11, letterSpacing: "0.2em",
                        textTransform: "uppercase", cursor: "pointer",
                        boxShadow: `0 4px 18px ${RA(0.25)}`,
                        marginBottom: 10,
                      }}
                    >
                      {cfg.rsvpButtonLabel}
                    </button>
                  )}

                  {/* Primary close CTA */}
                  <button
                    onClick={closeModal}
                    style={{
                      width: "100%", padding: "12px",
                      border: cfg.showRsvpButton ? `1px solid ${RA(0.2)}` : "none",
                      borderRadius: 10,
                      background: cfg.showRsvpButton
                        ? "transparent"
                        : `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`,
                      color: cfg.showRsvpButton ? RA(0.6) : "#fef9f0",
                      fontFamily: "var(--font-heading, Georgia, serif)",
                      fontSize: 11, letterSpacing: "0.2em",
                      textTransform: "uppercase", cursor: "pointer",
                      boxShadow: cfg.showRsvpButton ? "none" : `0 4px 18px ${RA(0.25)}`,
                      marginBottom: cfg.showUpdateLink ? 10 : 0,
                    }}
                  >
                    {cfg.closeLabel}
                  </button>

                  {/* Update RSVP ghost link */}
                  {cfg.showUpdateLink && onOpenInvitation && (
                    <button
                      onClick={() => { closeModal(); setTimeout(() => onOpenInvitation(), 360); }}
                      style={{
                        background: "none", border: "none",
                        fontFamily: "Georgia, serif", fontStyle: "italic",
                        fontSize: 12, color: RA(0.3),
                        cursor: "pointer", textDecoration: "underline",
                      }}
                    >
                      Update my RSVP
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${GA(0.45)}, transparent)` }} />
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
