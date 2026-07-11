"use client";

import { useEffect, useRef } from "react";
import FloralAccent from "@/components/ui/FloralAccent";
import Reveal from "@/components/ui/Reveal";
import { useSiteContent } from "@/lib/SiteContentContext";
import { Milestone } from "@/lib/content";

function TimelineEntry({ milestone, index, total }: { milestone: Milestone; index: number; total: number }) {
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
    <div className={`flex items-start gap-0 md:gap-8 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}>
      <div ref={ref} className={`flex-1 opacity-0 translate-y-8 transition-all duration-700 ease-out ${isLeft ? "md:text-right" : "md:text-left"} text-left`}>
        <div className="bg-white rounded-2xl border border-champagne shadow-sm p-6 md:p-8 inline-block w-full">
          <span className="font-heading text-xs tracking-widest uppercase text-sage">{milestone.year}</span>
          <h3 className="font-heading text-2xl text-deep-rose mt-1 mb-3">{milestone.title}</h3>
          <p className="font-body text-deep-rose/70 leading-relaxed text-sm">{milestone.description}</p>
        </div>
      </div>
      <div className="flex flex-col items-center flex-shrink-0 mt-6">
        <div className="w-12 h-12 rounded-full bg-blush border-4 border-cream shadow-md flex items-center justify-center text-xl">
          {milestone.emoji}
        </div>
        {index < total - 1 && <div className="w-0.5 h-16 bg-champagne mt-2" />}
      </div>
      <div className="flex-1 hidden md:block" />
    </div>
  );
}

export default function OurStory() {
  const { story } = useSiteContent();

  return (
    <section id="our-story" className="relative py-24 px-6 max-w-4xl mx-auto overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute rounded-full" style={{ width: 400, height: 240, top: 0, right: "-5%", background: "radial-gradient(ellipse, rgba(244,194,194,0.3) 0%, transparent 70%)", filter: "blur(50px)", animation: "aurora-1 14s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ width: 320, height: 200, bottom: "10%", left: "-5%", background: "radial-gradient(ellipse, rgba(135,168,120,0.2) 0%, transparent 70%)", filter: "blur(45px)", animation: "aurora-3 18s ease-in-out infinite" }} />
      </div>
      <FloralAccent position="top-right" size={160} opacity={0.12} animate="sway" />
      <FloralAccent position="bottom-left" size={120} opacity={0.10} animate="float" />
      <Reveal>
        <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">{story.heading}</h2>
        <p className="font-script italic text-sage text-center text-xl mb-16">{story.subtitle}</p>
      </Reveal>
      <div className="flex flex-col gap-0">
        {story.milestones.map((m, i) => (
          <TimelineEntry key={i} milestone={m} index={i} total={story.milestones.length} />
        ))}
      </div>
    </section>
  );
}
