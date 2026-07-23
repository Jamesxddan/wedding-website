"use client";

import { useState, useRef, useEffect } from "react";
import { searchCities, type City } from "@/lib/cities";
import { startBackgroundMusic } from "@/components/ui/BackgroundMusic";

interface Props {
  onComplete: (name: string) => void;
}

export default function FirstVisitForm({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cityQuery.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const results = searchCities(cityQuery);
    setSuggestions(results);
    setShowDropdown(results.length > 0);
  }, [cityQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectCity(city: City) {
    setSelectedCity(city);
    setCityQuery(city.name);
    setShowDropdown(false);
  }

  function handleCityChange(val: string) {
    setCityQuery(val);
    setSelectedCity(null);
  }

  const isEmailValid = email.trim() === "" ? true : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isMobileValid = mobile.trim() === "" ? true : /^\+?[0-9\s-()]{7,20}$/.test(mobile.trim());
  const hasAtLeastOne = email.trim().length > 0 || mobile.trim().length > 0;
  const isFormValid = hasAtLeastOne && isEmailValid && isMobileValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !selectedCity || !isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { getOrCreateDeviceUUID, getBrowserSignalsHash } = await import("@/lib/fingerprint");
      const device_uuid = await getOrCreateDeviceUUID();
      const browser_signals_hash = await getBrowserSignalsHash();

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: selectedCity.name,
          email: email.trim() ? email.trim().toLowerCase() : undefined,
          mobile: mobile.trim() ? mobile.trim() : undefined,
          device_uuid,
          browser_signals_hash,
          user_agent: navigator.userAgent,
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(data.message ?? "Please try again in a little while.");
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) throw new Error("failed");

      const data = await res.json();

      startBackgroundMusic("/song.mp3");
      localStorage.setItem("guest_name", name.trim());
      localStorage.setItem("guest_city", selectedCity.name);
      if (email.trim()) localStorage.setItem("guest_email", email.trim().toLowerCase());
      if (mobile.trim()) localStorage.setItem("guest_mobile", mobile.trim());
      if (data.session_token) localStorage.setItem("session_token", data.session_token);
      onComplete(name.trim());
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && selectedCity !== null && isFormValid && !isSubmitting;

  const inputCls = "border border-champagne rounded-lg px-4 py-3 bg-[rgba(253,246,236,0.85)] text-deep-rose font-body placeholder:text-deep-rose/35 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[rgba(212,175,55,0.25)] transition-all duration-200";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-md">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest-name" className="font-heading text-[11px] text-deep-rose/60 tracking-[0.3em] uppercase">
          Your Name
        </label>
        <input
          id="guest-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={inputCls}
          autoComplete="off"
        />
      </div>

      {/* Hide email when mobile is typed (but not if both are filled via autofill) */}
      <div
        style={{
          maxHeight: mobile.trim() && !email.trim() ? "0px" : "120px",
          opacity: mobile.trim() && !email.trim() ? 0 : 1,
          overflow: "hidden",
          pointerEvents: mobile.trim() && !email.trim() ? "none" : "auto",
          transition: "max-height 0.45s ease, opacity 0.35s ease",
          marginBottom: mobile.trim() && !email.trim() ? "-20px" : "0px",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="guest-email" className="font-heading text-[11px] text-deep-rose/60 tracking-[0.3em] uppercase">
            Email <span className="normal-case tracking-normal text-deep-rose/35 text-[9px]">optional</span>
          </label>
          <input
            id="guest-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={inputCls}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Hide mobile when email is typed (but not if both are filled via autofill) */}
      <div
        style={{
          maxHeight: email.trim() && !mobile.trim() ? "0px" : "120px",
          opacity: email.trim() && !mobile.trim() ? 0 : 1,
          overflow: "hidden",
          pointerEvents: email.trim() && !mobile.trim() ? "none" : "auto",
          transition: "max-height 0.45s ease, opacity 0.35s ease",
          marginBottom: email.trim() && !mobile.trim() ? "-20px" : "0px",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="guest-mobile" className="font-heading text-[11px] text-deep-rose/60 tracking-[0.3em] uppercase">
            Mobile <span className="normal-case tracking-normal text-deep-rose/35 text-[9px]">optional</span>
          </label>
          <input
            id="guest-mobile"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+91 98765 43210"
            className={inputCls}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
        <label htmlFor="guest-city" className="font-heading text-[11px] text-deep-rose/60 tracking-[0.3em] uppercase">
          Your City
        </label>
        <div className="relative">
          <input
            id="guest-city"
            type="text"
            value={cityQuery}
            onChange={(e) => handleCityChange(e.target.value)}
            placeholder="Search city…"
            className={inputCls + " w-full"}
            autoComplete="off"
          />
          {selectedCity && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
              style={{ color: "#D4AF37" }}
              aria-label="City selected"
            >
              ✦
            </span>
          )}
        </div>
        {showDropdown && (
          <ul className="absolute top-full mt-1 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border border-champagne rounded-xl shadow-xl max-h-48 overflow-y-auto">
            {suggestions.map((city) => (
              <li key={city.name} className="border-b border-champagne/50 last:border-0">
                <button
                  type="button"
                  onMouseDown={() => selectCity(city)}
                  className="w-full text-left px-4 py-2.5 text-deep-rose font-body text-sm hover:bg-[rgba(212,175,55,0.08)] hover:pl-5 transition-all duration-150"
                >
                  {city.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="font-body text-deep-rose/80 text-sm text-center bg-blush/25 rounded-lg px-4 py-2.5 border border-blush/40">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-1 px-8 py-3 rounded-full font-heading tracking-widest uppercase text-sm text-cream disabled:opacity-40 hover:scale-[1.02] active:scale-95 transition-transform duration-200"
        style={{
          background: "linear-gradient(135deg, rgba(90,31,46,0.95) 0%, rgba(140,50,75,0.9) 100%)",
          boxShadow: canSubmit ? "0 4px 20px rgba(90,31,46,0.3)" : "0 2px 8px rgba(90,31,46,0.12)",
          animation: canSubmit ? "btn-glow 2.5s ease-in-out infinite" : "none",
        }}
      >
        {isSubmitting ? "One moment…" : "Open your invitation"}
      </button>
    </form>
  );
}
