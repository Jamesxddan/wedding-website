"use client";

import { HIGHLIGHTS_VIDEO_URL } from "@/lib/constants";
import Nav from "@/components/ui/Nav";
import Gallery from "@/components/sections/Gallery";
import Comments from "@/components/sections/Comments";
import Footer from "@/components/ui/Footer";

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? null;
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0] || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

interface Props {
  guestName: string;
}

export default function PostWeddingHero({ guestName }: Props) {
  const highlightsId = HIGHLIGHTS_VIDEO_URL ? extractYoutubeId(HIGHLIGHTS_VIDEO_URL) : null;

  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center bg-gradient-to-br from-champagne via-cream to-blush px-6 pt-28 pb-20 text-center gap-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none flex items-center justify-center text-[18rem] leading-none">
          🌸
        </div>

        <p className="relative font-script italic text-sage text-xl">
          Dear {guestName},
        </p>
        <h1 className="relative font-heading text-5xl md:text-7xl text-deep-rose leading-tight">
          Mr &amp; Mrs James Daniel
        </h1>
        <p className="relative font-script italic text-deep-rose/70 text-2xl">
          welcome you 🌸
        </p>
        <p className="relative font-body text-deep-rose/70 text-base md:text-lg max-w-xl leading-relaxed">
          Thank you for your presence, love, and prayers on our special day.
          Wedding photos will be uploaded soon — check back! Until then, enjoy
          the highlights.
        </p>
      </section>

      {/* Highlights video */}
      {highlightsId && (
        <section className="py-20 px-6 bg-white">
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            <div className="text-center">
              <h2 className="font-heading text-4xl text-deep-rose mb-3">
                Wedding Highlights
              </h2>
              <p className="font-script italic text-sage text-xl">
                Relive the joy
              </p>
            </div>
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-xl"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${highlightsId}?rel=0`}
                title="Wedding Highlights"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {!highlightsId && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center border border-dashed border-champagne rounded-2xl p-12">
            <span className="text-4xl">🎬</span>
            <p className="font-heading text-deep-rose text-lg">Highlights coming soon</p>
            <p className="font-body text-deep-rose/60 text-sm max-w-xs">
              The wedding highlights video will appear here once it is ready.
            </p>
          </div>
        </section>
      )}

      {/* Wedding photo gallery */}
      <Gallery folder="wedding" title="Wedding Gallery" />

      {/* Comments still active */}
      <Comments />
      <Footer />
    </>
  );
}
