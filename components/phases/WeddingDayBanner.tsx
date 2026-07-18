"use client";

import { useState, useEffect } from "react";
import { KIRK_STREAM_URL, BKN_STREAM_URL } from "@/lib/constants";
import Nav from "@/components/ui/Nav";
import LiveStream from "@/components/sections/LiveStream";
import CabDialog, { type CabMode } from "@/components/ui/CabDialog";
import Footer from "@/components/ui/Footer";
import Gallery from "@/components/sections/Gallery";
import Venue from "@/components/sections/Venue";
import Comments from "@/components/sections/Comments";

interface Props {
  guestName: string;
  onViewInvitation?: () => void;
}

const STREAM_DELAY = 4;

export default function WeddingDayBanner({ guestName, onViewInvitation }: Props) {
  const [cabMode, setCabMode] = useState<CabMode>(null);
  const [kirkUrl, setKirkUrl] = useState(KIRK_STREAM_URL);
  const [bknUrl, setBknUrl] = useState(BKN_STREAM_URL);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.youtube_ceremony_url) setKirkUrl(data.youtube_ceremony_url);
        if (data.youtube_reception_url) setBknUrl(data.youtube_reception_url);
      })
      .catch(() => {});
  }, []);

  const hasKirk = !!kirkUrl;
  const hasBKN = !!bknUrl;
  const hasAnyStream = hasKirk || hasBKN;

  return (
    <>
      <Nav />

      {/* Hero banner */}
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center bg-gradient-to-br from-blush via-cream to-champagne px-6 pt-24 pb-16 text-center gap-6">
        <div className="absolute inset-0 opacity-20 pointer-events-none select-none flex items-center justify-center text-[20rem] leading-none">
          🕊️
        </div>
        <span className="relative font-heading text-xs tracking-widest uppercase text-sage">
          Today is the day
        </span>
        <h1 className="relative font-heading text-5xl md:text-7xl text-deep-rose leading-none">
          James &amp; Sharon
        </h1>
        <p className="relative font-script italic text-deep-rose/80 text-2xl">
          are getting married right now! 🎉
        </p>
        <p className="relative font-body text-deep-rose/70 text-lg">
          Dear {guestName}, we are so glad you are here with us today.
        </p>

        {/* Ride booking buttons */}
        <div className="relative flex flex-col items-center gap-4 mt-4">
          <p className="font-body text-deep-rose/60 text-sm">
            If you need help joining us today, please use the options below
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setCabMode("to-venue")}
              className="px-6 py-3 rounded-full bg-deep-rose text-cream font-heading tracking-widest uppercase text-sm hover:opacity-90 transition-opacity"
            >
              Get a ride to the venue
            </button>
            <button
              onClick={() => setCabMode("home")}
              className="px-6 py-3 rounded-full border border-deep-rose text-deep-rose font-heading tracking-widest uppercase text-sm hover:bg-blush/30 transition-colors"
            >
              Book a ride home
            </button>
            <button
              onClick={() => setCabMode("ceremony-to-reception")}
              className="px-6 py-3 rounded-full border border-sage text-sage font-heading tracking-widest uppercase text-sm hover:bg-sage/10 transition-colors"
            >
              Ceremony to Reception
            </button>
          </div>
        </div>

        {onViewInvitation && (
          <button
            onClick={onViewInvitation}
            className="relative font-body text-sm font-semibold tracking-widest px-6 py-2.5 rounded-full border border-deep-rose/30 text-deep-rose/70 hover:border-deep-rose/60 hover:text-deep-rose transition-colors"
          >
            💌 View the Invitation
          </button>
        )}
      </section>

      {/* Live streams */}
      {hasAnyStream && (
        <section className="py-20 px-6 bg-white">
          <div className="max-w-4xl mx-auto flex flex-col gap-16">
            <div className="text-center">
              <h2 className="font-heading text-4xl text-deep-rose mb-3">Watch Live</h2>
              <p className="font-script italic text-sage text-xl">
                Wherever you are, you are with us
              </p>
            </div>

            <LiveStream
              url={kirkUrl}
              channel="St Andrews Kirk"
              label="Watch the ceremony live from St Andrews Kirk"
              delaySeconds={STREAM_DELAY}
            />
            <LiveStream
              url={bknUrl}
              channel="BKN Auditorium"
              label="Watch the reception live from BKN Auditorium"
              delaySeconds={STREAM_DELAY}
            />
          </div>
        </section>
      )}

      {!hasAnyStream && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center border border-dashed border-champagne rounded-2xl p-12">
            <span className="text-4xl">📡</span>
            <p className="font-heading text-deep-rose text-lg">Live streams coming soon</p>
            <p className="font-body text-deep-rose/60 text-sm max-w-xs">
              Stream links will appear here once the media teams go live.
            </p>
          </div>
        </section>
      )}

      {/* Venue maps — still visible on wedding day */}
      <Venue />

      {/* Gallery */}
      <Gallery folder="engagement" title="Engagement Gallery" />

      {/* Comments */}
      <Comments />

      <Footer />

      {/* Cab dialog */}
      {cabMode && (
        <CabDialog mode={cabMode} onClose={() => setCabMode(null)} />
      )}
    </>
  );
}
