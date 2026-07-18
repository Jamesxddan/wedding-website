"use client";

import Reveal from "@/components/ui/Reveal";
import { useSiteContent } from "@/lib/SiteContentContext";

// Lat/lng are fixed to actual venue coordinates — not editable via CMS
const VENUE_COORDS = {
  ceremony: { lat: 13.0795825, lng: 80.2640559 },
  reception: { lat: 13.0825229, lng: 80.2601169 },
};

interface VenueCardProps {
  tag: string; name: string; address: string; time: string; dress: string;
  lat: number; lng: number; accent: "blush" | "sage";
}

function VenueCard({ tag, name, address, time, dress, lat, lng, accent }: VenueCardProps) {
  const accentBg     = accent === "blush" ? "bg-blush/20"    : "bg-sage/20";
  const accentBorder = accent === "blush" ? "border-blush"   : "border-sage";
  const accentText   = accent === "blush" ? "text-deep-rose" : "text-sage";
  const mapsNav = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const embedSrc = `https://maps.google.com/maps?q=${lat},${lng}&output=embed&z=16`;

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border ${accentBorder} shadow-md`}>
      <div className="relative w-full h-56">
        <iframe title={`Map of ${name}`} src={embedSrc} className="absolute inset-0 w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className={`${accentBg} p-7 flex flex-col gap-4 flex-1`}>
        <div>
          <span className={`font-heading text-xs tracking-widest uppercase ${accentText}`}>{tag}</span>
          <h3 className="font-heading text-2xl text-deep-rose mt-1">{name}</h3>
          <p className="font-body text-deep-rose/60 text-sm mt-1">{address}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {[
            { label: "Event", value: tag === "Ceremony" ? "Wedding Ceremony" : "Wedding Reception" },
            { label: "Date", value: "October 8, 2026" },
            { label: "Time", value: time },
            { label: "Dress", value: dress },
          ].map(({ label, value }) => (
            <li key={label} className="flex gap-3 items-baseline">
              <span className="font-heading text-xs tracking-widest uppercase text-sage w-24 flex-shrink-0">{label}</span>
              <span className="font-body text-deep-rose/70 text-sm">{value}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 mt-auto pt-2">
          <a href={mapsNav} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-deep-rose text-deep-rose font-body text-xs tracking-widest uppercase hover:bg-blush/30 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Venue() {
  const { venue } = useSiteContent();

  return (
    <section id="venue" className="py-24 px-6 bg-cream">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">{venue.heading}</h2>
          <p className="font-script italic text-sage text-center text-xl mb-16">{venue.subtitle}</p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Reveal>
            <VenueCard {...venue.ceremony} lat={VENUE_COORDS.ceremony.lat} lng={VENUE_COORDS.ceremony.lng} accent="blush" />
          </Reveal>
          <Reveal delay={100}>
            <VenueCard {...venue.reception} lat={VENUE_COORDS.reception.lat} lng={VENUE_COORDS.reception.lng} accent="sage" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
