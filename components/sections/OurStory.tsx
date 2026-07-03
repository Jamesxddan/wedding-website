"use client";

import { useEffect, useRef } from "react";

interface Milestone {
  year: string;
  title: string;
  description: string;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  {
    year: "2023",
    title: "First Meeting",
    description:
      "God brought two hearts together in a moment neither of us expected. It was the beginning of something beautiful — a friendship that quietly blossomed into love.",
    emoji: "🌱",
  },
  {
    year: "2024",
    title: "Growing Together",
    description:
      "Through laughter, prayers, and countless conversations, we discovered that God's hand was weaving our stories into one. Every moment felt like a gentle confirmation.",
    emoji: "🌿",
  },
  {
    year: "2025",
    title: "The Proposal",
    description:
      "On a day we will never forget, James asked Sharon to walk with him for the rest of his life. With joy and tears, she said yes — and God smiled.",
    emoji: "💍",
  },
  {
    year: "2026",
    title: "October 8th — Wedding Day",
    description:
      "Before family, friends, and God, we will make a covenant of love. St Andrews Kirk, Chennai — the place where our forever begins.",
    emoji: "🕊️",
  },
];

function TimelineEntry({
  milestone,
  index,
}: {
  milestone: Milestone;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isLeft = index % 2 === 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("opacity-100", "translate-y-0");
          el.classList.remove("opacity-0", "translate-y-8");
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`flex items-start gap-0 md:gap-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}
    >
      {/* Content card */}
      <div
        ref={ref}
        className={`flex-1 opacity-0 translate-y-8 transition-all duration-700 ease-out ${
          isLeft ? "md:text-right" : "md:text-left"
        } text-left`}
      >
        <div className="bg-white rounded-2xl border border-champagne shadow-sm p-6 md:p-8 inline-block w-full">
          <span className="font-heading text-xs tracking-widest uppercase text-sage">
            {milestone.year}
          </span>
          <h3 className="font-heading text-2xl text-deep-rose mt-1 mb-3">
            {milestone.title}
          </h3>
          <p className="font-body text-deep-rose/70 leading-relaxed text-sm">
            {milestone.description}
          </p>
        </div>
      </div>

      {/* Centre dot */}
      <div className="flex flex-col items-center flex-shrink-0 mt-6">
        <div className="w-12 h-12 rounded-full bg-blush border-4 border-cream shadow-md flex items-center justify-center text-xl">
          {milestone.emoji}
        </div>
        {index < MILESTONES.length - 1 && (
          <div className="w-0.5 h-16 bg-champagne mt-2" />
        )}
      </div>

      {/* Spacer for alternating layout */}
      <div className="flex-1 hidden md:block" />
    </div>
  );
}

export default function OurStory() {
  return (
    <section id="our-story" className="py-24 px-6 max-w-4xl mx-auto">
      <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
        Our Story
      </h2>
      <p className="font-script italic text-sage text-center text-xl mb-16">
        "God's will was on our marriage"
      </p>

      <div className="flex flex-col gap-0">
        {MILESTONES.map((m, i) => (
          <TimelineEntry key={m.year} milestone={m} index={i} />
        ))}
      </div>
    </section>
  );
}
