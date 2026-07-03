"use client";

export default function AboutJames() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center">
        {/* Photo */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <div className="w-48 h-48 rounded-full bg-blush/40 border-4 border-champagne flex items-center justify-center text-6xl shadow-md">
            👨
          </div>
          <span className="font-heading text-deep-rose tracking-widest text-xs uppercase">
            The Groom
          </span>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-5">
          <h2 className="font-heading text-4xl text-deep-rose">James Daniel</h2>
          <p className="font-body text-deep-rose/70 leading-relaxed">
            James is a man shaped by faith, family, and a deep love for people.
            Raised in a home where Jesus was central, he carries a quiet strength
            and a heart that seeks to serve. He found in Sharon not just a life
            partner, but an answer to years of prayer.
          </p>
          <ul className="flex flex-col gap-2">
            {[
              { label: "Hometown", value: "Chennai, India" },
              { label: "Faith", value: "Christian" },
              { label: "Favourite verse", value: "Jeremiah 29:11" },
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
