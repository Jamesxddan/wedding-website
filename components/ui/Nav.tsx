"use client";

import { useState, useEffect } from "react";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Our Story", href: "#our-story" },
  { label: "Gallery", href: "#gallery" },
  { label: "Venue", href: "#venue" },
  { label: "The Families", href: "#families" },
  { label: "Comments", href: "#comments" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-cream/90 backdrop-blur-sm shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="font-heading text-deep-rose text-lg tracking-wide">
          J &amp; S
        </span>
        <ul className="hidden md:flex gap-8">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="font-body text-sm text-deep-rose/80 hover:text-deep-rose tracking-widest uppercase transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
