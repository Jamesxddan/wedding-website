"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function AdminEmailPage() {
  const params = useParams();
  const router = useRouter();
  const email = decodeURIComponent(params.email as string);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Wrong password");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9f5f1" }}>
      <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 14, width: 300 }}>
        <h2 style={{ margin: 0, fontFamily: "Georgia, serif", color: "#8B4A6B", fontSize: 22 }}>Admin</h2>
        <div style={{ padding: "10px 14px", background: "#f0e8f0", borderRadius: 8, fontSize: 13, color: "#8B4A6B", wordBreak: "break-all" }}>
          {email}
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
        />
        {error && <p style={{ color: "#c0392b", margin: 0, fontSize: 13 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer", fontSize: 14 }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <a href="/admin" style={{ textAlign: "center", fontSize: 12, color: "#bbb", textDecoration: "none" }}>
          Go to main admin →
        </a>
      </form>
    </div>
  );
}
