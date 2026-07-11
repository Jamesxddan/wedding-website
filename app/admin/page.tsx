"use client";

import { useState, useEffect, useCallback } from "react";
import { useTrackPageVisit } from "@/lib/useTrackPageVisit";

type Tab = "guests" | "logs" | "flags" | "live" | "control" | "preview" | "admins" | "audit";

interface Guest {
  id: string;
  name: string;
  city: string;
  invitation_seen: boolean;
  is_owner: boolean;
  created_at: string;
  last_seen_at: string;
  device_count: number;
  photo_downloads: number;
  last_device_ua: string | null;
}

interface LogRow {
  id: string;
  guest_id: string | null;
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

interface Admin {
  id: string;
  email: string;
  is_super: boolean;
  added_by: string | null;
  created_at: string;
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

function TestAlertButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  async function send() {
    setStatus("sending");
    const res = await fetch("/api/admin/test-alert", { method: "POST" });
    setStatus(res.ok ? "sent" : "error");
    setTimeout(() => setStatus("idle"), 4000);
  }
  return (
    <button
      onClick={send}
      disabled={status === "sending"}
      style={{
        padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
        fontSize: 13, fontWeight: 600,
        background: status === "sent" ? "#2ecc71" : status === "error" ? "#e74c3c" : "#8B4A6B",
        color: "#fff", opacity: status === "sending" ? 0.6 : 1, transition: "background 0.2s",
      }}
    >
      {status === "sending" ? "Sending…" : status === "sent" ? "Sent ✓ — check your inbox" : status === "error" ? "Failed — check RESEND_API_KEY" : "Send test alert"}
    </button>
  );
}

export default function AdminPage() {
  useTrackPageVisit("admin");
  const [authed, setAuthed] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("guests");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const [settings, setSettings] = useState<Settings>({});
  const [ytCeremonyInput, setYtCeremonyInput] = useState("");
  const [ytCeremonySaving, setYtCeremonySaving] = useState(false);
  const [ytCeremonySaved, setYtCeremonySaved] = useState(false);
  const [ytReceptionInput, setYtReceptionInput] = useState("");
  const [ytReceptionSaving, setYtReceptionSaving] = useState(false);
  const [ytReceptionSaved, setYtReceptionSaved] = useState(false);
  const [annoInput, setAnnoInput] = useState("");
  const [annoSaving, setAnnoSaving] = useState(false);
  const [annoSaved, setAnnoSaved] = useState(false);
  const [phaseSaving, setPhaseSaving] = useState(false);

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsSuper, setNewIsSuper] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Check if already logged in on mount
  useEffect(() => {
    fetch("/api/admin/me").then(async (r) => {
      if (r.ok) {
        const { email, is_super } = await r.json();
        setAdminEmail(email);
        setIsSuper(is_super);
        setTab(is_super ? "guests" : "live");
        setAuthed(true);
      }
      setSessionChecked(true);
    }).catch(() => setSessionChecked(true));
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) return;
    const data: Settings = await res.json();
    setSettings(data);
    setYtCeremonyInput(data.youtube_ceremony_url ?? "");
    setYtReceptionInput(data.youtube_reception_url ?? "");
    setAnnoInput(data.announcement ?? "");
  }, []);

  const loadAdmins = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins(await res.json());
  }, []);

  const load = useCallback(async (t: Tab) => {
    if (t === "live" || t === "control") { await loadSettings(); return; }
    if (t === "preview" || t === "audit") return;
    if (t === "admins") { await loadAdmins(); return; }
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
  }, [logFilter, loadSettings, loadAdmins]);

  useEffect(() => { if (authed) load(tab); }, [authed, tab, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput, password }),
    });
    setAuthLoading(false);
    if (res.ok) {
      const data = await res.json();
      setAdminEmail(data.email);
      setIsSuper(data.is_super);
      setTab(data.is_super ? "guests" : "live");
      setAuthed(true);
    } else {
      const err = await res.json().catch(() => ({}));
      setAuthError(err.error ?? "Wrong email or password");
    }
  }

  async function signOut() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
    setIsSuper(false);
    setAdminEmail("");
    setEmailInput("");
    setPassword("");
  }

  async function saveSetting(key: string, value: string) {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    await loadSettings();
  }

  async function saveCeremonyUrl() {
    setYtCeremonySaving(true);
    await saveSetting("youtube_ceremony_url", ytCeremonyInput.trim());
    setYtCeremonySaving(false); setYtCeremonySaved(true);
    setTimeout(() => setYtCeremonySaved(false), 2500);
  }

  async function saveReceptionUrl() {
    setYtReceptionSaving(true);
    await saveSetting("youtube_reception_url", ytReceptionInput.trim());
    setYtReceptionSaving(false); setYtReceptionSaved(true);
    setTimeout(() => setYtReceptionSaved(false), 2500);
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

  async function deleteGuest(g: Guest) {
    if (!confirm(`Delete ${g.name} completely?\n\nThis removes their guest record, all sessions, logs, breach flags, and gallery events. They will be treated as a brand new device.\n\nThis cannot be undone.`)) return;
    const res = await fetch("/api/admin/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to delete guest");
      return;
    }
    await load("guests");
  }

  async function factoryReset() {
    const first = confirm("💥 FACTORY RESET\n\nThis will permanently delete:\n• All guests\n• All sessions\n• All logs\n• All breach flags\n• All gallery events\n\nAdmin accounts and settings are kept.\n\nAre you absolutely sure?");
    if (!first) return;
    const second = confirm("Second confirmation required.\n\nThere is NO undo. All guest data will be gone forever.\n\nProceed with factory reset?");
    if (!second) return;
    const res = await fetch("/api/admin/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factory_reset: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Factory reset failed");
      return;
    }
    await savePhase("FIRST_VISIT");
    await load("guests");
  }

  async function resetAllSessions() {
    if (!confirm("Reset ALL guest sessions? Every guest will be logged out and must re-register. This cannot be undone.")) return;
    const res = await fetch("/api/admin/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to reset sessions");
      return;
    }
    await load("guests");
  }

  async function freshStartAll() {
    if (!confirm("Force fresh start for ALL guests?\n\n• All sessions will be deleted\n• Registration form will open for everyone\n\nEvery guest will need to re-register. Remember to set phase back to Auto-detect when done. This cannot be undone.")) return;
    // 1. Delete all device fingerprints
    const delRes = await fetch("/api/admin/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!delRes.ok) { alert("Failed to reset sessions"); return; }
    // 2. Set phase override to FIRST_VISIT (registration form)
    await savePhase("FIRST_VISIT");
    await load("guests");
  }

  async function clearGuestLogs(guest_id: string, name: string) {
    if (!confirm(`Clear all logs for ${name}? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/logs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to clear logs");
      return;
    }
    await load("logs");
  }

  async function unblock(f: Flag) {
    await fetch("/api/admin/flags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id }),
    });
    load("flags");
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminSaving(true);
    setAdminError("");
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPassword, is_super: newIsSuper, added_by: adminEmail }),
    });
    setAdminSaving(false);
    if (res.ok) {
      setNewEmail(""); setNewPassword(""); setNewIsSuper(false);
      await loadAdmins();
    } else {
      const err = await res.json().catch(() => ({}));
      setAdminError(err.error ?? "Failed to add admin");
    }
  }

  async function removeAdmin(id: string) {
    const res = await fetch("/api/admin/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to remove admin");
      return;
    }
    await loadAdmins();
  }

  async function toggleSuper(a: Admin) {
    const res = await fetch("/api/admin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, is_super: !a.is_super }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to update admin");
      return;
    }
    await loadAdmins();
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

  if (!sessionChecked) return null;

  if (!authed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9f5f1" }}>
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 14, width: 300 }}>
          <h2 style={{ margin: 0, fontFamily: "Georgia, serif", color: "#8B4A6B", fontSize: 22 }}>Admin</h2>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
          />
          {authError && <p style={{ color: "#c0392b", margin: 0, fontSize: 13 }}>{authError}</p>}
          <button
            type="submit"
            disabled={authLoading}
            style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: authLoading ? "default" : "pointer", fontSize: 14 }}
          >
            {authLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  function parseUA(ua: string | null): string {
    if (!ua) return "—";
    if (/iPhone/.test(ua)) { const m = ua.match(/iPhone OS ([\d_]+)/); return `iPhone · iOS ${m ? m[1].replace(/_/g, ".") : ""}`; }
    if (/iPad/.test(ua)) return "iPad";
    if (/Android/.test(ua)) { const m = ua.match(/Android ([\d.]+)/); return `Android ${m ? m[1] : ""}`; }
    if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) { const m = ua.match(/Mac OS X ([\d_]+)/); return `macOS ${m ? m[1].replace(/_/g, ".") : ""}`; }
    if (/Windows NT 10/.test(ua)) return "Windows 10/11";
    if (/Windows/.test(ua)) return "Windows";
    if (/Linux/.test(ua)) return "Linux";
    return ua.slice(0, 30);
  }

  const superTabs: { key: Tab; label: string }[] = [
    { key: "guests", label: "Guests" },
    { key: "logs", label: "Logs" },
    { key: "flags", label: "Flags" },
    { key: "live", label: "🔴 Live Stream" },
    { key: "control", label: "⚙️ Site Control" },
    { key: "preview", label: "👁 Preview" },
    { key: "admins", label: "🔑 Admins" },
    { key: "audit", label: "📋 Audit Log" },
  ];

  const regularTabs: { key: Tab; label: string }[] = [
    { key: "live", label: "🔴 Live Stream" },
    { key: "control", label: "⚙️ Site Control" },
    { key: "preview", label: "👁 Preview" },
  ];

  const visibleTabs = isSuper ? superTabs : regularTabs;
  const ceremonyEmbedUrl = youtubeEmbedUrl(ytCeremonyInput);
  const receptionEmbedUrl = youtubeEmbedUrl(ytReceptionInput);

  const p = isMobile ? "12px 14px 40px" : "28px 28px 48px";

  return (
    <div style={{
      padding: tab === "preview" ? 0 : p,
      maxWidth: tab === "preview" ? "100%" : 1100,
      margin: "0 auto", minHeight: "100vh",
      background: tab === "preview" ? "#0f0f1a" : "#f9f5f1",
    }}>

      {tab !== "preview" && (
        <>
          <div style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: isMobile ? 6 : 0,
            marginBottom: 18,
          }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: "Georgia, serif", color: "#8B4A6B", fontSize: isMobile ? 18 : 22 }}>
                James &amp; Sharon — Admin
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#bbb" }}>
                {adminEmail}{isSuper ? " · Super Admin" : ""}
              </p>
            </div>
            <button
              onClick={signOut}
              style={{ fontSize: 12, color: "#bbb", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Sign out
            </button>
          </div>

          <div style={{
            display: "flex", gap: 8, marginBottom: 20, alignItems: "center",
            overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
            paddingBottom: 4,
          }}>
            {visibleTabs.map(({ key, label }) => (
              <button key={key} style={tabBtn(key)} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
            {(["guests", "logs", "flags"] as Tab[]).includes(tab) && (
              <button
                onClick={() => load(tab)}
                style={{ marginLeft: "auto", fontSize: 12, color: "#8B4A6B", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
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
          {isSuper && (
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={resetAllSessions}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 10, border: "1px solid #c0392b", color: "#c0392b", background: "transparent", cursor: "pointer", fontWeight: 600 }}
              >
                ⚠️ Reset ALL Sessions
              </button>
              <button
                onClick={freshStartAll}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 10, border: "none", color: "#fff", background: "#c0392b", cursor: "pointer", fontWeight: 600 }}
              >
                🔄 Fresh Start (Reset + Open Form)
              </button>
              <button
                onClick={factoryReset}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 10, border: "none", color: "#fff", background: "#1a1a1a", cursor: "pointer", fontWeight: 600 }}
              >
                💥 Factory Reset
              </button>
            </div>
          )}
          {loading && <p style={{ color: "#bbb", fontSize: 13 }}>Loading…</p>}
          {!loading && (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"], borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", minWidth: 640 }}>
              <thead>
                <tr>{["Name", "City", "Device", "Devices", "First visit", "Last seen", "Inv. seen", "📷", "Owner", ...(isSuper ? [""] : [])].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td style={td}>{g.name}</td>
                    <td style={td}>{g.city}</td>
                    <td style={{ ...td, fontSize: 12, color: "#888" }}>{parseUA(g.last_device_ua)}</td>
                    <td style={td}>{g.device_count}</td>
                    <td style={td}>{new Date(g.created_at).toLocaleDateString()}</td>
                    <td style={td}>{new Date(g.last_seen_at).toLocaleDateString()}</td>
                    <td style={td}>{g.invitation_seen ? "✓" : "—"}</td>
                    <td style={td}>{g.photo_downloads > 0 ? g.photo_downloads : "—"}</td>
                    <td style={td}>
                      <button
                        onClick={() => toggleOwner(g)}
                        style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, border: "1px solid #8B4A6B", background: g.is_owner ? "#8B4A6B" : "transparent", color: g.is_owner ? "#fff" : "#8B4A6B", cursor: "pointer" }}
                      >
                        {g.is_owner ? "Owner ✓" : "Set owner"}
                      </button>
                    </td>
                    {isSuper && (
                      <td style={td}>
                        <button
                          onClick={() => deleteGuest(g)}
                          style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, border: "1px solid #c0392b", color: "#c0392b", background: "transparent", cursor: "pointer" }}
                        >
                          Delete guest
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {guests.length === 0 && (
                  <tr><td colSpan={isSuper ? 10 : 9} style={{ ...td, color: "#ccc", textAlign: "center", padding: 32 }}>No guests yet</td></tr>
                )}
              </tbody>
            </table>
            </div>
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
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"], borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", minWidth: 560 }}>
              <thead>
                <tr>{["Time", "Guest", "Event", "Data", "IP", ...(isSuper ? [""] : [])].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const guestName = ((l.guests as unknown) as { name: string } | null)?.name ?? "—";
                  const guestId = l.guest_id;
                  const isRelinkFail = l.event_type === "relink_failed";
                  return (
                  <tr key={l.id} style={isRelinkFail ? { background: "#fff8f0" } : undefined}>
                    <td style={td}>{new Date(l.created_at).toLocaleString()}</td>
                    <td style={td}>{guestName}</td>
                    <td style={td}>
                      <code style={{ fontSize: 12, color: isRelinkFail ? "#e67e22" : undefined }}>{l.event_type}</code>
                      {isRelinkFail && isSuper && (
                        <button
                          onClick={() => savePhase("INVITATION")}
                          title="Open registration form for all guests"
                          style={{ marginLeft: 8, background: "#e67e22", border: "none", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                        >
                          Open form
                        </button>
                      )}
                    </td>
                    <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.event_data ? JSON.stringify(l.event_data) : "—"}
                    </td>
                    <td style={td}>{l.ip ?? "—"}</td>
                    {isSuper && (
                      <td style={{ ...td, textAlign: "center" }}>
                        {guestId && (
                          <button
                            onClick={() => clearGuestLogs(guestId, guestName)}
                            style={{ background: "none", border: "1px solid #e8a0a0", color: "#c0392b", borderRadius: 6, padding: "2px 10px", fontSize: 12, cursor: "pointer" }}
                          >
                            Clear logs
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr><td colSpan={isSuper ? 6 : 5} style={{ ...td, color: "#ccc", textAlign: "center", padding: 32 }}>No logs</td></tr>
                )}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}

      {/* ── FLAGS ── */}
      {tab === "flags" && (
        <>
          {loading && <p style={{ color: "#bbb", fontSize: 13 }}>Loading…</p>}
          {!loading && (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"], borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", minWidth: 480 }}>
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
            </div>
          )}
        </>
      )}

      {/* ── LIVE STREAM ── */}
      {tab === "live" && (
        <div style={{ maxWidth: 680 }}>

          {/* Ceremony */}
          <div style={card}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#1a1a1a" }}>⛪ Ceremony — St Andrews Kirk</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>
              YouTube URL for the ceremony live stream. Guests see this automatically on the Wedding Day page.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                style={{ ...inputStyle, minWidth: 0 }}
                value={ytCeremonyInput}
                onChange={(e) => { setYtCeremonyInput(e.target.value); setYtCeremonySaved(false); }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <button style={saveBtn(ytCeremonySaving, ytCeremonySaved)} onClick={saveCeremonyUrl} disabled={ytCeremonySaving}>
                {ytCeremonySaved ? "Saved ✓" : ytCeremonySaving ? "Saving…" : "Save"}
              </button>
            </div>
            {ytCeremonyInput.trim() && !ceremonyEmbedUrl && (
              <p style={{ marginTop: 10, fontSize: 13, color: "#e67e22" }}>⚠️ Couldn&apos;t parse a video ID — check the URL.</p>
            )}
            {ceremonyEmbedUrl && (
              <div style={{ marginTop: 18, borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
                <iframe src={ceremonyEmbedUrl} style={{ width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title="Ceremony preview" />
              </div>
            )}
          </div>

          {/* Reception */}
          <div style={card}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#1a1a1a" }}>🎉 Reception — BKN Auditorium</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#888" }}>
              YouTube URL for the reception live stream. Guests see this automatically on the Wedding Day page.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                style={{ ...inputStyle, minWidth: 0 }}
                value={ytReceptionInput}
                onChange={(e) => { setYtReceptionInput(e.target.value); setYtReceptionSaved(false); }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <button style={saveBtn(ytReceptionSaving, ytReceptionSaved)} onClick={saveReceptionUrl} disabled={ytReceptionSaving}>
                {ytReceptionSaved ? "Saved ✓" : ytReceptionSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {ytReceptionInput.trim() && !receptionEmbedUrl && (
              <p style={{ marginTop: 10, fontSize: 13, color: "#e67e22" }}>⚠️ Couldn&apos;t parse a video ID — check the URL.</p>
            )}
            {receptionEmbedUrl && (
              <div style={{ marginTop: 18, borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
                <iframe src={receptionEmbedUrl} style={{ width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title="Reception preview" />
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

          {isSuper && (
            <div style={card}>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#1a1a1a" }}>Test Email Alert</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>
                Sends a dummy breach alert to your inbox to verify Resend is configured correctly.
              </p>
              <TestAlertButton />
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW ── */}
      {tab === "preview" && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setTab(isSuper ? "guests" : "live")}
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

      {/* ── ADMINS ── */}
      {tab === "admins" && (
        <div style={{ maxWidth: 780 }}>

          <div style={card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#1a1a1a" }}>Add Admin</h3>
            <form onSubmit={addAdmin} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 200px" }}>
                <label style={{ fontSize: 12, color: "#888" }}>Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 160px" }}>
                <label style={{ fontSize: 12, color: "#888" }}>Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  required
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#555", cursor: "pointer", paddingBottom: 2 }}>
                <input
                  type="checkbox"
                  checked={newIsSuper}
                  onChange={(e) => setNewIsSuper(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                Super Admin
              </label>
              <button
                type="submit"
                disabled={adminSaving}
                style={{ padding: "9px 20px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: adminSaving ? "default" : "pointer" }}
              >
                {adminSaving ? "Adding…" : "+ Add"}
              </button>
            </form>
            {adminError && <p style={{ marginTop: 10, color: "#c0392b", fontSize: 13, margin: "10px 0 0" }}>{adminError}</p>}
          </div>

          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"], borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", minWidth: 500 }}>
            <thead>
              <tr>{["Email", "Role", "Added by", "Date", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td style={td}>
                    {a.email}
                    {a.email === adminEmail && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "#8B4A6B", background: "#f0e8f0", padding: "1px 7px", borderRadius: 10 }}>you</span>
                    )}
                  </td>
                  <td style={td}>
                    {a.is_super
                      ? <span style={{ color: "#8B4A6B", fontWeight: 600 }}>★ Super</span>
                      : <span style={{ color: "#888" }}>Regular</span>}
                  </td>
                  <td style={{ ...td, color: "#aaa" }}>{a.added_by ?? "—"}</td>
                  <td style={{ ...td, color: "#aaa" }}>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td style={{ ...td, display: "flex", gap: 8 }}>
                    <button
                      onClick={() => toggleSuper(a)}
                      style={{ fontSize: 12, padding: "3px 10px", borderRadius: 10, border: "1px solid #8B4A6B", color: "#8B4A6B", background: "transparent", cursor: "pointer" }}
                    >
                      {a.is_super ? "Demote" : "Make Super"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${a.email}? Their session will end immediately.`)) removeAdmin(a.id);
                      }}
                      style={{ fontSize: 12, padding: "3px 10px", borderRadius: 10, border: "1px solid #c0392b", color: "#c0392b", background: "transparent", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan={5} style={{ ...td, color: "#ccc", textAlign: "center", padding: 32 }}>No admins yet</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      {tab === "audit" && isSuper && <AuditTab />}
    </div>
  );
}

function AuditTab() {
  const [rows, setRows] = useState<{ id: string; admin_email: string; action: string; details: Record<string, unknown> | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontSize: 12, color: "#888", fontWeight: 600, borderBottom: "1px solid #eee", background: "#faf9f7" };
  const td: React.CSSProperties = { padding: "10px 14px", fontSize: 13, color: "#333", borderBottom: "1px solid #f0ede9", verticalAlign: "top" };

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#1a1a1a" }}>Admin Audit Log</h2>
        <span style={{ fontSize: 12, color: "#aaa" }}>Read-only · Cannot be deleted</span>
      </div>
      {loading && <p style={{ color: "#bbb", fontSize: 13 }}>Loading…</p>}
      <div style={{ overflowX: "auto", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", minWidth: 600 }}>
          <thead>
            <tr>
              {["When", "Admin", "Action", "Details"].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ ...td, color: "#aaa", whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={td}>{r.admin_email}</td>
                <td style={td}>
                  <span style={{ padding: "2px 8px", borderRadius: 10, background: "#f0e8f0", color: "#8B4A6B", fontWeight: 600, fontSize: 12 }}>
                    {r.action}
                  </span>
                </td>
                <td style={{ ...td, color: "#777", fontSize: 12, fontFamily: "monospace" }}>
                  {r.details ? JSON.stringify(r.details) : "—"}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={4} style={{ ...td, color: "#ccc", textAlign: "center", padding: 32 }}>No audit entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
