"use client";

import Reveal from "@/components/ui/Reveal";

interface FamilyMember {
  name: string;
  role: string;
}

interface FamilySide {
  side: string;
  members: FamilyMember[];
}

const FAMILIES: FamilySide[] = [
  {
    side: "James's Family",
    members: [
      { name: "Mr. Joseph Rubin Washington", role: "Father of the Groom" },
      { name: "Mrs. Sophia Joseph", role: "Mother of the Groom" },
      { name: "John Jebasingh", role: "Brother of the Groom" },
    ],
  },
  {
    side: "Sharon's Family",
    members: [
      { name: "Mr. Yesurathinam", role: "Father of the Bride" },
      { name: "Mrs. Singapogu Rizma", role: "Mother of the Bride" },
      { name: "Shiny Singapogu", role: "Sister of the Bride" },
    ],
  },
];

export default function Families() {
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
          {FAMILIES.map((family) => (
            <div
              key={family.side}
              className="bg-cream rounded-2xl border border-champagne p-8 flex flex-col gap-6"
            >
              <h3 className="font-heading text-2xl text-deep-rose text-center">
                {family.side}
              </h3>
              <ul className="flex flex-col gap-4">
                {family.members.map((m) => (
                  <li key={m.name} className="flex flex-col items-center text-center gap-1">
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
