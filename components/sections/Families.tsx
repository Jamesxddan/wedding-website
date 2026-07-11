"use client";

import Reveal from "@/components/ui/Reveal";
import { useSiteContent } from "@/lib/SiteContentContext";

export default function Families() {
  const { families } = useSiteContent();

  const sides = [
    { label: families.heading ? "James's Family" : "James's Family", members: families.james },
    { label: "Sharon's Family", members: families.sharon },
  ];

  return (
    <section id="families" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
            {families.heading}
          </h2>
          <p className="font-script italic text-sage text-center text-xl mb-16">
            {families.subtitle}
          </p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {sides.map((family) => (
            <div key={family.label} className="bg-cream rounded-2xl border border-champagne p-8 flex flex-col gap-6">
              <h3 className="font-heading text-2xl text-deep-rose text-center">{family.label}</h3>
              <ul className="flex flex-col gap-4">
                {family.members.map((m, i) => (
                  <li key={i} className="flex flex-col items-center text-center gap-1">
                    <span className="font-heading text-deep-rose">{m.name}</span>
                    <span className="font-body text-xs tracking-widest uppercase text-sage">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
