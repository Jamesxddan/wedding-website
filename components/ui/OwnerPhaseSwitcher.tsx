"use client";

import { useEffect, useRef, useState } from "react";
import { Phase } from "@/lib/phase";

const PHASES: { value: string; label: string; desc: string }[] = [
  { value: "auto",                  label: "Auto",        desc: "Date-based detection" },
  { value: Phase.FIRST_VISIT,       label: "First Visit", desc: "Registration screen" },
  { value: Phase.INVITATION,        label: "Invitation",  desc: "Show invite card" },
  { value: Phase.RETURN_VISIT,      label: "Pre-Wedding", desc: "Countdown + gallery" },
  { value: Phase.WEDDING_DAY,       label: "Wedding Day", desc: "Live day banner" },
  { value: Phase.POST_WEDDING,      label: "Post-Wedding","desc": "Memories page" },
];

const GOLD = "#D4AF37";
const GA   = (a: number) => `rgba(212,175,55,${a})`;

interface Props { currentPhase: Phase; }

export default function OwnerPhaseSwitcher({ currentPhase }: Props) {
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [override, setOverride] = useState<string | null>(null);
  const [status, setStatus]     = useState<"idle" | "ok" | "err">("idle");
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch current override on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : {})
      .then((d: Record<string, string>) => {
        setOverride(d.phase_override ?? "auto");
      })
      .catch(() => {});
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

  async function switchPhase(value: string) {
    if (saving) return;
    setSaving(true);
    setStatus("idle");
    try {
      let token: string | null = null;
      try { token = localStorage.getItem("session_token"); } catch {}
      const res = await fetch("/api/owner/phase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {}),
        },
        body: JSON.stringify({ phase: value }),
      });
      if (res.ok) {
        setOverride(value);
        setStatus("ok");
        setTimeout(() => window.location.reload(), 600);
      } else {
        setStatus("err");
      }
    } catch {
      setStatus("err");
    } finally {
      setSaving(false);
    }
  }

  const activeValue = override ?? "auto";

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
          minWidth: 210,
          boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          animation: "owner-panel-in 0.2s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          <p style={{
            margin: 0, padding: "0 14px 9px",
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase",
            color: GA(0.55), borderBottom: `1px solid ${GA(0.1)}`,
          }}>
            Phase Override
          </p>

          {PHASES.map(({ value, label, desc }) => {
            const isActive = activeValue === value;
            return (
              <button
                key={value}
                onClick={() => switchPhase(value)}
                disabled={saving || isActive}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 14px",
                  background: isActive ? GA(0.08) : "none",
                  border: "none", cursor: isActive ? "default" : "pointer",
                  textAlign: "left",
                  opacity: saving && !isActive ? 0.45 : 1,
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

          {/* Status line */}
          {status !== "idle" && (
            <p style={{
              margin: "6px 14px 0", padding: "6px 10px",
              borderRadius: 6,
              background: status === "ok" ? "rgba(80,160,80,0.15)" : "rgba(160,40,40,0.15)",
              fontFamily: "Georgia, serif", fontSize: 11,
              color: status === "ok" ? "#80c880" : "#e07070",
              textAlign: "center",
            }}>
              {status === "ok" ? "✓ Switching…" : "✗ Failed — try again"}
            </p>
          )}

          <p style={{
            margin: "10px 14px 0", padding: "8px 10px",
            borderRadius: 6, background: "rgba(212,175,55,0.05)",
            border: `1px solid ${GA(0.1)}`,
            fontFamily: "Georgia, serif", fontStyle: "italic",
            fontSize: 10, color: "rgba(253,246,236,0.25)", lineHeight: 1.5,
          }}>
            This changes the phase for all visitors.
          </p>
        </div>
      )}

      {/* ── Gear button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={`Phase switcher · current: ${currentPhase}`}
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
        aria-label="Phase switcher"
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
