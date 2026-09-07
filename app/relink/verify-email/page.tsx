"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDeviceUUID, getBrowserSignalsHash } from "@/lib/fingerprint";
import { safeSetItem } from "@/lib/storage";

type Step = "email" | "code";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 3;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendCount, setSendCount] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); };
  }, []);

  function startCooldown() {
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const res = await fetch("/api/relink/email-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), device_uuid }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "disposable_email") {
          setErrorMsg("Please use a permanent email address (temporary/disposable addresses aren't supported).");
        } else if (data.error === "invalid_email") {
          setErrorMsg("Please enter a valid email address.");
        } else if (data.error === "rate_limited") {
          setErrorMsg("Too many attempts — please try again later, or contact James & Sharon directly.");
        } else {
          setErrorMsg("Something went wrong, please try again.");
        }
        setStatus("error");
        return;
      }
      setSendCount((c) => c + 1);
      startCooldown();
      setStep("code");
      setStatus("idle");
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const browser_signals_hash = await getBrowserSignalsHash();
      const res = await fetch("/api/relink/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          device_uuid,
          browser_signals_hash,
          user_agent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "expired_or_missing") {
          setErrorMsg("That code expired — please resend.");
          setCooldownSeconds(0);
        } else if (data.error === "max_attempts") {
          setErrorMsg("Too many incorrect attempts — please request a new code.");
          setCode("");
        } else if (data.error === "invalid_code") {
          setErrorMsg(`Incorrect code (${data.attempts_remaining} attempt${data.attempts_remaining === 1 ? "" : "s"} remaining).`);
        } else {
          setErrorMsg("Something went wrong, please try again.");
        }
        setStatus("error");
        return;
      }

      if (data.status === "relinked") {
        safeSetItem("guest_name", data.name);
        safeSetItem("guest_city", data.city);
        safeSetItem("session_token", data.session_token);
        safeSetItem("invitation_seen", "true");
      } else {
        sessionStorage.setItem("verified_relink_email", data.email);
      }
      router.push("/");
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  const resendDisabled = status === "loading" || cooldownSeconds > 0 || sendCount >= MAX_SENDS_PER_HOUR;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9f5f1", padding: 20 }}>
      <div style={{ width: 340, textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px", fontFamily: "Georgia, serif", color: "#8B4A6B", fontSize: 20 }}>Verify your email</h2>

        {step === "email" && (
          <>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 18 }}>
              We&apos;ll send a 6-digit code to confirm it&apos;s really you.
            </p>
            <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, opacity: status === "loading" ? 0.6 : 1 }}
              >
                {status === "loading" ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 18 }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 20, letterSpacing: 6, textAlign: "center" }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, opacity: status === "loading" ? 0.6 : 1 }}
              >
                {status === "loading" ? "Verifying…" : "Verify"}
              </button>
            </form>
            <button
              onClick={() => sendCode()}
              disabled={resendDisabled}
              style={{ marginTop: 12, background: "none", border: "none", color: resendDisabled ? "#ccc" : "#8B4A6B", fontSize: 12, cursor: resendDisabled ? "default" : "pointer", textDecoration: resendDisabled ? "none" : "underline" }}
            >
              {cooldownSeconds > 0
                ? `Resend code (${cooldownSeconds}s)`
                : sendCount >= MAX_SENDS_PER_HOUR
                ? "Resend limit reached — try again later"
                : "Resend code"}
            </button>
            <button
              onClick={() => { setStep("email"); setCode(""); setErrorMsg(""); setStatus("idle"); }}
              style={{ marginTop: 10, background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer", textDecoration: "underline", display: "block", margin: "10px auto 0" }}
            >
              ← use a different email
            </button>
          </>
        )}

        {status === "error" && errorMsg && (
          <p style={{ marginTop: 14, fontSize: 13, color: "#c0392b" }}>{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
