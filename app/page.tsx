"use client";

import { useState } from "react";
import { usePhase } from "@/lib/usePhase";
import { Phase } from "@/lib/phase";
import OpeningScreen from "@/components/phases/OpeningScreen";
import InvitationCard from "@/components/phases/InvitationCard";
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

export default function Home() {
  const { phase, guestName, isLoading } = usePhase();
  const [showInvitation, setShowInvitation] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-deep-rose font-script italic text-2xl animate-pulse">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <BackgroundMusic src="/song.mp3" />
      {(phase === Phase.FIRST_VISIT && !showInvitation) && (
        <OpeningScreen onComplete={(name) => { setSubmittedName(name); setShowInvitation(true); }} />
      )}

      {(showInvitation || phase === Phase.INVITATION) && (
        <InvitationCard guestName={submittedName ?? guestName ?? "Friend"} />
      )}

      {phase === Phase.RETURN_VISIT && (
        <>
          <CountdownHero guestName={guestName ?? "Friend"} />
          <Marquee />
          <Gallery folder="engagement" title="Engagement Gallery" />
          <OurStory />
          <Reveal><AboutJames /></Reveal>
          <Reveal delay={100}><AboutSharon /></Reveal>
          <Families />
          <Venue />
          <Itinerary />
          <Comments />
          <Footer />
        </>
      )}

      {phase === Phase.WEDDING_DAY && (
        <WeddingDayBanner guestName={guestName ?? "Friend"} />
      )}

      {phase === Phase.POST_WEDDING && (
        <PostWeddingHero guestName={guestName ?? "Friend"} />
      )}
    </main>
  );
}
