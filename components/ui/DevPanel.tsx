"use client";

import { useState, useEffect } from "react";
import { Phase } from "@/lib/phase";

const STAGES: { label: string; phase: Phase; color: string; desc: string }[] = [
  { label: "Opening",      phase: Phase.FIRST_VISIT,  color: "#6B7DB3", desc: "Name & city entry" },
  { label: "Invitation",   phase: Phase.INVITATION,   color: "#9C6B9A", desc: "Animated reveal" },
  { label: "Pre-Wedding",  phase: Phase.RETURN_VISIT, color: "#8B5E83", desc: "Countdown hero" },
  { label: "Wedding Day",  phase: Phase.WEDDING_DAY,  color: "#C17B3F", desc: "Day-of view" },
  { label: "Post-Wedding", phase: Phase.POST_WEDDING, color: "#4A7C59", desc: "Gallery & memories" },
];

export default function DevPanel() {
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setCurrent(localStorage.getItem("dev_phase"));
  }, []);

  function setPhase(phase: Phase | null) {
    if (phase === null) {
      localStorage.removeItem("dev_phase");
      localStorage.removeItem("guest_name");
      localStorage.removeItem("invitation_seen");
      setCurrent(null);
    } else {
      localStorage.setItem("dev_phase", phase);
      // Pre-populate guest data so non-first-visit phases work correctly
      if (phase !== Phase.FIRST_VISIT) {
        if (!localStorage.getItem("guest_name")) {
          localStorage.setItem("guest_name", "Test Guest");
        }
      }
      if (phase === Phase.RETURN_VISIT || phase === Phase.WEDDING_DAY || phase === Phase.POST_WEDDING) {
        localStorage.setItem("invitation_seen", "true");
      }
      setCurrent(phase);
    }
    window.location.reload();
  }

  // Show in dev and on Vercel preview (staging); hide on production unless ?dev=1
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const isDev = process.env.NODE_ENV !== "production";
    const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
    const hasFlag = window.location.search.includes("dev=1");
    setVisible(isDev || isPreview || hasFlag);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div
          className="flex flex-col gap-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl p-4 shadow-2xl min-w-[200px]"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 pb-1 border-b border-gray-100">
            Dev · Phase Switcher
          </p>
          {STAGES.map(({ label, phase, color, desc }) => {
            const active = current === phase;
            return (
              <button
                key={phase}
                onClick={() => setPhase(active ? null : phase)}
                style={{
                  backgroundColor: active ? color : "transparent",
                  color: active ? "white" : color,
                  border: `1.5px solid ${color}`,
                }}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all duration-200 hover:opacity-80"
              >
                <span>{active ? `✓ ` : ""}{label}</span>
                <span style={{ opacity: 0.7, fontSize: "10px", display: "block", fontWeight: 400 }}>{desc}</span>
              </button>
            );
          })}
          <button
            onClick={() => setPhase(null)}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-left text-gray-400 hover:text-gray-600 transition-colors border border-dashed border-gray-200 mt-1"
          >
            Reset all (auto-detect)
          </button>
          <p className="text-[9px] text-gray-300 text-center pt-1">
            Reloads page on change
          </p>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        title="Dev phase switcher"
        style={{ fontFamily: "system-ui, sans-serif" }}
        className="w-11 h-11 rounded-full bg-gray-900/80 backdrop-blur-md text-white text-base shadow-lg hover:bg-gray-800 transition-all duration-200 flex items-center justify-center border border-white/10"
      >
        {open ? "✕" : "⚙"}
      </button>
    </div>
  );
}
