"use client";

// Admin preview — renders the site in any phase mode via ?phase= URL param.
// Defaults to RETURN_VISIT (CountdownHero + all sections) when no param is set.
// Only used inside the admin panel's Preview tab iframe.

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Phase } from "@/lib/phase";
import CountdownHero from "@/components/phases/CountdownHero";
import InvitationCard from "@/components/phases/InvitationCard";
import OpeningScreen from "@/components/phases/OpeningScreen";
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
import { SiteContentProvider } from "@/lib/SiteContentContext";

function PreviewContent() {
  const searchParams = useSearchParams();
  const phaseParam = searchParams.get("phase") as Phase | null;
  const phase = phaseParam && Object.values(Phase).includes(phaseParam) ? phaseParam : Phase.RETURN_VISIT;

  const [showInvitationModal, setShowInvitationModal] = useState(false);

  return (
    <main className="min-h-screen bg-cream">
      {phase === Phase.FIRST_VISIT && (
        <OpeningScreen onComplete={() => {}} />
      )}

      {phase === Phase.INVITATION && (
        <InvitationCard guestName="Preview" onExplore={() => {}} />
      )}

      {(phase === Phase.RETURN_VISIT || !phaseParam) && (
        <>
          <CountdownHero
            guestName="Preview"
            sessionRestored={false}
            onViewInvitation={() => setShowInvitationModal(true)}
          />
          <Marquee />
          <Gallery folder="engagement" title="Engagement Gallery" />
          <OurStory />
          <Reveal><AboutJames /></Reveal>
          <Reveal delay={100}><AboutSharon /></Reveal>
          <Families />
          <Venue />
          <Itinerary />
          <Comments guestName={null} guestId={null} isOwner={false} />
          <Footer />
        </>
      )}

      {phase === Phase.WEDDING_DAY && (
        <WeddingDayBanner guestName="Preview" onViewInvitation={() => setShowInvitationModal(true)} />
      )}

      {phase === Phase.POST_WEDDING && (
        <PostWeddingHero guestName="Preview" />
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
            guestName="Preview"
            onExplore={() => setShowInvitationModal(false)}
          />
        </div>
      )}
    </main>
  );
}

export default function PreviewPage() {
  return (
    <SiteContentProvider>
      <Suspense fallback={<main className="min-h-screen bg-cream" />}>
        <PreviewContent />
      </Suspense>
    </SiteContentProvider>
  );
}
