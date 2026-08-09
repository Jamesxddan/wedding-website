"use client";

import { useEffect, useRef, useState } from "react";
import { Phase } from "@/lib/phase";
import { OWNER_PREVIEW_PHASE_KEY, OWNER_PREVIEW_RELINK_KEY } from "@/lib/usePhase";

const PHASES: { value: string; label: string; desc: string }[] = [
  { value: "auto",                  label: "Auto",           desc: "Date-based detection" },
  { value: Phase.FIRST_VISIT,       label: "First Visit",    desc: "Registration screen" },
  { value: Phase.INVITATION,        label: "Invitation",     desc: "Show invite card" },
  { value: Phase.RETURN_VISIT,      label: "Pre-Wedding",    desc: "Countdown + gallery" },
  { value: Phase.WEDDING_DAY,       label: "Wedding Day",    desc: "Live day banner" },
  { value: Phase.POST_WEDDING,      label: "Post-Wedding",   desc: "Memories page" },
  { value: "relink",                label: "Relink Screen",  desc: "Fingerprinted, unregistered device" },
];

const GOLD = "#D4AF37";
const GA   = (a: number) => `rgba(212,175,55,${a})`;

interface Props { currentPhase: Phase; }

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export default function OwnerPhaseSwitcher({ currentPhase }: Props) {
  const [open, setOpen]         = useState(false);
  const [active, setActive]     = useState<string>("auto");
  const panelRef = useRef<HTMLDivElement>(null);

  // Read current preview state on open
  useEffect(() => {
    if (!open) return;
    if (safeGet(OWNER_PREVIEW_RELINK_KEY) === "1") {
      setActive("relink");
    } else {
      setActive(safeGet(OWNER_PREVIEW_PHASE_KEY) ?? "auto");
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function selectPreview(value: string) {
    try {
      if (value === "relink") {
        localStorage.setItem(OWNER_PREVIEW_RELINK_KEY, "1");
        localStorage.setItem(OWNER_PREVIEW_PHASE_KEY, Phase.RETURN_VISIT);
      } else if (value === "auto") {
        localStorage.removeItem(OWNER_PREVIEW_PHASE_KEY);
        localStorage.removeItem(OWNER_PREVIEW_RELINK_KEY);
      } else {
        localStorage.setItem(OWNER_PREVIEW_PHASE_KEY, value);
        localStorage.removeItem(OWNER_PREVIEW_RELINK_KEY);
      }
    } catch {}
    window.location.reload();
  }

  return (
    <div ref={panelRef} style={{ position: "fixed", bottom: 20, left: 68, zIndex: 44 }}>

      {/* ── Panel ── */}
      {open && (
        <div style={{
          position: "absolute", bottom: 48, left: 0,
          background: "rgba(12,5,3,0.95)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: `1px solid ${GA(0.22)}`,
          borderRadius: 14,
          padding: "10px 0 12px",
          minWidth: 230,
          boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          animation: "owner-panel-in 0.2s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          <p style={{
            margin: 0, padding: "0 14px 9px",
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase",
            color: GA(0.55), borderBottom: `1px solid ${GA(0.1)}`,
          }}>
            Preview Phase (you only)
          </p>

          {PHASES.map(({ value, label, desc }) => {
            const isActive = active === value;
            return (
              <button
                key={value}
                onClick={() => selectPreview(value)}
                disabled={isActive}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 14px",
                  background: isActive ? GA(0.08) : "none",
                  border: "none", cursor: isActive ? "default" : "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: isActive ? GOLD : "rgba(255,255,255,0.15)",
                  boxShadow: isActive ? `0 0 6px ${GOLD}` : "none",
                  transition: "background 0.2s, box-shadow 0.2s",
                }} />
                <span>
                  <span style={{
                    display: "block",
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: 12, letterSpacing: "0.04em",
                    color: isActive ? GOLD : "rgba(253,246,236,0.8)",
                  }}>
                    {label}
                  </span>
                  <span style={{
                    display: "block",
                    fontFamily: "Georgia, serif",
                    fontSize: 10,
                    color: "rgba(253,246,236,0.3)",
                    marginTop: 1,
                  }}>
                    {desc}
                  </span>
                </span>
              </button>
            );
          })}

          <p style={{
            margin: "10px 14px 0", padding: "8px 10px",
            borderRadius: 6, background: "rgba(212,175,55,0.05)",
            border: `1px solid ${GA(0.1)}`,
            fontFamily: "Georgia, serif", fontStyle: "italic",
            fontSize: 10, color: "rgba(253,246,236,0.35)", lineHeight: 1.5,
          }}>
            Preview only — this changes what YOU see on this device. Other guests are never affected.
          </p>
        </div>
      )}

      {/* ── Gear button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={`Preview switcher · current: ${currentPhase}`}
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: open
            ? `rgba(212,175,55,0.18)`
            : "rgba(12,5,3,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: `1px solid ${GA(open ? 0.45 : 0.2)}`,
          color: open ? GOLD : GA(0.6),
          fontSize: 15,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s, border-color 0.2s, color 0.2s, transform 0.3s ease",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          boxShadow: open ? `0 0 12px ${GA(0.2)}` : "none",
        }}
        aria-label="Preview switcher"
        aria-expanded={open}
      >
        ⚙️
      </button>

      <style>{`
        @keyframes owner-panel-in {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
