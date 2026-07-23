"use client";

import { useState } from "react";
import { usePhase } from "@/lib/usePhase";
import { Phase } from "@/lib/phase";
import { getOrCreateDeviceUUID, getBrowserSignalsHash } from "@/lib/fingerprint";
import InvitationCard from "@/components/phases/InvitationCard";
import OpeningScreen from "@/components/phases/OpeningScreen";
import CountdownHero from "@/components/phases/CountdownHero";
import WeddingDayBanner from "@/components/phases/WeddingDayBanner";
import PostWeddingHero from "@/components/phases/PostWeddingHero";
import Gallery from "@/components/sections/Gallery";
import OurStory from "@/components/sections/OurStory";
import AboutJames from "@/components/sections/AboutJames";
import AboutSharon from "@/components/sections/AboutSharon";
import Families from "@/components/sections/Families";
import Venue from "@/components/sections/Venue";
import Itinerary from "@/components/sections/Itinerary";
import Comments from "@/components/sections/Comments";
import Footer from "@/components/ui/Footer";
import Marquee from "@/components/ui/Marquee";
import Reveal from "@/components/ui/Reveal";
import BackgroundMusic from "@/components/ui/BackgroundMusic";
import { useTrackPageVisit } from "@/lib/useTrackPageVisit";
import { SiteContentProvider } from "@/lib/SiteContentContext";

function RelinkForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;
    setStatus("loading");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const browser_signals_hash = await getBrowserSignalsHash();
      const res = await fetch("/api/relink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), city: city.trim(), device_uuid, browser_signals_hash, user_agent: navigator.userAgent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error === "not_found" ? "Name not found — check spelling or contact James & Sharon." : "Something went wrong, please try again.");
        setStatus("error");
        return;
      }
      localStorage.setItem("guest_name", data.name);
      localStorage.setItem("guest_city", data.city);
      localStorage.setItem("session_token", data.session_token);
      if (data.invitation_seen) localStorage.setItem("invitation_seen", "true");
      onSuccess();
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  return (
    <div style={{ textAlign: "center", padding: "32px 24px", borderTop: "1px solid #e8ddd4" }}>
      <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Already a guest? Re-enter your details to continue.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 480, margin: "0 auto" }}>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setStatus("idle"); }}
          placeholder="Your name"
          required
          style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
        />
        <input
          value={city}
          onChange={e => { setCity(e.target.value); setStatus("idle"); }}
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
  const { phase, guestName, guestId, isOwner, isLoading, refresh, sessionRestored } = usePhase();
  const [showInvitationModal, setShowInvitationModal] = useState(false);

  // RETURN_VISIT is the countdown/pre-wedding page — log as "PRE_WEDDING" to distinguish from INVITATION in event_data
  useTrackPageVisit(isLoading ? null : (phase === Phase.RETURN_VISIT ? "PRE_WEDDING" : phase));

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-5">
          {/* Animated rings */}
          <div className="relative w-16 h-16">
            <div
              className="absolute inset-0 rounded-full border-2 border-blush animate-loading-ring"
              style={{ animationDuration: "1.4s" }}
            />
            <div
              className="absolute inset-2 rounded-full border border-deep-rose/25 animate-loading-ring"
              style={{ animationDuration: "2.1s", animationDirection: "reverse" }}
            />
            <div
              className="absolute inset-[18px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(181,101,118,0.2), transparent)" }}
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
      <BackgroundMusic src="/song.mp3" />

      {phase === Phase.FIRST_VISIT && (
        <OpeningScreen onComplete={() => { refresh(); }} />
      )}

      {phase === Phase.INVITATION && (
        <InvitationCard guestName={guestName ?? "Friend"} onExplore={() => { refresh(); }} />
      )}

      {phase === Phase.RETURN_VISIT && (
        <>
          <CountdownHero guestName={guestName ?? "Friend"} sessionRestored={sessionRestored} onViewInvitation={() => setShowInvitationModal(true)} />
          {!guestName && process.env.NEXT_PUBLIC_DISABLE_RELINK !== "true" && <RelinkForm onSuccess={refresh} />}
          <Marquee />
          <Gallery folder="engagement" title="Engagement Gallery" />
          <OurStory />
          <Reveal><AboutJames /></Reveal>
          <Reveal delay={100}><AboutSharon /></Reveal>
          <Families />
          <Venue />
          <Itinerary />
          <Comments guestName={guestName} guestId={guestId} isOwner={isOwner} />
          <Footer />
        </>
      )}

      {phase === Phase.WEDDING_DAY && (
        <WeddingDayBanner guestName={guestName ?? "Friend"} onViewInvitation={() => setShowInvitationModal(true)} />
      )}

      {phase === Phase.POST_WEDDING && (
        <PostWeddingHero guestName={guestName ?? "Friend"} />
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
            onExplore={() => setShowInvitationModal(false)}
          />
        </div>
      )}
    </main>
    </SiteContentProvider>
  );
}
