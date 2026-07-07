"use client";

import { useState, useEffect, useCallback } from "react";

type Tab = "guests" | "logs" | "flags";

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

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("guests");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: Tab) => {
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
  }, [logFilter]);

  useEffect(() => {
    if (authed) load(tab);
  }, [authed, tab, load]);

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
    padding: "7px 18px", borderRadius: 20, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600,
    background: tab === t ? "#8B4A6B" : "#ede8e2",
    color: tab === t ? "#fff" : "#555",
  });

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
          <button
            type="submit"
            style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: "0 auto", minHeight: "100vh", background: "#f9f5f1" }}>
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

      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        {(["guests", "logs", "flags"] as Tab[]).map((t) => (
          <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          onClick={() => load(tab)}
          style={{ marginLeft: "auto", fontSize: 12, color: "#8B4A6B", background: "none", border: "none", cursor: "pointer" }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && <p style={{ color: "#bbb", fontSize: 13 }}>Loading…</p>}

      {!loading && tab === "guests" && (
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

      {!loading && tab === "logs" && (
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
        </>
      )}

      {!loading && tab === "flags" && (
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
    </div>
  );
}
