"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Phase } from "@/lib/phase";
import { safeGetItem } from "@/lib/storage";
import { OWNER_PREVIEW_PHASE_KEY, OWNER_PREVIEW_RELINK_KEY, OWNER_PREVIEW_ERROR_KEY, OWNER_PREVIEW_TRUE_AUTO } from "@/lib/usePhase";

const PHASES: { value: string; label: string; desc: string }[] = [
  { value: "auto",                  label: "Auto",           desc: "Date-based detection" },
  { value: Phase.FIRST_VISIT,       label: "First Visit",    desc: "Registration screen" },
  { value: Phase.INVITATION,        label: "Invitation",     desc: "Show invite card" },
  { value: Phase.RETURN_VISIT,      label: "Pre-Wedding",    desc: "Countdown + gallery" },
  { value: Phase.WEDDING_DAY,       label: "Wedding Day",    desc: "Live day banner" },
  { value: Phase.POST_WEDDING,      label: "Post-Wedding",   desc: "Memories page" },
  { value: "relink",                label: "Relink Screen",  desc: "Fingerprinted, unregistered device" },
];

const ERRORS: { value: string; label: string; desc: string }[] = [
  { value: "none",             label: "None",                 desc: "Clear any error preview" },
  { value: "rsvp_error",       label: "RSVP Submit Error",    desc: "Failed RSVP banner on invitation" },
  { value: "relink_not_found", label: "Relink — Not Found",   desc: "Name/city lookup fails" },
  { value: "relink_mismatch",  label: "Relink — Mismatch",    desc: "Wrong email/phone on verify" },
  { value: "blocked",          label: "Blocked / Rate-Limited", desc: "Suspicious-activity banner" },
];

const GOLD = "#D4AF37";
const GA   = (a: number) => `rgba(212,175,55,${a})`;

interface Props { currentPhase: Phase; }

function safeGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch {}
}
function safeRemove(key: string): void {
  try { sessionStorage.removeItem(key); } catch {}
}

export default function OwnerPhaseSwitcher({ currentPhase }: Props) {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<"phase" | "errors">("phase");
  const [active, setActive]       = useState<string>("auto");
  const [activeError, setActiveError] = useState<string>("none");
  const [adminStatus, setAdminStatus] = useState<{ isAdmin: boolean; isSuper: boolean } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Does the current visitor also hold admin access? Lets the sub-owner gear
  // offer a one-click path into /admin when they're an admin. The endpoint is
  // an affordance check only — /admin and every /api/admin route stay gated by
  // getAdminSession regardless, so this leaks no credentials.
  useEffect(() => {
    const token = safeGetItem("session_token");
    fetch("/api/admin/gear-status", {
      headers: token ? { "x-session-token": token } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { isAdmin?: boolean; isSuper?: boolean } | null) => {
        if (d) setAdminStatus({ isAdmin: !!d.isAdmin, isSuper: !!d.isSuper });
      })
      .catch(() => {});
  }, []);

  // Read current preview state on open
  useEffect(() => {
    if (!open) return;
    if (safeGet(OWNER_PREVIEW_RELINK_KEY) === "1") {
      setActive("relink");
    } else {
      const stored = safeGet(OWNER_PREVIEW_PHASE_KEY);
      setActive(!stored || stored === OWNER_PREVIEW_TRUE_AUTO ? "auto" : stored);
    }
    setActiveError(safeGet(OWNER_PREVIEW_ERROR_KEY) ?? "none");
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
    if (value === "relink") {
      safeSet(OWNER_PREVIEW_RELINK_KEY, "1");
      safeSet(OWNER_PREVIEW_PHASE_KEY, Phase.RETURN_VISIT);
    } else if (value === "auto") {
      // Auto = exactly what a normal guest sees, including bypassing any
      // site-wide admin Phase Override — that override is a separate,
      // all-visitors setting and shouldn't hold this preview hostage.
      // Also clears any error preview left active from the Errors tab.
      safeSet(OWNER_PREVIEW_PHASE_KEY, OWNER_PREVIEW_TRUE_AUTO);
      safeRemove(OWNER_PREVIEW_RELINK_KEY);
      safeRemove(OWNER_PREVIEW_ERROR_KEY);
    } else {
      safeSet(OWNER_PREVIEW_PHASE_KEY, value);
      safeRemove(OWNER_PREVIEW_RELINK_KEY);
    }
    window.location.reload();
  }

  function selectError(value: string) {
    if (value === "none") {
      safeRemove(OWNER_PREVIEW_ERROR_KEY);
    } else {
      safeSet(OWNER_PREVIEW_ERROR_KEY, value);
      // These errors only render on their matching screen — jump there too.
      if (value === "rsvp_error") {
        safeSet(OWNER_PREVIEW_PHASE_KEY, Phase.INVITATION);
        safeRemove(OWNER_PREVIEW_RELINK_KEY);
      } else if (value === "relink_not_found" || value === "relink_mismatch") {
        safeSet(OWNER_PREVIEW_RELINK_KEY, "1");
        safeSet(OWNER_PREVIEW_PHASE_KEY, Phase.RETURN_VISIT);
      }
    }
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
          minWidth: 240,
          maxHeight: "70vh",
          overflowY: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          animation: "owner-panel-in 0.2s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", padding: "0 10px 9px", gap: 4, borderBottom: `1px solid ${GA(0.1)}` }}>
            {(["phase", "errors"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "6px 8px", borderRadius: 8,
                  border: "none", cursor: "pointer",
                  background: tab === t ? GA(0.14) : "transparent",
                  fontFamily: "var(--font-heading, Georgia, serif)",
                  fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase",
                  color: tab === t ? GOLD : "rgba(253,246,236,0.4)",
                }}
              >
                {t === "phase" ? "Screens" : "Errors"}
              </button>
            ))}
          </div>

          {tab === "phase" && PHASES.map(({ value, label, desc }) => {
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

          {tab === "errors" && ERRORS.map(({ value, label, desc }) => {
            const isActive = activeError === value;
            return (
              <button
                key={value}
                onClick={() => selectError(value)}
                disabled={isActive}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 14px",
                  background: isActive ? "rgba(192,57,43,0.12)" : "none",
                  border: "none", cursor: isActive ? "default" : "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: isActive ? "#e05a4a" : "rgba(255,255,255,0.15)",
                  boxShadow: isActive ? "0 0 6px #e05a4a" : "none",
                  transition: "background 0.2s, box-shadow 0.2s",
                }} />
                <span>
                  <span style={{
                    display: "block",
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: 12, letterSpacing: "0.04em",
                    color: isActive ? "#e07868" : "rgba(253,246,236,0.8)",
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

          {adminStatus?.isAdmin && (
            <>
              <div style={{ margin: "6px 14px 0", borderTop: `1px solid ${GA(0.12)}` }} />
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 14px",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: GOLD,
                  boxShadow: `0 0 6px ${GOLD}`,
                }} />
                <span>
                  <span style={{
                    display: "block",
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: 12, letterSpacing: "0.04em",
                    color: GOLD,
                  }}>
                    Admin Panel
                  </span>
                  <span style={{
                    display: "block",
                    fontFamily: "Georgia, serif",
                    fontSize: 10,
                    color: "rgba(253,246,236,0.3)",
                    marginTop: 1,
                  }}>
                    {adminStatus.isSuper ? "Super admin" : "Admin"} — site-wide controls
                  </span>
                </span>
                <span style={{ marginLeft: "auto", color: "rgba(253,246,236,0.4)", fontSize: 12 }}>→</span>
              </Link>
            </>
          )}

          <p style={{
            margin: "10px 14px 0", padding: "8px 10px",
            borderRadius: 6, background: "rgba(212,175,55,0.05)",
            border: `1px solid ${GA(0.1)}`,
            fontFamily: "Georgia, serif", fontStyle: "italic",
            fontSize: 10, color: "rgba(253,246,236,0.35)", lineHeight: 1.5,
          }}>
            Preview only — this changes what YOU see on this device. Other guests are never affected. Auto bypasses any site-wide admin override just for you.
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
