"use client";

import { useState, useEffect, useRef } from "react";
import { useTrackPageVisit } from "@/lib/useTrackPageVisit";

const DEVICES = [
  {
    label: "iPhone 14",
    icon: "📱",
    width: 390,
    height: 844,
    radius: 44,
    notch: true,
  },
  {
    label: "iPad",
    icon: "⬜",
    width: 768,
    height: 1024,
    radius: 20,
    notch: false,
  },
  {
    label: "Desktop",
    icon: "🖥",
    width: 1280,
    height: 800,
    radius: 8,
    notch: false,
  },
];

const PHASES = [
  { label: "Opening",      value: "FIRST_VISIT",  color: "#6B7DB3" },
  { label: "Invitation",   value: "INVITATION",   color: "#9C6B9A" },
  { label: "Pre-Wedding",  value: "RETURN_VISIT", color: "#8B5E83" },
  { label: "Wedding Day",  value: "WEDDING_DAY",  color: "#C17B3F" },
  { label: "Post-Wedding", value: "POST_WEDDING", color: "#4A7C59" },
];

export default function PreviewPage() {
  useTrackPageVisit("preview");
  const [deviceIdx, setDeviceIdx] = useState(0);
  const [phase, setPhase] = useState("FIRST_VISIT");
  const [visible, setVisible] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const isDev = process.env.NODE_ENV !== "production";
    const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
    const hasFlag = window.location.search.includes("dev=1");
    if (isDev || isPreview || hasFlag) { setVisible(true); return; }
    // Also allow admin session (production)
    fetch("/api/admin/settings").then((r) => {
      if (r.ok) setVisible(true);
      else window.location.href = "/admin";
    });
  }, []);

  function switchPhase(newPhase: string) {
    setPhase(newPhase);
    // Write into iframe's localStorage then reload it
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      setIframeKey((k) => k + 1);
      return;
    }
    try {
      const ls = iframe.contentWindow.localStorage;
      ls.setItem("dev_phase", newPhase);
      if (newPhase !== "FIRST_VISIT") {
        if (!ls.getItem("guest_name")) ls.setItem("guest_name", "James D");
      }
      if (["RETURN_VISIT", "WEDDING_DAY", "POST_WEDDING"].includes(newPhase)) {
        ls.setItem("invitation_seen", "true");
      }
      if (newPhase === "FIRST_VISIT") {
        ls.removeItem("guest_name");
        ls.removeItem("invitation_seen");
        ls.removeItem("dev_phase");
      }
    } catch {
      // cross-origin fallback — shouldn't happen on same domain
    }
    setIframeKey((k) => k + 1);
  }

  function switchDevice(idx: number) {
    setDeviceIdx(idx);
  }

  function reload() {
    setIframeKey((k) => k + 1);
  }

  if (!visible) return null;

  const device = DEVICES[deviceIdx];
  const toolbarH = 64;

  return (
    <div
      style={{
        background: "#0f0f1a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: toolbarH,
          background: "#16213e",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 20px",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <span style={{ color: "rgba(212,175,55,0.8)", fontSize: 13, fontWeight: 600, letterSpacing: 2, marginRight: 8 }}>
          J&S PREVIEW
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

        {/* Device switcher */}
        <div style={{ display: "flex", gap: 6 }}>
          {DEVICES.map((d, i) => (
            <button
              key={d.label}
              onClick={() => switchDevice(i)}
              style={{
                background: deviceIdx === i ? "rgba(212,175,55,0.15)" : "transparent",
                border: `1px solid ${deviceIdx === i ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.12)"}`,
                color: deviceIdx === i ? "rgba(212,175,55,0.9)" : "rgba(255,255,255,0.45)",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s",
              }}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
              <span style={{ opacity: 0.5, fontSize: 10 }}>{d.width}px</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />

        {/* Phase switcher */}
        <div style={{ display: "flex", gap: 6 }}>
          {PHASES.map((p) => (
            <button
              key={p.value}
              onClick={() => switchPhase(p.value)}
              style={{
                background: phase === p.value ? p.color : "transparent",
                border: `1px solid ${phase === p.value ? p.color : "rgba(255,255,255,0.12)"}`,
                color: phase === p.value ? "white" : "rgba(255,255,255,0.45)",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Reload */}
        <button
          onClick={reload}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.4)",
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ↺ Reload
        </button>

        <a
          href="/admin"
          style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, letterSpacing: 1, textDecoration: "none" }}
        >
          ← Admin
        </a>
      </div>

      {/* Device frame area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "32px 24px 24px",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* Dimension label */}
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 1 }}>
            {device.width} × {device.height}px — {device.label}
          </div>

          {/* Device shell */}
          <div
            style={{
              width: device.width + 24,
              background: "#1c1c2e",
              borderRadius: device.radius + 8,
              padding: 12,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.6)",
              transition: "width 0.25s ease",
            }}
          >
            {/* Notch bar for mobile */}
            {device.notch && (
              <div
                style={{
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 20,
                    background: "#0f0f1a",
                    borderRadius: 12,
                  }}
                />
              </div>
            )}

            {/* iframe */}
            <div
              style={{
                borderRadius: device.radius - 4,
                overflow: "hidden",
                width: device.width,
                height: device.height,
              }}
            >
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src="/"
                style={{
                  width: device.width,
                  height: device.height,
                  border: "none",
                  display: "block",
                }}
                title={`${device.label} preview`}
              />
            </div>

            {/* Home bar for mobile */}
            {device.notch && (
              <div
                style={{
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 4,
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: 4,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
