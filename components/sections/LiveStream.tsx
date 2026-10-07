"use client";

import { useState, useEffect } from "react";
import AnimatedSection from "@/components/ui/AnimatedSection";

interface Props {
  url: string;
  label: string;
  channel: string;
  delaySeconds?: number;
  /** Optional photo frame drawn around the player (e.g. /images/stream-frame.webp). */
  frameSrc?: string;
}

// Where the video sits inside /images/stream-frame.webp (1536×1024): the dark window to the right of the
// couple's photo, as a true 16:9 box (930×523 px at 482,292), so the photo and flowers stay visible.
const FRAME_ASPECT = "1536 / 1024";
const FRAME_VIDEO_BOX = { left: "31.38%", top: "28.52%", width: "60.55%", height: "51.07%" } as const;

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

export default function LiveStream({ url, label, channel, delaySeconds = 0, frameSrc }: Props) {
  const [ready, setReady] = useState(delaySeconds <= 0);
  // The frame leaves the video ~60% of the width - fine on a laptop, too small on a phone. Phones get the
  // plain full-width player. Starts false so server and first client render match (no hydration error).
  const [wideScreen, setWideScreen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setWideScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (delaySeconds <= 0) { setReady(true); return; }
    const t = setTimeout(() => setReady(true), delaySeconds * 1000);
    return () => clearTimeout(t);
  }, [delaySeconds]);

  if (!url) return null;

  const youtubeId = extractYoutubeId(url);

  return (
    <AnimatedSection variant="blur-in" as="div">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <h3 className="font-heading text-xl text-deep-rose">{channel}</h3>
        </div>
        <p className="font-body text-deep-rose/70 text-sm">{label}</p>

        {youtubeId && frameSrc && wideScreen ? (
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-lg"
            style={{ aspectRatio: FRAME_ASPECT, backgroundImage: `url(${frameSrc})`, backgroundSize: "100% 100%" }}
          >
            <div className="absolute overflow-hidden rounded-md" style={{ ...FRAME_VIDEO_BOX, background: "#000" }}>
              {ready ? (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
                  title={channel}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, letterSpacing: 2 }}>Stream loading…</span>
                </div>
              )}
            </div>
          </div>
        ) : youtubeId ? (
          <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ paddingBottom: "56.25%" }}>
            {ready ? (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
                title={channel}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "#0a0a0a" }}
              >
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, letterSpacing: 2 }}>
                  Stream loading…
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Non-YouTube URL — show Watch Live button */
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-deep-rose text-cream font-heading tracking-widest uppercase text-sm hover:opacity-90 transition-opacity self-start"
          >
            <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
            Watch Live
          </a>
        )}
      </div>
    </AnimatedSection>
  );
}
