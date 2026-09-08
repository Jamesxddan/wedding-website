"use client";

import { useState } from "react";
import { getOrCreateDeviceUUID, getBrowserSignalsHash } from "@/lib/fingerprint";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { safeSetItem } from "@/lib/storage";
import { COUPLE, WEDDING_DATE, VENUES } from "@/lib/constants";

type Step = "ask" | "otp" | "phone-fallback";

interface Props {
  guestId: string;
  guestName: string;
  guestCity: string | null;
  onConfirmed: () => void;
  onNotMe: () => void;
}

const weddingDateLabel = WEDDING_DATE.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function IdentityGate({ guestId, guestName, guestCity, onConfirmed, onNotMe }: Props) {
  const [step, setStep] = useState<Step>("ask");
  const [code, setCode] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("IN");
  const [phoneDialCode, setPhoneDialCode] = useState("+91");
  const [phoneNationalNumber, setPhoneNationalNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleYes() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const res = await fetch("/api/relink/confirm-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_id: guestId, device_uuid }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "rate_limited") {
          setErrorMsg("Too many attempts — please try again later, or contact James & Sharon directly.");
        } else {
          setErrorMsg("Something went wrong, please try again.");
        }
        setStatus("error");
        return;
      }
      if (data.needs_phone) {
        setStep("phone-fallback");
        setStatus("idle");
        return;
      }
      setEmailHint(data.email_hint ?? "");
      setStep("otp");
      setStatus("idle");
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const browser_signals_hash = await getBrowserSignalsHash();
      const res = await fetch("/api/relink/confirm-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_id: guestId,
          code: code.trim(),
          device_uuid,
          browser_signals_hash,
          user_agent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "expired_or_missing") {
          setErrorMsg("That code expired — please try again.");
        } else if (data.error === "max_attempts") {
          setErrorMsg("Too many incorrect attempts — please try again shortly.");
          setCode("");
        } else if (data.error === "invalid_code") {
          setErrorMsg(`Incorrect code (${data.attempts_remaining} attempt${data.attempts_remaining === 1 ? "" : "s"} remaining).`);
        } else {
          setErrorMsg("Something went wrong, please try again.");
        }
        setStatus("error");
        return;
      }
      safeSetItem("guest_name", data.name);
      safeSetItem("guest_city", data.city);
      safeSetItem("session_token", data.session_token);
      onConfirmed();
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNationalNumber.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const browser_signals_hash = await getBrowserSignalsHash();
      const { combineDialCode } = await import("@/lib/phone");
      const res = await fetch("/api/relink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestName,
          city: guestCity ?? "",
          phone: combineDialCode(phoneDialCode, phoneNationalNumber),
          device_uuid,
          browser_signals_hash,
          user_agent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data.error === "phone_mismatch"
            ? "That doesn't match what we have on file — please check and try again."
            : "Something went wrong, please try again."
        );
        setStatus("error");
        return;
      }
      safeSetItem("guest_name", data.name);
      safeSetItem("guest_city", data.city);
      safeSetItem("session_token", data.session_token);
      onConfirmed();
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9f5f1", padding: 20 }}>
      <div style={{ width: 360, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#c4a882", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 6 }}>
          {COUPLE.groom} &amp; {COUPLE.bride}
        </p>
        <p style={{ fontSize: 13, color: "#8B4A6B", marginBottom: 24 }}>
          {weddingDateLabel} · {VENUES.ceremony.name}, {VENUES.ceremony.city}
        </p>

        {step === "ask" && (
          <>
            <h2 style={{ margin: "0 0 18px", fontFamily: "Georgia, serif", color: "#5a1f2e", fontSize: 20 }}>
              Are you {guestName}{guestCity ? ` from ${guestCity}` : ""}?
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleYes}
                disabled={status === "loading"}
                style={{ padding: "12px 20px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: status === "loading" ? 0.6 : 1 }}
              >
                {status === "loading" ? "One moment…" : `Yes, I'm ${guestName}`}
              </button>
              <button
                onClick={onNotMe}
                disabled={status === "loading"}
                style={{ padding: "12px 20px", background: "none", color: "#8B4A6B", border: "1px solid #8B4A6B", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: status === "loading" ? 0.6 : 1 }}
              >
                No, I&apos;m someone else
              </button>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>
              To confirm it&apos;s really you, we sent a code to
            </p>
            <p style={{ fontSize: 13, color: "#5a1f2e", fontWeight: 600, marginBottom: 18 }}>{emailHint}</p>
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
              onClick={onNotMe}
              style={{ marginTop: 14, background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
            >
              This isn&apos;t me — verify with a different email
            </button>
          </>
        )}

        {step === "phone-fallback" && (
          <>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 18 }}>
              Verify with the phone number you registered with.
            </p>
            <form onSubmit={handleVerifyPhone} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <PhoneInput
                value={{ countryCode: phoneCountryCode, dialCode: phoneDialCode, nationalNumber: phoneNationalNumber }}
                onChange={(value) => {
                  setPhoneCountryCode(value.countryCode);
                  setPhoneDialCode(value.dialCode);
                  setPhoneNationalNumber(value.nationalNumber);
                }}
                placeholder="Your phone number"
                disabled={status === "loading"}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{ padding: "10px 24px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, opacity: status === "loading" ? 0.6 : 1 }}
              >
                {status === "loading" ? "Verifying…" : "Verify"}
              </button>
            </form>
            <button
              onClick={onNotMe}
              style={{ marginTop: 14, background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
            >
              This isn&apos;t me — verify with a different email
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
