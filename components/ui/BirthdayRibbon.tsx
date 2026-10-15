"use client";

import { useEffect, useState } from "react";

// James's birthday ribbon - shows ONLY on this date (India time) and hides itself at midnight,
// so it needs no follow-up deploy to remove. Safe to delete this file + its <BirthdayRibbon /> afterwards.
const BIRTHDAY_IST = "2026-10-16";
const DISMISS_KEY = "birthday_ribbon_dismissed_2026";

function isBirthdayToday(): boolean {
  const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()); // YYYY-MM-DD
  return ist === BIRTHDAY_IST;
}

export default function BirthdayRibbon() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === "1"; } catch {}
    const check = () => setShow(!dismissed && isBirthdayToday());
    check();
    const id = setInterval(check, 60_000); // disappears on open pages at midnight
    return () => clearInterval(id);
  }, []);

  if (!show) return null;

  const close = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setShow(false);
  };
  const toWall = () => document.getElementById("wall-of-love")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div
      role="status"
      style={{
        position: "fixed", left: "50%", bottom: 76, transform: "translateX(-50%)", zIndex: 43,
        width: "max-content", maxWidth: "calc(100vw - 24px)",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center",
        padding: "10px 14px 10px 18px", borderRadius: 999,
        background: "linear-gradient(135deg, rgba(90,31,46,0.96), rgba(122,48,72,0.96))",
        border: "1px solid rgba(212,175,55,0.55)", boxShadow: "0 10px 34px rgba(90,31,46,0.35)",
        color: "#fdf6ec", textAlign: "center", animation: "bday-in 0.6s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>🎂</span>
      <span className="font-heading" style={{ fontSize: "clamp(13px, 3.4vw, 15px)", lineHeight: 1.35 }}>
        <strong style={{ color: "#D4AF37" }}>Today is James&apos;s birthday!</strong>{" "}
        <span style={{ opacity: 0.9 }}>His first as a married man 💍</span>
      </span>
      <button
        onClick={toWall}
        className="font-heading"
        style={{
          padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer",
          background: "#D4AF37", color: "#3d1020", fontSize: 12, letterSpacing: "0.08em", fontWeight: 600,
        }}
      >
        Send a wish 💌
      </button>
      <button
        onClick={close}
        aria-label="Close birthday message"
        style={{ background: "none", border: "none", color: "rgba(253,246,236,0.6)", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: "0 2px" }}
      >
        ×
      </button>
      <style>{`@keyframes bday-in { from { opacity: 0; transform: translate(-50%, 16px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </div>
  );
}
