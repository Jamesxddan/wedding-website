"use client";

import { useState, useEffect } from "react";

// Order matches the section order on the pre-wedding page, so the nav
// "marches" down the page in the same sequence as the content.
const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Gallery", href: "#gallery" },
  { label: "About", href: "#about" },
  { label: "Families", href: "#families" },
  { label: "Venue", href: "#venue" },
  { label: "Wall of Love", href: "#wall-of-love" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);

      // Scroll-spy: highlight the link of the section currently in view, so the
      // top bar marches through the page in order (Home → Gallery → About → …).
      const ids = LINKS.map((l) => l.href.slice(1));
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= 120) current = id;
      }
      // Near the very bottom, always land on the last section.
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        current = ids[ids.length - 1] || current;
      }
      setActive(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on resize to desktop
  useEffect(() => {
    function onResize() { if (window.innerWidth >= 768) setOpen(false); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || open ? "bg-cream/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className={`font-heading text-lg tracking-wide transition-colors duration-300 ${scrolled || open ? "text-deep-rose" : "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"}`}>
          J &amp; S
        </span>

        {/* Desktop links */}
        <ul className="hidden md:flex gap-8">
          {LINKS.map((link) => {
            const id = link.href.slice(1);
            const isActive = active === id;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`font-body text-sm tracking-widest uppercase transition-colors duration-300 ${scrolled || open ? "text-deep-rose/80 hover:text-deep-rose" : "text-white/90 hover:text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"} ${isActive ? "font-semibold border-b-2 border-[#D4AF37]" : "border-b-2 border-transparent"}`}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Hamburger */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="md:hidden flex flex-col gap-1.5 p-2 -mr-2"
        >
          <span className={`block w-6 h-0.5 transition-all duration-300 ${scrolled || open ? "bg-deep-rose" : "bg-white"} ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 transition-all duration-300 ${scrolled || open ? "bg-deep-rose" : "bg-white"} ${open ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 transition-all duration-300 ${scrolled || open ? "bg-deep-rose" : "bg-white"} ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      <style>{`
        @keyframes nav-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes nav-item-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>

    {/* Mobile full-screen overlay — rendered outside <nav> so fixed+fixed nesting doesn't clip it on Android */}
    {open && (
      <div
        className="md:hidden"
        style={{
          position: "fixed", inset: 0, zIndex: 49,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(20,8,5,0.93)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          animation: "nav-fade-in 0.25s ease both",
        }}
        onClick={() => setOpen(false)}
      >
        <p
          className="font-heading text-2xl mb-10"
          style={{ color: "#D4AF37", letterSpacing: "0.25em", opacity: 0.7 }}
        >
          J &amp; S
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          {LINKS.map((link, i) => {
            const isActive = active === link.href.slice(1);
            return (
              <li
                key={link.href}
                style={{ animation: `nav-item-rise 0.3s ease ${0.05 + i * 0.05}s both` }}
              >
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "true" : undefined}
                  style={{
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: isActive ? 22 : 18,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: isActive ? "#D4AF37" : "rgba(253,246,236,0.75)",
                    textDecoration: "none",
                    transition: "color 0.2s ease, font-size 0.2s ease",
                    display: "block",
                  }}
                >
                  {link.label}
                  {isActive && (
                    <span
                      style={{
                        display: "block", height: 1,
                        background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
                        marginTop: 3,
                      }}
                    />
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        <p
          className="font-script italic"
          style={{ position: "absolute", bottom: 48, color: "rgba(253,246,236,0.25)", fontSize: 13 }}
        >
          tap anywhere to close
        </p>
      </div>
    )}
    </>
  );
}
