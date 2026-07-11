"use client";

import { useState, useEffect } from "react";
import Reveal from "@/components/ui/Reveal";

interface FamilyMember {
  name: string;
  role: string;
}

interface FamiliesData {
  james: FamilyMember[];
  sharon: FamilyMember[];
}

const DEFAULT_FAMILIES: FamiliesData = {
  james: [
    { name: "Mr. Joseph Rubin Washington", role: "Father of the Groom" },
    { name: "Mrs. Sophia Joseph", role: "Mother of the Groom" },
    { name: "John Jebasingh", role: "Brother of the Groom" },
  ],
  sharon: [
    { name: "Mr. Yesurathinam", role: "Father of the Bride" },
    { name: "Mrs. Singapogu Rizma", role: "Mother of the Bride" },
    { name: "Shiny Singapogu", role: "Sister of the Bride" },
  ],
};

export default function Families() {
  const [families, setFamilies] = useState<FamiliesData>(DEFAULT_FAMILIES);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        if (data.families) {
          try {
            const parsed = JSON.parse(data.families) as FamiliesData;
            if (parsed.james && parsed.sharon) setFamilies(parsed);
          } catch { /* use default */ }
        }
      })
      .catch(() => {});
  }, []);

  const sides = [
    { label: "James's Family", members: families.james },
    { label: "Sharon's Family", members: families.sharon },
  ];

  return (
    <section id="families" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
            The Families
          </h2>
          <p className="font-script italic text-sage text-center text-xl mb-16">
            Two families, one blessing
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {sides.map((family) => (
            <div
              key={family.label}
              className="bg-cream rounded-2xl border border-champagne p-8 flex flex-col gap-6"
            >
              <h3 className="font-heading text-2xl text-deep-rose text-center">
                {family.label}
              </h3>
              <ul className="flex flex-col gap-4">
                {family.members.map((m, i) => (
                  <li key={i} className="flex flex-col items-center text-center gap-1">
                    <span className="font-heading text-deep-rose">{m.name}</span>
                    <span className="font-body text-xs tracking-widest uppercase text-sage">
                      {m.role}
                    </span>
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
