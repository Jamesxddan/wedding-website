"use client";

export default function AboutSharon() {
  return (
    <section className="py-24 px-6 bg-cream">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row-reverse gap-12 items-center">
        {/* Photo */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <div className="w-48 h-48 rounded-full bg-blush/40 border-4 border-champagne flex items-center justify-center text-6xl shadow-md">
            👩
          </div>
          <span className="font-heading text-deep-rose tracking-widest text-xs uppercase">
            The Bride
          </span>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-5">
          <h2 className="font-heading text-4xl text-deep-rose">Sharon</h2>
          <p className="font-body text-deep-rose/70 leading-relaxed">
            Sharon is a woman of grace, warmth, and unwavering faith. Those who
            know her speak of a joy that is contagious and a gentleness that
            draws people in. In James she found a love she had entrusted to God
            long before she knew his name.
          </p>
          <ul className="flex flex-col gap-2">
            {[
              { label: "Hometown", value: "Chennai, India" },
              { label: "Faith", value: "Christian" },
              { label: "Favourite verse", value: "Proverbs 31:25" },
            ].map(({ label, value }) => (
              <li key={label} className="flex gap-3 items-baseline">
                <span className="font-heading text-xs tracking-widest uppercase text-sage w-32 flex-shrink-0">
                  {label}
                </span>
                <span className="font-body text-deep-rose/70 text-sm">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
