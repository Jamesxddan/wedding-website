"use client";

import { useState, useEffect } from "react";
import { buildGoogleCalendarUrl, buildIcsDataUrl } from "@/lib/calendar";
import PetalScene from "@/components/webgl/PetalScene";

interface Props {
  guestName: string;
  onExplore: () => void;
}

export default function InvitationCard({ guestName, onExplore }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 300);
    return () => clearTimeout(t);
  }, []);

  function handleExplore() {
    localStorage.setItem("invitation_seen", "true");
    onExplore();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 overflow-hidden bg-cream">
      {/* Aurora background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 520, height: 320,
            top: "5%", left: "-10%",
            background: "radial-gradient(ellipse, rgba(244,194,194,0.45) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "aurora-1 12s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 260,
            top: "20%", right: "-8%",
            background: "radial-gradient(ellipse, rgba(139,94,131,0.3) 0%, transparent 70%)",
            filter: "blur(55px)",
            animation: "aurora-2 16s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 460, height: 200,
            bottom: "10%", left: "20%",
            background: "radial-gradient(ellipse, rgba(196,165,130,0.35) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "aurora-3 14s ease-in-out infinite",
          }}
        />
      </div>

      <PetalScene />

      <div className="relative z-10 w-full max-w-lg" style={{ perspective: "1200px" }}>
        {/* Envelope flap */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 origin-top z-10 rounded-t-xl"
          style={{
            transformStyle: "preserve-3d",
            transform: open ? "rotateX(-180deg)" : "rotateX(0deg)",
            transition: "transform 700ms ease-in-out",
            background: "linear-gradient(135deg, #F5E6C8 50%, #F4C2C2 100%)",
          }}
        />

        {/* Card body */}
        <div
          className="relative bg-white rounded-xl shadow-2xl border border-champagne overflow-hidden"
          style={{
            transform: open ? "translateY(0)" : "translateY(40px)",
            opacity: open ? 1 : 0,
            transition: "transform 700ms ease-in-out, opacity 700ms ease-in-out",
            transitionDelay: open ? "400ms" : "0ms",
          }}
        >
          <div className="h-2 bg-gradient-to-r from-blush via-champagne to-sage" />

          <div className="p-10 flex flex-col gap-6 text-center">
            <p
              className="font-script italic text-deep-rose text-lg"
              style={{ animationName: open ? "blur-reveal" : "none", animationDuration: "0.9s", animationTimingFunction: "ease", animationFillMode: "both", animationDelay: "500ms" }}
            >
              Dear {guestName},
            </p>

            <p
              className="font-body text-deep-rose/80 leading-relaxed"
              style={{ animationName: open ? "blur-reveal" : "none", animationDuration: "0.9s", animationTimingFunction: "ease", animationFillMode: "both", animationDelay: "650ms" }}
            >
              We greet you in the name of the Lord Jesus Christ. With great joy
              in our hearts, we invite you to celebrate the wedding of
            </p>

            <div
              style={{ animationName: open ? "blur-reveal" : "none", animationDuration: "1s", animationTimingFunction: "ease", animationFillMode: "both", animationDelay: "800ms" }}
            >
              <h1 className="font-heading text-4xl text-deep-rose">
                James Daniel &amp; Sharon
              </h1>
              <p className="font-script italic text-sage text-xl mt-1">
                &ldquo;God&apos;s will was on our marriage&rdquo;
              </p>
            </div>

            <div
              className="border-t border-b border-champagne py-4 flex flex-col gap-1"
              style={{ animationName: open ? "blur-reveal" : "none", animationDuration: "0.9s", animationTimingFunction: "ease", animationFillMode: "both", animationDelay: "1000ms" }}
            >
              <p className="font-heading text-deep-rose tracking-widest text-sm uppercase">
                October 8th, 2026
              </p>
              <p className="font-body text-deep-rose/70 text-sm">
                St Andrews Kirk, Chennai &mdash; Ceremony
              </p>
              <p className="font-body text-deep-rose/70 text-sm">
                BKN Auditorium, Chennai &mdash; Reception
              </p>
            </div>

            <p
              className="font-body text-deep-rose/80 text-sm"
              style={{ animationName: open ? "blur-reveal" : "none", animationDuration: "0.9s", animationTimingFunction: "ease", animationFillMode: "both", animationDelay: "1150ms" }}
            >
              Your presence is greatly needed and deeply cherished. 🌸
            </p>

            <div className="flex flex-col gap-3">
              <p className="font-heading text-deep-rose text-xs tracking-widest uppercase">
                Save the date
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href={buildGoogleCalendarUrl(guestName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 rounded-full border border-deep-rose text-deep-rose font-body text-sm hover:bg-blush/30 transition-colors"
                >
                  Google Calendar
                </a>
                <a
                  href={buildIcsDataUrl(guestName)}
                  download="james-sharon-wedding.ics"
                  className="px-5 py-2 rounded-full border border-deep-rose text-deep-rose font-body text-sm hover:bg-blush/30 transition-colors"
                >
                  Apple / Windows Calendar
                </a>
              </div>
            </div>

            <button
              onClick={handleExplore}
              className="mt-2 px-8 py-3 rounded-full bg-deep-rose text-cream font-heading tracking-widest uppercase text-sm hover:opacity-90 transition-opacity"
            >
              Explore the wedding website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
