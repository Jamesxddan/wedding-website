"use client";

import { useState } from "react";
import { usePhase } from "@/lib/usePhase";
import { Phase } from "@/lib/phase";
import FirstVisitForm from "@/components/phases/FirstVisitForm";
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

export default function Home() {
  const { phase, guestName, isLoading } = usePhase();
  const [showInvitation, setShowInvitation] = useState(false);

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
      {(phase === Phase.FIRST_VISIT && !showInvitation) && (
        <section className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
          <div className="text-center">
            <h1 className="font-heading text-5xl text-deep-rose mb-2">James &amp; Sharon</h1>
            <p className="font-script italic text-xl text-sage">are getting married!</p>
          </div>
          <FirstVisitForm onComplete={() => setShowInvitation(true)} />
        </section>
      )}

      {(showInvitation || phase === Phase.INVITATION) && (
        <InvitationCard guestName={guestName ?? "Friend"} />
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
