"use client";

const ITEMS = [
  "James & Sharon",
  "·",
  "October 8th, 2026",
  "·",
  "St Andrews Kirk, Chennai",
  "·",
  "God's will was on our marriage",
  "·",
];

const TEXT = ITEMS.join("  ");

export default function Marquee() {
  return (
    <div
      className="overflow-hidden py-4 border-y border-champagne bg-cream/80 backdrop-blur-sm"
      aria-hidden="true"
    >
      <div className="marquee-track flex whitespace-nowrap will-change-transform">
        {/* Duplicate for seamless loop */}
        {[0, 1].map((n) => (
          <span key={n} className="flex items-center">
            {ITEMS.map((item, i) => (
              <span
                key={i}
                className={
                  item === "·"
                    ? "font-body text-blush mx-6 text-lg"
                    : "font-script italic text-deep-rose/70 text-lg tracking-wide mx-2"
                }
              >
                {item}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
