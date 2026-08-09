"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePhase, OWNER_PREVIEW_ERROR_KEY } from "@/lib/usePhase";
import { Phase } from "@/lib/phase";
import { getOrCreateDeviceUUID, getBrowserSignalsHash } from "@/lib/fingerprint";
import { useTrackPageVisit } from "@/lib/useTrackPageVisit";
import { SiteContentProvider } from "@/lib/SiteContentContext";
import { safeSetItem, safeGetItem } from "@/lib/storage";

// Statically loaded — shown immediately on first/return visit
import OpeningScreen from "@/components/phases/OpeningScreen";
import InvitationCard from "@/components/phases/InvitationCard";

// Lazy-loaded — only needed after phase resolves or user explores
const CountdownHero   = dynamic(() => import("@/components/phases/CountdownHero"),   { ssr: false });
const WeddingDayBanner = dynamic(() => import("@/components/phases/WeddingDayBanner"), { ssr: false });
const PostWeddingHero  = dynamic(() => import("@/components/phases/PostWeddingHero"),  { ssr: false });
const Gallery     = dynamic(() => import("@/components/sections/Gallery"),     { ssr: false });
const AboutSection = dynamic(() => import("@/components/sections/AboutSection"), { ssr: false });
const Families    = dynamic(() => import("@/components/sections/Families"),    { ssr: false });
const Venue       = dynamic(() => import("@/components/sections/Venue"),       { ssr: false });
const Comments    = dynamic(() => import("@/components/sections/Comments"),    { ssr: false });
const Footer      = dynamic(() => import("@/components/ui/Footer"),            { ssr: false });
const Marquee     = dynamic(() => import("@/components/ui/Marquee"),           { ssr: false });
const BackgroundMusic = dynamic(() => import("@/components/ui/BackgroundMusic"), { ssr: false });
const WeddingDayTeaser = dynamic(() => import("@/components/ui/WeddingDayTeaser"), { ssr: false });
const OwnerPhaseSwitcher = dynamic(() => import("@/components/ui/OwnerPhaseSwitcher"), { ssr: false });
const BackgroundSlideshow = dynamic(() => import("@/components/ui/BackgroundSlideshow"), { ssr: false });
const ScrollFloralDivider = dynamic(() => import("@/components/ui/OrnamentalMotifs").then(m => ({ default: m.ScrollFloralDivider })), { ssr: false });

function RelinkForm({ onSuccess, initialName, initialCity }: { onSuccess: () => void; initialName?: string; initialCity?: string }) {
  const [name, setName] = useState(initialName ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [step, setStep] = useState<"lookup" | "verify">("lookup");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<"email" | "phone" | "none" | null>(null);
  const [verifyHint, setVerifyHint] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Owner-only, this-device-only preview of the relink failure states.
  useEffect(() => {
    try {
      const preview = sessionStorage.getItem(OWNER_PREVIEW_ERROR_KEY);
      if (preview === "relink_not_found") {
        setStep("lookup");
        setErrorMsg("Name not found — check spelling or contact James & Sharon.");
        setStatus("error");
      } else if (preview === "relink_mismatch") {
        setVerifyMethod("email");
        setVerifyHint("j***@example.com");
        setStep("verify");
        setErrorMsg("That doesn't match what we have on file — please check and try again.");
        setStatus("error");
      }
    } catch {}
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/relink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), city: city.trim(), lookup: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error === "not_found" ? "Name not found — check spelling or contact James & Sharon." : "Something went wrong, please try again.");
        setStatus("error");
        return;
      }
      setVerifyMethod(data.method);
      setVerifyHint(data.hint ?? "");
      // No verification needed — complete relink directly
      if (data.method === "none") {
        await completeRelink(name.trim(), city.trim(), "", "");
        return;
      }
      setStep("verify");
      setStatus("idle");
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (verifyMethod === "email" && !verifyEmail.trim()) return;
    if (verifyMethod === "phone" && !verifyPhone.trim()) return;
    setStatus("loading");
    await completeRelink(name.trim(), city.trim(), verifyEmail.trim(), verifyPhone.trim());
  }

  async function completeRelink(fullName: string, fullCity: string, relinkEmail: string, relinkPhone: string) {
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const browser_signals_hash = await getBrowserSignalsHash();
      const res = await fetch("/api/relink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          city: fullCity,
          email: relinkEmail || undefined,
          phone: relinkPhone || undefined,
          device_uuid,
          browser_signals_hash,
          user_agent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "phone_mismatch" || data.error === "email_mismatch") {
          setErrorMsg("That doesn't match what we have on file — please check and try again.");
        } else if (data.error === "phone_required") {
          setErrorMsg("Please enter the phone number you registered with.");
        } else if (data.error === "email_required") {
          setErrorMsg("Please enter the email you registered with.");
        } else {
          setErrorMsg("Something went wrong, please try again.");
        }
        setStatus("error");
        return;
      }
      safeSetItem("guest_name", data.name);
      safeSetItem("guest_city", data.city);
      safeSetItem("session_token", data.session_token);
      if (data.invitation_seen) safeSetItem("invitation_seen", "true");
      onSuccess();
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  // Reset to lookup step if user changes name/city
  function handleNameChange(val: string) {
    setName(val);
    if (step === "verify") { setStep("lookup"); setErrorMsg(""); setStatus("idle"); }
  }
  function handleCityChange(val: string) {
    setCity(val);
    if (step === "verify") { setStep("lookup"); setErrorMsg(""); setStatus("idle"); }
  }

  if (step === "verify") {
    return (
      <div style={{ textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e8ddd4" }}>
        <p style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>Welcome back, {name}!</p>
        <p style={{ fontSize: 12, color: "#bbb", marginBottom: 16 }}>
          {verifyMethod === "phone"
            ? `Verify with your phone number ending in ${verifyHint}`
            : `Verify with your email (${verifyHint})`}
        </p>
        <form onSubmit={handleVerify} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 480, margin: "0 auto" }}>
          {verifyMethod === "email" ? (
            <input
              value={verifyEmail}
              onChange={e => { setVerifyEmail(e.target.value); setStatus("idle"); }}
              placeholder="Your email address"
              type="email"
              required
              style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
            />
          ) : (
            <input
              value={verifyPhone}
              onChange={e => { setVerifyPhone(e.target.value); setStatus("idle"); }}
              placeholder="Your phone number"
              type="tel"
              required
              style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
            />
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#8B4A6B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: status === "loading" ? 0.6 : 1 }}
          >
            {status === "loading" ? "Verifying…" : "Verify & Continue"}
          </button>
        </form>
        {status === "error" && <p style={{ marginTop: 12, fontSize: 13, color: "#c0392b" }}>{errorMsg}</p>}
        <button
          onClick={() => { setStep("lookup"); setErrorMsg(""); setStatus("idle"); }}
          style={{ marginTop: 10, background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
        >
          ← Not you? Try a different name
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e8ddd4" }}>
      <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Already a guest? Re-enter your details to continue.</p>
      <form onSubmit={handleLookup} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 480, margin: "0 auto" }}>
        <input
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="Your name"
          required
          style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
        />
        <input
          value={city}
          onChange={e => handleCityChange(e.target.value)}
          placeholder="Your city"
          required
          style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#8B4A6B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: status === "loading" ? 0.6 : 1 }}
        >
          {status === "loading" ? "Checking…" : "Continue"}
        </button>
      </form>
      {status === "error" && <p style={{ marginTop: 12, fontSize: 13, color: "#c0392b" }}>{errorMsg}</p>}
    </div>
  );
}

export default function Home() {
  const { phase, guestName, guestCity, guestId, isOwner, isLoading, refresh, sessionRestored, relinkPending, relinkRequiredPreview, acknowledgeInvitation } = usePhase();
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [showRsvpNudge, setShowRsvpNudge] = useState(false);
  const [pillDismissed, setPillDismissed] = useState(false);
  const [previewBlocked, setPreviewBlocked] = useState(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unverified device (real relink flow, or owner preview of it) — show only
  // the identity-verification form. No photos, gallery, wall of love, or any
  // other guest content until they've confirmed who they are.
  const isRelinkOnly =
    (relinkPending || relinkRequiredPreview || (process.env.NEXT_PUBLIC_VERCEL_ENV !== "production" && !guestName)) &&
    process.env.NEXT_PUBLIC_DISABLE_RELINK !== "true";

  // Owner-only, this-device-only preview of the breach/rate-limit banner.
  useEffect(() => {
    try {
      setPreviewBlocked(sessionStorage.getItem(OWNER_PREVIEW_ERROR_KEY) === "blocked");
    } catch {}
  }, []);

  useEffect(() => {
    if (phase !== Phase.RETURN_VISIT) return;
    const t = setTimeout(() => setPillDismissed(true), 7400);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== Phase.RETURN_VISIT || !guestId || isRelinkOnly) return;
    // Don't nudge if already dismissed this session
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("rsvp_nudge_dismissed")) return;

    const token = safeGetItem("session_token");
    const headers: HeadersInit = token ? { "x-session-token": token } : {};
    fetch("/api/rsvp", { headers })
      .then(r => r.ok ? r.json() : null)
      .then((d: { rsvp: unknown } | null) => {
        if (!d?.rsvp) {
          nudgeTimerRef.current = setTimeout(() => setShowRsvpNudge(true), 4000);
        }
      })
      .catch(() => {});

    return () => { if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current); };
  }, [phase, guestId, isRelinkOnly]);

  // RETURN_VISIT is the countdown/pre-wedding page — log as "PRE_WEDDING" to distinguish from INVITATION in event_data
  useTrackPageVisit(isLoading ? null : (phase === Phase.RETURN_VISIT ? "PRE_WEDDING" : phase));

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-5">
          {/* Floral bloom */}
          <div className="relative w-20 h-20" style={{ animation: "float-flower 3s ease-in-out infinite" }}>
            {/* Petals */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <div
                key={angle}
                className="absolute"
                style={{
                  left: "calc(50% - 11px)",
                  top: "calc(50% - 11px)",
                  width: 22, height: 22,
                  transform: `rotate(${angle}deg)`,
                  animation: `bloom-petal 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + i * 0.08}s forwards`,
                  transformOrigin: "center center",
                }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: "radial-gradient(circle at 40% 40%, #F4C2C2, #B56576)",
                    transform: "translateY(-18px)",
                  }}
                />
              </div>
            ))}
            {/* Center */}
            <div
              className="absolute rounded-full"
              style={{
                width: 14, height: 14,
                left: "calc(50% - 7px)",
                top: "calc(50% - 7px)",
                background: "radial-gradient(circle at 35% 35%, #F5E6C8, #D4AF37)",
                boxShadow: "0 0 8px rgba(212,175,55,0.4), 0 0 20px rgba(212,175,55,0.15)",
                animation: "pulse-core 2s ease-in-out infinite",
              }}
            />
            {/* Subtle shimmer ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: 48, height: 48,
                left: "calc(50% - 24px)",
                top: "calc(50% - 24px)",
                border: "1px solid rgba(212,175,55,0.12)",
                animation: "shimmer-spin 4s linear infinite",
              }}
            />
          </div>
          <p className="font-script italic text-deep-rose/50 text-lg">
            preparing your invitation…
          </p>
        </div>
      </main>
    );
  }

  return (
    <SiteContentProvider>
    <main className="min-h-screen bg-cream">
      <BackgroundMusic />

      {previewBlocked && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          background: "linear-gradient(135deg, #7a1a2e 0%, #a83050 100%)",
          color: "#ffe8ec",
          padding: "10px 16px",
          textAlign: "center",
          fontFamily: "var(--font-body, Georgia, serif)",
          fontSize: 12.5,
          boxShadow: "0 2px 16px rgba(120,20,40,0.4)",
        }}>
          🚫 It looks like you&apos;ve visited a few times already — please check back in a little while. We can&apos;t wait to celebrate with you! 🌸
        </div>
      )}

      {phase === Phase.FIRST_VISIT && (
        <OpeningScreen onComplete={() => { refresh(); }} />
      )}

      {phase === Phase.INVITATION && (
        <InvitationCard guestName={guestName ?? "Friend"} guestId={guestId} onExplore={() => { acknowledgeInvitation(); refresh(); }} />
      )}

      {phase === Phase.RETURN_VISIT && isRelinkOnly && (
        <>
          <InvitationCard guestName={guestName ?? "Friend"} guestId={guestId} onExplore={() => {}} />
          <div style={{ padding: "24px 16px 48px" }}>
            <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
              <RelinkForm onSuccess={() => { acknowledgeInvitation(); refresh(); }} initialName={guestName ?? undefined} initialCity={guestCity ?? undefined} />
            </div>
          </div>
        </>
      )}

      {phase === Phase.RETURN_VISIT && !isRelinkOnly && (
        <>
          {/* Wedding-day teaser pill — fixed below nav, auto-hides after 7s */}
          {!pillDismissed && (
            <div
              style={{
                position: "fixed", top: 68, left: "50%", transform: "translateX(-50%)",
                zIndex: 40,
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 12px 7px 16px",
                borderRadius: 99,
                background: "linear-gradient(135deg, #7a1a2e 0%, #a83050 100%)",
                boxShadow: "0 2px 16px rgba(120,20,40,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
                color: "#ffd6de",
                fontFamily: "var(--font-body, Georgia, serif)",
                fontSize: 11,
                letterSpacing: "0.03em",
                lineHeight: 1.35,
                whiteSpace: "nowrap",
                userSelect: "none",
                animation: "pill-in 0.4s ease both, pill-out 0.4s ease 7s both",
              }}
            >
              <span style={{ fontSize: 13 }}>🗓️</span>
              <span>
                <strong style={{ fontWeight: 700, letterSpacing: "0.06em" }}>October 8</strong>
                {" — this page transforms with live streams & surprises"}
              </span>
              <button
                onClick={() => setPillDismissed(true)}
                style={{
                  background: "none", border: "none", color: "rgba(255,214,222,0.6)",
                  fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1,
                  marginLeft: 4,
                }}
                aria-label="Dismiss"
              >×</button>
              <style>{`
                @keyframes pill-in { from { opacity:0; transform:translateX(-50%) translateY(-8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
                @keyframes pill-out { from { opacity:1; } to { opacity:0; pointer-events:none; } }
              `}</style>
            </div>
          )}
          <BackgroundSlideshow />
          <CountdownHero guestName={guestName ?? "Friend"} sessionRestored={sessionRestored} onViewInvitation={() => setShowInvitationModal(true)} />
          <Marquee />
          <Gallery folder="engagement" title="Engagement Gallery" />
          <ScrollFloralDivider />
          <AboutSection />
          <ScrollFloralDivider />
          <Families />
          <ScrollFloralDivider />
          <Venue />
          <ScrollFloralDivider />
          <Comments guestName={guestName} guestId={guestId} isOwner={isOwner} />
          <Footer />
          <WeddingDayTeaser guestName={guestName} guestId={guestId} onOpenInvitation={() => setShowInvitationModal(true)} />
        </>
      )}

      {phase === Phase.WEDDING_DAY && (
        <WeddingDayBanner guestName={guestName ?? "Friend"} onViewInvitation={() => setShowInvitationModal(true)} />
      )}

      {phase === Phase.POST_WEDDING && (
        <PostWeddingHero guestName={guestName ?? "Friend"} />
      )}
      {/* RSVP nudge — shown to logged-in guests who haven't RSVP'd yet */}
      {showRsvpNudge && !showInvitationModal && !isRelinkOnly && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 900,
            background: "rgba(15,8,5,0.78)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px 20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRsvpNudge(false);
              sessionStorage.setItem("rsvp_nudge_dismissed", "1");
            }
          }}
        >
          <div style={{
            background: "linear-gradient(160deg, #2a1410 0%, #1e0e0b 100%)",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: 18,
            padding: "36px 32px",
            maxWidth: 380,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.08)",
            position: "relative",
          }}>
            {/* Dismiss X */}
            <button
              onClick={() => {
                setShowRsvpNudge(false);
                sessionStorage.setItem("rsvp_nudge_dismissed", "1");
              }}
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none",
                color: "rgba(253,246,236,0.3)", fontSize: 20,
                cursor: "pointer", lineHeight: 1, padding: 4,
              }}
              aria-label="Dismiss"
            >×</button>

            {/* Icon */}
            <div style={{ fontSize: 38, marginBottom: 16 }}>💌</div>

            {/* Heading */}
            <h2 style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: "clamp(1.1rem, 3vw, 1.4rem)",
              color: "#D4AF37",
              margin: "0 0 10px",
              letterSpacing: "0.03em",
            }}>
              You haven&apos;t RSVP&apos;d yet
            </h2>

            {/* Body */}
            <p style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "rgba(253,246,236,0.6)",
              lineHeight: 1.65,
              margin: "0 0 24px",
            }}>
              We need your response to plan seating, meals, and the day.
              It only takes a moment — please let us know if you&apos;re joining us!
            </p>

            {/* Primary CTA */}
            <button
              onClick={() => {
                setShowRsvpNudge(false);
                setShowInvitationModal(true);
              }}
              style={{
                width: "100%",
                padding: "13px",
                background: "linear-gradient(135deg, #5a1f2e 0%, #8B4A6B 100%)",
                border: "none", borderRadius: 12,
                color: "#fef9f0",
                fontFamily: "Georgia, serif",
                fontSize: 11, letterSpacing: "2.5px",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: "0 4px 18px rgba(90,31,46,0.35)",
                marginBottom: 10,
              }}
            >
              Open Invitation &amp; RSVP
            </button>

            {/* Secondary — remind later */}
            <button
              onClick={() => {
                setShowRsvpNudge(false);
                sessionStorage.setItem("rsvp_nudge_dismissed", "1");
              }}
              style={{
                background: "none", border: "none",
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 12,
                color: "rgba(253,246,236,0.3)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Remind me next time
            </button>
          </div>
        </div>
      )}

      {showInvitationModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(20,10,8,0.72)", backdropFilter: "blur(10px)",
            overflowY: "auto", display: "flex", flexDirection: "column",
          }}
        >
          <button
            onClick={() => setShowInvitationModal(false)}
            style={{
              position: "fixed", top: 16, left: 20, zIndex: 1001,
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.85)", borderRadius: 24,
              padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              backdropFilter: "blur(8px)", letterSpacing: "0.03em",
            }}
          >
            ← Back
          </button>
          <InvitationCard
            guestName={guestName ?? "Friend"}
            guestId={guestId}
            onExplore={() => { acknowledgeInvitation(); setShowInvitationModal(false); }}
          />
        </div>
      )}
      {/* Sub-owner-only preview switcher — gear icon bottom-left */}
      {isOwner && !isLoading && (
        <OwnerPhaseSwitcher currentPhase={phase} />
      )}
    </main>
    </SiteContentProvider>
  );
}
