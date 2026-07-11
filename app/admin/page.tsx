"use client";

import { useState, useEffect, useCallback } from "react";
import { useTrackPageVisit } from "@/lib/useTrackPageVisit";

type Tab = "guests" | "logs" | "flags" | "live" | "control" | "preview";

interface Guest {
  id: string;
  name: string;
  city: string;
  invitation_seen: boolean;
  is_owner: boolean;
  created_at: string;
  last_seen_at: string;
  device_count: number;
}

interface LogRow {
  id: string;
  device_uuid: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
  guests: { name: string } | null;
}

interface Flag {
  id: string;
  device_uuid: string;
  ip: string | null;
  reason: string;
  blocked_until: string;
}

type Settings = Record<string, string>;

const PHASES = [
  { label: "Auto-detect",  value: "auto" },
  { label: "Opening",      value: "FIRST_VISIT" },
  { label: "Invitation",   value: "INVITATION" },
  { label: "Pre-Wedding",  value: "RETURN_VISIT" },
  { label: "Wedding Day",  value: "WEDDING_DAY" },
  { label: "Post-Wedding", value: "POST_WEDDING" },
];

function youtubeEmbedUrl(raw: string): string | null {
  if (!raw.trim()) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : "https://" + raw);
    const v = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
    if (!v || v.length < 6) return null;
    return `https://www.youtube.com/embed/${v}`;
  } catch { return null; }
}

export default function AdminPage() {
  useTrackPageVisit("admin");
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("guests");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState<Settings>({});
  const [ytInput, setYtInput] = useState("");
  const [ytSaving, setYtSaving] = useState(false);
  const [ytSaved, setYtSaved] = useState(false);
  const [annoInput, setAnnoInput] = useState("");
  const [annoSaving, setAnnoSaving] = useState(false);
  const [annoSaved, setAnnoSaved] = useState(false);
  const [phaseSaving, setPhaseSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) return;
    const data: Settings = await res.json();
    setSettings(data);
    setYtInput(data.youtube_live_url ?? "");
    setAnnoInput(data.announcement ?? "");
  }, []);

  const load = useCallback(async (t: Tab) => {
    if (t === "live" || t === "control") { await loadSettings(); return; }
    if (t === "preview") return;
    setLoading(true);
    try {
      if (t === "guests") {
        const res = await fetch("/api/admin/guests");
        if (res.ok) setGuests(await res.json());
      } else if (t === "logs") {
        const url = logFilter
          ? `/api/admin/logs?guest=${encodeURIComponent(logFilter)}`
          : "/api/admin/logs";
        const res = await fetch(url);
        if (res.ok) setLogs(await res.json());
      } else {
        const res = await fetch("/api/admin/flags");
        if (res.ok) setFlags(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [logFilter, loadSettings]);

  useEffect(() => { if (authed) load(tab); }, [authed, tab, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setAuthed(true); setAuthError(""); }
    else setAuthError("Wrong password");
  }

  async function saveSetting(key: string, value: string) {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    await loadSettings();
  }

  async function saveYoutube() {
    setYtSaving(true);
    await saveSetting("youtube_live_url", ytInput.trim());
    setYtSaving(false); setYtSaved(true);
    setTimeout(() => setYtSaved(false), 2500);
  }

  async function saveAnnouncement() {
    setAnnoSaving(true);
    await saveSetting("announcement", annoInput.trim());
    setAnnoSaving(false); setAnnoSaved(true);
    setTimeout(() => setAnnoSaved(false), 2500);
  }

  async function savePhase(value: string) {
    setPhaseSaving(true);
    await saveSetting("phase_override", value);
    setPhaseSaving(false);
  }

  async function toggleOwner(g: Guest) {
    await fetch("/api/admin/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, is_owner: !g.is_owner }),
    });
    await load("guests");
  }

  async function unblock(f: Flag) {
    await fetch("/api/admin/flags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id }),
    });
    load("flags");
  }

  const th: React.CSSProperties = {
    textAlign: "left", padding: "8px 12px", fontSize: 12,
    color: "#999", fontWeight: 600, borderBottom: "1px solid #ede8e2",
  };
  const td: React.CSSProperties = {
    padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f4f0ec",
  };
  const tabBtn = (t: Tab): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
    background: tab === t ? "#8B4A6B" : "#ede8e2",
    color: tab === t ? "#fff" : "#555",
  });
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: "10px 14px", borderRadius: 10,
    border: "1px solid #ddd", fontSize: 14, background: "#fff", outline: "none",
  };
  const saveBtn = (saving: boolean, saved: boolean): React.CSSProperties => ({
    padding: "10px 22px", borderRadius: 10, border: "none",
    cursor: saving ? "default" : "pointer", fontSize: 14, fontWeight: 600,
    background: saved ? "#4A7C59" : saving ? "#ccc" : "#8B4A6B",
    color: "#fff", transition: "background 0.2s", whiteSpace: "nowrap",
  });
  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 14, padding: "22px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16,
  };

  if (!authed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9f5f1" }}>
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 14, width: 300 }}>
          <h2 style={{ margin: 0, fontFamily: "Georgia, serif", color: "#8B4A6B", fontSize: 22 }}>Admin</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
          />
          {authError && <p style={{ color: "#c0392b", margin: 0, fontSize: 13 }}>{authError}</p>}
          <button type="submit" style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const embedUrl = youtubeEmbedUrl(ytInput);

  return (
    <div style={{
      padding: tab === "preview" ? 0 : "28px 28px 48px",
      maxWidth: tab === "preview" ? "100%" : 1100,
      margin: "0 auto", minHeight: "100vh",
      background: tab === "preview" ? "#0f0f1a" : "#f9f5f1",
    }}>

      {tab !== "preview" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontFamily: "Georgia, serif", color: "#8B4A6B", fontSize: 22 }}>
              James &amp; Sharon — Admin
            </h1>
            <button
              onClick={() => { fetch("/api/admin/auth", { method: "DELETE" }); setAuthed(false); }}
              style={{ fontSize: 12, color: "#bbb", background: "none", border: "none", cursor: "pointer" }}
            >
              Sign out
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
            {(["guests", "logs", "flags", "live", "control", "preview"] as Tab[]).map((t) => (
              <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>
                {t === "live" ? "🔴 Live Stream"
                  : t === "control" ? "⚙️ Site Control"
                  : t === "preview" ? "👁 Preview"
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            {(["guests", "logs", "flags"] as Tab[]).includes(tab) && (
              <button
                onClick={() => load(tab)}
                style={{ marginLeft: "auto", fontSize: 12, color: "#8B4A6B", background: "none", border: "none", cursor: "pointer" }}
              >
                ↻ Refresh
              </button>
            )}
          </div>
        </>
      )}

      {/* ── GUESTS ── */}
      {tab === "guests" && (
        <>
          {loading && <p style={{ color: "#bbb", fontSize: 13 }}>Loading…</p>}
          {!loading && (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <thead>
                <tr>{["Name", "City", "Devices", "First visit", "Last seen", "Inv. seen", "Owner"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td style={td}>{g.name}</td>
                    <td style={td}>{g.city}</td>
                    <td style={td}>{g.device_count}</td>
                    <td style={td}>{new Date(g.created_at).toLocaleDateString()}</td>
                    <td style={td}>{new Date(g.last_seen_at).toLocaleDateString()}</td>
                    <td style={td}>{g.invitation_seen ? "✓" : "—"}</td>
                    <td style={td}>
                      <button
                        onClick={() => toggleOwner(g)}
                        style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, border: "1px solid #8B4A6B", background: g.is_owner ? "#8B4A6B" : "transparent", color: g.is_owner ? "#fff" : "#8B4A6B", cursor: "pointer" }}
                      >
                        {g.is_owner ? "Owner ✓" : "Set owner"}
                      </button>
                    </td>
                  </tr>
                ))}
                {guests.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, color: "#ccc", textAlign: "center", padding: 32 }}>No guests yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── LOGS ── */}
      {tab === "logs" && (
        <>
          <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
            <input
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder="Filter by guest name…"
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, width: 220 }}
            />
            <button
              onClick={() => load("logs")}
              style={{ padding: "8px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
            >
              Search
            </button>
          </div>
          {loading && <p style={{ color: "#bbb", fontSize: 13 }}>Loading…</p>}
          {!loading && (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <thead>
                <tr>{["Time", "Guest", "Event", "Data", "IP"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={td}>{new Date(l.created_at).toLocaleString()}</td>
                    <td style={td}>{((l.guests as unknown) as { name: string } | null)?.name ?? "—"}</td>
                    <td style={td}><code style={{ fontSize: 12 }}>{l.event_type}</code></td>
                    <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.event_data ? JSON.stringify(l.event_data) : "—"}
                    </td>
                    <td style={td}>{l.ip ?? "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} style={{ ...td, color: "#ccc", textAlign: "center", padding: 32 }}>No logs</td></tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── FLAGS ── */}
      {tab === "flags" && (
        <>
          {loading && <p style={{ color: "#bbb", fontSize: 13 }}>Loading…</p>}
          {!loading && (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <thead>
                <tr>{["Device (short)", "Reason", "IP", "Blocked until", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {flags.map((f) => (
                  <tr key={f.id}>
                    <td style={td}><code style={{ fontSize: 12 }}>{f.device_uuid.slice(0, 8)}</code></td>
                    <td style={td}>{f.reason}</td>
                    <td style={td}>{f.ip ?? "—"}</td>
                    <td style={td}>{new Date(f.blocked_until).toLocaleString()}</td>
                    <td style={td}>
                      <button
                        onClick={() => unblock(f)}
                        style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, border: "1px solid #c0392b", color: "#c0392b", background: "transparent", cursor: "pointer" }}
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
                {flags.length === 0 && (
                  <tr><td colSpan={5} style={{ ...td, color: "#ccc", textAlign: "center", padding: 32 }}>No active blocks</td></tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── LIVE STREAM ── */}
      {tab === "live" && (
        <div style={{ maxWidth: 680 }}>
          <div style={card}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#1a1a1a" }}>YouTube Live URL</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>
              Paste any YouTube URL — watch link, share link, or embed URL. Guests on the Wedding Day page will see this stream automatically once saved.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                style={inputStyle}
                value={ytInput}
                onChange={(e) => { setYtInput(e.target.value); setYtSaved(false); }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <button style={saveBtn(ytSaving, ytSaved)} onClick={saveYoutube} disabled={ytSaving}>
                {ytSaved ? "Saved ✓" : ytSaving ? "Saving…" : "Save"}
              </button>
            </div>

            {ytInput.trim() && !embedUrl && (
              <p style={{ marginTop: 12, fontSize: 13, color: "#e67e22" }}>
                ⚠️ Couldn&apos;t parse a video ID — check the URL format.
              </p>
            )}

            {embedUrl && (
              <div style={{ marginTop: 20, borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
                <iframe
                  src={embedUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube preview"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SITE CONTROL ── */}
      {tab === "control" && (
        <div style={{ maxWidth: 680 }}>

          <div style={card}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#1a1a1a" }}>Phase Override</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>
              Force all guests into a specific phase of the site — useful to flip everyone to the live stream at the right moment on the wedding day. Set back to <strong>Auto-detect</strong> when done.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PHASES.map((p) => {
                const active = (settings.phase_override ?? "auto") === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => savePhase(p.value)}
                    disabled={phaseSaving}
                    style={{
                      padding: "9px 18px", borderRadius: 20, border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                      background: active ? "#8B4A6B" : "#ede8e2",
                      color: active ? "#fff" : "#555",
                      opacity: phaseSaving ? 0.6 : 1,
                    }}
                  >
                    {p.label}{active ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
            {settings.phase_override && settings.phase_override !== "auto" && (
              <p style={{ marginTop: 14, fontSize: 13, color: "#c0392b", fontWeight: 600 }}>
                ⚠️ Site is currently forced to <strong>{settings.phase_override}</strong> for all guests.
              </p>
            )}
          </div>

          <div style={card}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#1a1a1a" }}>Announcement Banner</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>
              Shows a banner at the top of the site for all guests. Leave blank to hide it. E.g. &quot;Stream starting in 10 minutes — refresh now!&quot;
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                style={inputStyle}
                value={annoInput}
                onChange={(e) => { setAnnoInput(e.target.value); setAnnoSaved(false); }}
                placeholder="Stream starting in 10 minutes — refresh now!"
              />
              <button style={saveBtn(annoSaving, annoSaved)} onClick={saveAnnouncement} disabled={annoSaving}>
                {annoSaved ? "Saved ✓" : annoSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {annoInput.trim() && (
              <div style={{ marginTop: 14, padding: "10px 16px", background: "#8B4A6B", borderRadius: 8, color: "#fff", fontSize: 13 }}>
                Preview: {annoInput}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {tab === "preview" && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setTab("guests")}
            style={{
              position: "fixed", top: 14, right: 20, zIndex: 9999,
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "6px 14px",
              fontSize: 12, cursor: "pointer", backdropFilter: "blur(8px)",
            }}
          >
            ← Back to Admin
          </button>
          <iframe
            src="/preview"
            style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
            title="Site preview"
          />
        </div>
      )}
    </div>
  );
}
