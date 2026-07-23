"use client";

import { useEffect, useRef } from "react";
import { useSiteContent } from "@/lib/SiteContentContext";
import type { ItineraryItem } from "@/lib/content";

const GOLD = "#D4AF37";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;

// Icon assigned by position in programme
const PROGRAMME_ICONS = ["⛪", "🎊", "🥂", "🎉", "🌸", "✨", "🕯️", "🎶"];

function ItineraryCard({
  item, index, total,
}: {
  item: ItineraryItem; index: number; total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isLeft = index % 2 === 0;
  const icon = PROGRAMME_ICONS[index % PROGRAMME_ICONS.length];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`flex items-center gap-0 md:gap-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}
    >
      {/* Card */}
      <div
        ref={ref}
        className="flex-1"
        style={{
          opacity: 0,
          transform: "translateY(24px)",
          transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 80}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 80}ms`,
        }}
      >
        <div
          className={`p-6 md:p-8 rounded-2xl ${isLeft ? "md:text-right" : "md:text-left"} text-left`}
          style={{
            background: "rgba(255,255,255,0.85)",
            border: `1px solid ${GA(0.22)}`,
            boxShadow: "0 4px 24px rgba(90,31,46,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
            backdropFilter: "blur(4px)",
          }}
        >
          {/* Large time */}
          <span
            className="font-heading block"
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              color: RA(0.85), lineHeight: 1, marginBottom: 4,
            }}
          >
            {item.time}
          </span>

          {/* Gold underline */}
          <div
            style={{
              width: 36, height: 1.5, borderRadius: 1,
              background: `linear-gradient(90deg, ${GA(0.7)}, ${GA(0.2)})`,
              marginBottom: 10,
              marginLeft: isLeft ? undefined : 0,
              marginRight: isLeft ? 0 : undefined,
            }}
            className={isLeft ? "md:ml-auto md:mr-0" : ""}
          />

          <h4 className="font-heading text-xl" style={{ color: RA(0.72), marginBottom: 4 }}>
            {item.label}
          </h4>
          <p className="font-body text-sm" style={{ color: RA(0.44), fontStyle: "italic" }}>
            {item.venue}
          </p>
        </div>
      </div>

      {/* Centre dot + connector line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 52, height: 52,
            background: "rgba(255,255,255,0.92)",
            border: `2px solid ${GA(0.45)}`,
            boxShadow: `0 0 0 4px ${GA(0.1)}, 0 4px 14px rgba(90,31,46,0.1)`,
            fontSize: 22,
          }}
        >
          {icon}
        </div>
        {index < total - 1 && (
          <div
            style={{
              width: 1, height: 64, marginTop: 4,
              background: `linear-gradient(to bottom, ${GA(0.42)}, ${GA(0.12)})`,
            }}
          />
        )}
      </div>

      {/* Empty spacer for alternating layout */}
      <div className="flex-1 hidden md:block" />
    </div>
  );
}

export default function Itinerary() {
  const { itinerary } = useSiteContent();

  return (
    <section
      className="py-24 px-6"
      style={{
        background: [
          "radial-gradient(ellipse at 80% 20%, rgba(244,194,194,0.18) 0%, transparent 50%)",
          "radial-gradient(ellipse at 20% 80%, rgba(212,175,55,0.1) 0%, transparent 50%)",
          "linear-gradient(180deg, #fdf6ec 0%, #fffdf9 100%)",
        ].join(", "),
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16">
          <p
            className="font-body text-[11px] tracking-[0.4em] uppercase mb-3"
            style={{ color: "rgba(135,168,120,0.85)" }}
          >
            The day&apos;s programme
          </p>
          <h2 className="font-heading text-4xl md:text-5xl text-deep-rose mb-5">
            {itinerary.heading}
          </h2>
          <div className="flex items-center gap-3 justify-center">
            <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, transparent, ${GA(0.55)})` }} />
            <span style={{ fontSize: 9, color: GA(0.7), letterSpacing: "0.2em" }}>✦</span>
            <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, ${GA(0.55)}, transparent)` }} />
          </div>
        </div>

        {/* Timeline cards */}
        <div className="flex flex-col gap-0">
          {itinerary.items.map((item, i) => (
            <ItineraryCard key={i} item={item} index={i} total={itinerary.items.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
