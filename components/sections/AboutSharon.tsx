"use client";

import { useSiteContent } from "@/lib/SiteContentContext";
import { useState } from "react";
import AnimatedSection from "@/components/ui/AnimatedSection";

export default function AboutSharon() {
  const { sharon } = useSiteContent();
  const [imgError, setImgError] = useState(false);

  return (
    <section className="py-24 px-6 bg-cream">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row-reverse gap-12 items-center">
        <AnimatedSection variant="fade-right" className="flex-shrink-0 flex flex-col items-center gap-3" as="div">
          <div className="w-48 h-48 rounded-full bg-blush/40 border-4 border-champagne flex items-center justify-center text-6xl shadow-md overflow-hidden">
            {sharon.photo && !imgError ? (
              <img
                src={sharon.photo}
                alt={sharon.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-deep-rose/60 font-heading text-5xl">
                {sharon.name.charAt(0)}
              </span>
            )}
          </div>
          <span className="font-heading text-deep-rose tracking-widest text-xs uppercase">The Bride</span>
        </AnimatedSection>
        <AnimatedSection variant="fade-left" className="flex flex-col gap-5 bg-white/50 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-champagne/40 shadow-lg shadow-deep-rose/5" as="div">
          <h2 className="font-heading text-4xl text-deep-rose">{sharon.name}</h2>
          <p className="font-body text-deep-rose/70 leading-relaxed">{sharon.bio}</p>
          <ul className="flex flex-col gap-2">
            {sharon.facts.map(({ label, value }) => (
              <li key={label} className="flex gap-3 items-baseline">
                <span className="font-heading text-xs tracking-widest uppercase text-sage w-32 flex-shrink-0">{label}</span>
                <span className="font-body text-deep-rose/70 text-sm">{value}</span>
              </li>
            ))}
          </ul>
        </AnimatedSection>
      </div>
    </section>
  );
}
