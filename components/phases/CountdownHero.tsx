"use client";

import { useEffect, useState } from "react";
import { WEDDING_DATE } from "@/lib/constants";
import PetalScene from "@/components/webgl/PetalScene";
import Nav from "@/components/ui/Nav";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(now: Date): TimeLeft {
  const target = WEDDING_DATE.getTime();
  const diff = Math.max(0, target - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface Props {
  guestName: string;
}

export default function CountdownHero({ guestName }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Nav />
      <section
        id="home"
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      >
        <PetalScene />

        <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
          {/* Greeting */}
          <p className="font-script italic text-deep-rose text-2xl md:text-3xl">
            Welcome back, {guestName}! 🌸
          </p>

          {/* Couple names */}
          <div>
            <h1 className="font-heading text-6xl md:text-8xl text-deep-rose leading-none">
              James &amp; Sharon
            </h1>
            <p className="font-script italic text-sage text-xl md:text-2xl mt-3">
              "God's will was on our marriage"
            </p>
          </div>

          {/* Countdown */}
          <div className="flex gap-6 md:gap-10">
            {[
              { value: timeLeft.days, label: "Days" },
              { value: timeLeft.hours, label: "Hours" },
              { value: timeLeft.minutes, label: "Minutes" },
              { value: timeLeft.seconds, label: "Seconds" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="relative flex items-center justify-center w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white/60 backdrop-blur-sm border border-champagne shadow-lg"
                  style={{
                    boxShadow:
                      "0 0 24px 4px rgba(244,194,194,0.35), 0 2px 8px rgba(181,101,118,0.12)",
                  }}
                >
                  <span className="font-heading text-3xl md:text-5xl text-deep-rose tabular-nums">
                    {label === "Days" ? timeLeft.days : pad(value)}
                  </span>
                </div>
                <span className="font-body text-xs tracking-widest uppercase text-deep-rose/60">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Wedding date */}
          <p className="font-heading text-deep-rose/70 tracking-widest text-sm uppercase">
            October 8th, 2026 &mdash; Chennai
          </p>
        </div>
      </section>
    </>
  );
}
