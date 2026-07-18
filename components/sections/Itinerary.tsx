"use client";

import { useSiteContent } from "@/lib/SiteContentContext";

export default function Itinerary() {
  const { itinerary } = useSiteContent();

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-2xl mx-auto">
        <h3 className="font-heading text-3xl text-deep-rose text-center mb-12">{itinerary.heading}</h3>
        <ol className="relative border-l border-champagne ml-4">
          {itinerary.items.map((item, i) => (
            <li key={i} className="mb-10 ml-8 last:mb-0">
              <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-blush border-2 border-cream" />
              <span className="font-heading text-xs tracking-widest uppercase text-sage block mb-1">{item.time}</span>
              <h4 className="font-heading text-xl text-deep-rose">{item.label}</h4>
              <p className="font-body text-deep-rose/60 text-sm">{item.venue}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
