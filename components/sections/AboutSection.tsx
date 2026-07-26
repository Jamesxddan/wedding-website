"use client";

import AboutJames from "./AboutJames";
import AboutSharon from "./AboutSharon";
import Reveal from "@/components/ui/Reveal";

export default function AboutSection() {
  return (
    <section className="relative py-24 px-6 max-w-4xl mx-auto overflow-hidden">
      {/* Aurora background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 240, top: 0, left: "-5%",
            background: "radial-gradient(ellipse, rgba(244,194,194,0.3) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "aurora-1 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 320, height: 200, bottom: "10%", right: "-5%",
            background: "radial-gradient(ellipse, rgba(135,168,120,0.2) 0%, transparent 70%)",
            filter: "blur(45px)",
            animation: "aurora-3 18s ease-in-out infinite",
          }}
        />
      </div>

      <Reveal>
        <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
          About
        </h2>
        <p className="font-script italic text-sage text-center text-xl mb-16">
          The Groom &amp; The Bride
        </p>
      </Reveal>

      <AboutJames />
      <AboutSharon />
    </section>
  );
}
