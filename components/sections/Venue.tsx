"use client";

import Reveal from "@/components/ui/Reveal";

interface VenueCardProps {
  tag: string;
  name: string;
  role: string;
  address: string;
  mapQuery: string;
  externalUrl: string;
  externalLabel: string;
  details: { label: string; value: string }[];
  accent: "blush" | "sage";
}

function VenueCard({
  tag,
  name,
  role,
  address,
  mapQuery,
  externalUrl,
  externalLabel,
  details,
  accent,
}: VenueCardProps) {
  const accentBg = accent === "blush" ? "bg-blush/20" : "bg-sage/20";
  const accentBorder = accent === "blush" ? "border-blush" : "border-sage";
  const accentText = accent === "blush" ? "text-deep-rose" : "text-sage";

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border ${accentBorder} shadow-md`}>
      {/* Map embed */}
      <div className="relative w-full h-56">
        <iframe
          title={`Map of ${name}`}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Card body */}
      <div className={`${accentBg} p-7 flex flex-col gap-4 flex-1`}>
        <div>
          <span className={`font-heading text-xs tracking-widest uppercase ${accentText}`}>
            {tag}
          </span>
          <h3 className="font-heading text-2xl text-deep-rose mt-1">{name}</h3>
          <p className="font-body text-deep-rose/60 text-sm mt-1">{address}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {details.map(({ label, value }) => (
            <li key={label} className="flex gap-3 items-baseline">
              <span className="font-heading text-xs tracking-widest uppercase text-sage w-24 flex-shrink-0">
                {label}
              </span>
              <span className="font-body text-deep-rose/70 text-sm">{value}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3 mt-auto pt-2">
          <a
            href={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full border border-deep-rose text-deep-rose font-body text-xs tracking-widest uppercase hover:bg-blush/30 transition-colors"
          >
            Open in Maps
          </a>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-sage text-sage font-body text-xs tracking-widest uppercase hover:bg-sage/20 transition-colors"
            >
              {externalLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Venue() {
  return (
    <section id="venue" className="py-24 px-6 bg-cream">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
            Venue &amp; Details
          </h2>
          <p className="font-script italic text-sage text-center text-xl mb-16">
            Chennai, October 8th, 2026
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <VenueCard
            tag="Ceremony"
            name="St Andrews Kirk"
            role="ceremony"
            address="Poonamallee High Rd, Vepery, Chennai, Tamil Nadu 600 007"
            mapQuery="St Andrews Kirk Chennai"
            externalUrl=""
            externalLabel="Kirk Website"
            accent="blush"
            details={[
              { label: "Event", value: "Wedding Ceremony" },
              { label: "Date", value: "October 8, 2026" },
              { label: "Time", value: "TBD" },
              { label: "Dress code", value: "Formals / Ethnic" },
            ]}
          />

          <VenueCard
            tag="Reception"
            name="BKN Auditorium"
            role="reception"
            address="Chennai, Tamil Nadu"
            mapQuery="BKN Auditorium Chennai"
            externalUrl=""
            externalLabel="BKN on YouTube"
            accent="sage"
            details={[
              { label: "Event", value: "Wedding Reception" },
              { label: "Date", value: "October 8, 2026" },
              { label: "Time", value: "TBD" },
              { label: "Dress code", value: "Formals / Ethnic" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
