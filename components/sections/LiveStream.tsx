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
  /** Same frame with its dark window transparent - used on phones, laid over a video filling the window. */
  frameOverlaySrc?: string;
  /** Shown in the frame's window while there is no URL yet (e.g. "The live stream will start at 4:30 PM").
   *  Without it, a player with no URL renders nothing. */
  comingSoon?: string;
}

// Where the video sits inside /images/stream-frame.webp (1536×1024): the dark window to the right of the
// couple's photo, as a true 16:9 box (930×523 px at 482,292), so the photo and flowers stay visible.
const FRAME_ASPECT = "1536 / 1024";
const FRAME_VIDEO_BOX = { left: "31.38%", top: "28.52%", width: "60.55%", height: "51.07%" } as const;
// Phones: the video fills the whole dark window (1121×732 px at 302,188) and the cut-out couple photo from
// /images/stream-frame-overlay.webp sits on top - keeps the video as wide as a plain phone player.
const FRAME_WINDOW_BOX = { left: "19.66%", top: "18.36%", width: "72.98%", height: "71.48%" } as const;

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

export default function LiveStream({ url, label, channel, delaySeconds = 0, frameSrc, frameOverlaySrc, comingSoon }: Props) {
  const [ready, setReady] = useState(delaySeconds <= 0);
  // The desktop frame leaves the video ~60% of the width - too small on a phone, so phones use the overlay
  // layout (or the plain player if no overlay is given). Starts false so server and client HTML match.
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

  if (!url && !comingSoon) return null;

  // No link yet (admin hasn't pasted it): show the note inside the frame's window instead of a video.
  // The page re-reads the admin settings every minute, so this turns into the player by itself.
  if (!url) {
    return (
      <AnimatedSection variant="blur-in" as="div">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "rgba(181,101,118,0.45)" }} />
            <h3 className="font-heading text-xl text-deep-rose">{channel}</h3>
          </div>
          <p className="font-body text-deep-rose/70 text-sm">{label}</p>
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-lg"
            style={frameSrc
              ? { aspectRatio: FRAME_ASPECT, backgroundImage: `url(${frameSrc})`, backgroundSize: "100% 100%" }
              : { aspectRatio: "16 / 9", background: "#0a0a0a" }}
          >
            <div
              className="absolute flex flex-col items-center justify-center text-center rounded-md"
              style={{ ...(frameSrc ? FRAME_VIDEO_BOX : { left: 0, top: 0, width: "100%", height: "100%" }), background: "#0a0a0a", padding: "4%" }}
            >
              <span style={{ fontSize: "clamp(16px, 4vw, 30px)", lineHeight: 1, marginBottom: "4%" }}>🕊️</span>
              <span className="font-heading" style={{ color: "#f5e6c8", fontSize: "clamp(11px, 2.4vw, 20px)", lineHeight: 1.3 }}>
                {comingSoon}
              </span>
              <span className="font-body" style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(8px, 1.4vw, 12px)", marginTop: "3%", letterSpacing: 1 }}>
                This will turn into the live video automatically
              </span>
            </div>
          </div>
        </div>
      </AnimatedSection>
    );
  }

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
        ) : youtubeId && frameSrc && frameOverlaySrc ? (
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-lg"
            style={{ aspectRatio: FRAME_ASPECT, backgroundImage: `url(${frameSrc})`, backgroundSize: "100% 100%" }}
          >
            <div className="absolute overflow-hidden" style={{ ...FRAME_WINDOW_BOX, background: "#000" }}>
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
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, letterSpacing: 2 }}>Stream loading…</span>
                </div>
              )}
            </div>
            {/* couple photo + flowers on top; taps pass through to the video */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frameOverlaySrc} alt="" aria-hidden className="absolute inset-0 w-full h-full pointer-events-none select-none" />
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
