"use client";

import { useEffect, useRef } from "react";
import FirstVisitForm from "./FirstVisitForm";
import GradientText from "@/components/ui/GradientText";
import { useSiteContent } from "@/lib/SiteContentContext";
import OpeningScene from "@/components/webgl/OpeningScene";

interface Props {
  onComplete: (name: string) => void;
}

const GOLD = "#D4AF37";
const ROSE = "#5a1f2e";
const GOLD_RGBA = (a: number) => `rgba(212,175,55,${a})`;

function Divider({ delay }: { delay: string }) {
  return (
    <div
      className="flex items-center gap-2.5"
      style={{ animation: `fade-in 0.6s ease ${delay} both` }}
    >
      <div style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.6)}, transparent)` }} />
      <div style={{ width: 5, height: 5, background: GOLD, transform: "rotate(45deg)", boxShadow: `0 0 5px ${GOLD_RGBA(0.7)}` }} />
      <div style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.6)}, transparent)` }} />
    </div>
  );
}

export default function OpeningScreen({ onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { opening } = useSiteContent();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      el.style.zoom = "1";
      // clientHeight accounts for iOS Safari URL bar; innerHeight does not
      const vh = document.documentElement.clientHeight || window.innerHeight;
      const ratio = Math.min(1, (vh - 4) / el.scrollHeight);
      el.style.zoom = String(ratio);
    };
    fit();
    // Re-fit after fonts/images/form fields settle
    const t1 = setTimeout(fit, 150);
    const t2 = setTimeout(fit, 500);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10"
      style={{
        background: [
          "radial-gradient(ellipse at 50% -10%, rgba(212,175,55,0.22) 0%, transparent 60%)",
          "radial-gradient(ellipse at 15% 85%, rgba(244,194,194,0.4) 0%, transparent 50%)",
          "radial-gradient(ellipse at 85% 75%, rgba(196,165,130,0.25) 0%, transparent 50%)",
          "linear-gradient(180deg, #fdf6ec 0%, #f5ede0 100%)",
        ].join(", "),
      }}
    >
      {/* Three.js scene: blurred photo backdrops + interactive gold & rose particles */}
      <OpeningScene />

      {/* Gold border frame */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 20, border: `1px solid ${GOLD_RGBA(0.25)}`, borderRadius: 4,
          zIndex: 1, animation: "fade-in 1.2s ease 0.3s both",
        }}
      >
        <div style={{ position: "absolute", inset: 6, border: `1px solid ${GOLD_RGBA(0.12)}`, borderRadius: 2 }} />
      </div>

      {/* Corner gems */}
      {[
        { style: { top: 22, left: 22 }, delay: "0.2s" },
        { style: { top: 22, right: 22 }, delay: "0.3s" },
        { style: { bottom: 22, left: 22 }, delay: "0.4s" },
        { style: { bottom: 22, right: 22 }, delay: "0.5s" },
      ].map((g, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            ...g.style, width: 7, height: 7, background: GOLD,
            boxShadow: `0 0 8px ${GOLD_RGBA(0.5)}`,
            animation: `gem-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${g.delay} both`,
            zIndex: 3,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-0" style={{ zIndex: 4 }}>

        {/* Rings illustration */}
        <div style={{ animation: "rings-drop 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.7s both", marginBottom: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rings.png"
            alt="Wedding rings"
            width={200}
            style={{
              mixBlendMode: "multiply",
              animation: "pulse-glow 3s ease-in-out 2s infinite",
            }}
          />
        </div>

        <Divider delay="1.5s" />

        <p
          className="font-body"
          style={{
            fontFamily: "Georgia, serif", fontStyle: "italic",
            fontSize: 12, letterSpacing: 2, color: `rgba(107,42,58,0.5)`,
            margin: "12px 0 10px", animation: "fade-up 0.7s ease 1.9s both",
          }}
        >
          {opening.tagline}
        </p>

        <div className="text-center" style={{ marginBottom: 8 }}>
          <span
            className="block"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic",
              fontSize: "clamp(38px, 13vw, 52px)", lineHeight: 1.05, color: ROSE,
              textShadow: `0 2px 20px rgba(90,31,46,0.12)`,
              whiteSpace: "nowrap",
              animation: "name-float 0.9s cubic-bezier(0.22,1,0.36,1) 2.4s both",
            }}
          >
            James
          </span>
          <div style={{
            height: 1.5, width: 0, margin: "3px auto 0", borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.7)}, transparent)`,
            animation: "underline-grow 0.7s ease 3.1s both",
          }} />
          <span
            className="block"
            style={{
              fontFamily: "Georgia, serif", fontStyle: "italic",
              fontSize: 22, color: GOLD, margin: "4px 0",
              textShadow: `0 0 16px ${GOLD_RGBA(0.5)}`,
            }}
          >
            &amp;
          </span>
          <span
            className="block"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic",
              fontSize: "clamp(38px, 13vw, 52px)", lineHeight: 1.05, color: ROSE,
              textShadow: `0 2px 20px rgba(90,31,46,0.12)`,
              whiteSpace: "nowrap",
              animation: "name-float 0.9s cubic-bezier(0.22,1,0.36,1) 2.9s both",
            }}
          >
            Sharon
          </span>
          <div style={{
            height: 1.5, width: 0, margin: "3px auto 0", borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD_RGBA(0.7)}, transparent)`,
            animation: "underline-grow 0.7s ease 3.6s both",
          }} />
        </div>

        <div
          className="text-center"
          style={{ animation: "fade-up 0.8s ease 3.7s both", marginBottom: 0 }}
        >
          <span
            className="block"
            style={{ fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "3.5px", textTransform: "uppercase", color: "#9C4A5A" }}
          >
            {opening.date}
          </span>
          <span
            className="block"
            style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: "rgba(107,42,58,0.5)", marginTop: 3 }}
          >
            {opening.venue_short}
          </span>
        </div>

        <div style={{ margin: "14px 0 16px" }}>
          <Divider delay="4.2s" />
        </div>

        {/* Form card */}
        <div
          style={{
            background: "rgba(255,255,255,0.88)",
            border: `1px solid ${GOLD_RGBA(0.3)}`,
            borderRadius: 16, padding: "18px 24px", width: 280,
            boxShadow: `0 6px 40px rgba(90,31,46,0.08), 0 0 0 1px ${GOLD_RGBA(0.08)}`,
            backdropFilter: "blur(8px)",
            animation: "form-rise 1s cubic-bezier(0.22,1,0.36,1) 4.7s both",
          }}
        >
          <span
            className="block text-center"
            style={{
              fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: 3,
              textTransform: "uppercase", color: "rgba(107,42,58,0.4)",
              marginBottom: 14,
            }}
          >
            {opening.invited_label}
          </span>
          <FirstVisitForm onComplete={onComplete} />
        </div>
      </div>
    </div>
  );
}
