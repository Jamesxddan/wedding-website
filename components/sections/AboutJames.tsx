"use client";

import { useSiteContent } from "@/lib/SiteContentContext";

export default function AboutJames() {
  const { james } = useSiteContent();

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <div className="w-48 h-48 rounded-full bg-blush/40 border-4 border-champagne flex items-center justify-center text-6xl shadow-md">
            👨
          </div>
          <span className="font-heading text-deep-rose tracking-widest text-xs uppercase">The Groom</span>
        </div>
        <div className="flex flex-col gap-5">
          <h2 className="font-heading text-4xl text-deep-rose">{james.name}</h2>
          <p className="font-body text-deep-rose/70 leading-relaxed">{james.bio}</p>
          <ul className="flex flex-col gap-2">
            {james.facts.map(({ label, value }) => (
              <li key={label} className="flex gap-3 items-baseline">
                <span className="font-heading text-xs tracking-widest uppercase text-sage w-32 flex-shrink-0">{label}</span>
                <span className="font-body text-deep-rose/70 text-sm">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
