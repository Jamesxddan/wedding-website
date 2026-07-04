"use client";

import { useState } from "react";
import { KIRK_STREAM_URL, BKN_STREAM_URL } from "@/lib/constants";
import Nav from "@/components/ui/Nav";
import LiveStream from "@/components/sections/LiveStream";
import CabDialog from "@/components/ui/CabDialog";
import Gallery from "@/components/sections/Gallery";
import Venue from "@/components/sections/Venue";
import Comments from "@/components/sections/Comments";

type CabMode = "to-venue" | "home" | null;

interface Props {
  guestName: string;
}

const hasKirk = !!KIRK_STREAM_URL;
const hasBKN = !!BKN_STREAM_URL;
const hasAnyStream = hasKirk || hasBKN;

export default function WeddingDayBanner({ guestName }: Props) {
  const [cabMode, setCabMode] = useState<CabMode>(null);

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

        {/* Cab booking buttons */}
        <div className="relative flex flex-col items-center gap-4 mt-4">
          <p className="font-body text-deep-rose/60 text-sm">
            If you need help joining us today, please use the options below
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setCabMode("to-venue")}
              className="px-6 py-3 rounded-full bg-deep-rose text-cream font-heading tracking-widest uppercase text-sm hover:opacity-90 transition-opacity"
            >
              🚗 Get a ride to the venue
            </button>
            <button
              onClick={() => setCabMode("home")}
              className="px-6 py-3 rounded-full border border-deep-rose text-deep-rose font-heading tracking-widest uppercase text-sm hover:bg-blush/30 transition-colors"
            >
              🏠 Book a ride home
            </button>
          </div>
        </div>
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
              url={KIRK_STREAM_URL}
              channel="St Andrews Kirk"
              label="Watch the ceremony live from St Andrews Kirk"
            />
            <LiveStream
              url={BKN_STREAM_URL}
              channel="BKN Auditorium"
              label="Watch the reception live from BKN Auditorium"
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

      {/* Cab dialog */}
      {cabMode && (
        <CabDialog mode={cabMode} onClose={() => setCabMode(null)} />
      )}
    </>
  );
}
