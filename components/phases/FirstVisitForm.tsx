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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-md">
      <div className="flex flex-col gap-2">
        <label htmlFor="guest-name" className="font-heading text-deep-rose text-sm tracking-widest uppercase">
          Your Name
        </label>
        <input
          id="guest-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="border border-champagne rounded-lg px-4 py-3 bg-white text-deep-rose font-body placeholder:text-deep-rose/40 focus:outline-none focus:ring-2 focus:ring-blush"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="guest-email" className="font-heading text-deep-rose text-sm tracking-widest uppercase">
          Your Email
        </label>
        <input
          id="guest-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address (optional if mobile is filled)"
          className="border border-champagne rounded-lg px-4 py-3 bg-white text-deep-rose font-body placeholder:text-deep-rose/40 focus:outline-none focus:ring-2 focus:ring-blush"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="guest-mobile" className="font-heading text-deep-rose text-sm tracking-widest uppercase">
          Your Mobile Number
        </label>
        <input
          id="guest-mobile"
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="Your mobile number (optional if email is filled)"
          className="border border-champagne rounded-lg px-4 py-3 bg-white text-deep-rose font-body placeholder:text-deep-rose/40 focus:outline-none focus:ring-2 focus:ring-blush"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
        <label htmlFor="guest-city" className="font-heading text-deep-rose text-sm tracking-widest uppercase">
          Your City
        </label>
        <input
          id="guest-city"
          type="text"
          value={cityQuery}
          onChange={(e) => handleCityChange(e.target.value)}
          placeholder="Search your city"
          className="border border-champagne rounded-lg px-4 py-3 bg-white text-deep-rose font-body placeholder:text-deep-rose/40 focus:outline-none focus:ring-2 focus:ring-blush"
          autoComplete="off"
        />
        {showDropdown && (
          <ul className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-champagne rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {suggestions.map((city) => (
              <li key={city.name}>
                <button
                  type="button"
                  onMouseDown={() => selectCity(city)}
                  className="w-full text-left px-4 py-2 text-deep-rose font-body hover:bg-blush/30 transition-colors"
                >
                  {city.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="font-body text-deep-rose/80 text-sm text-center bg-blush/30 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-2 px-8 py-3 rounded-full bg-deep-rose text-cream font-heading tracking-widest uppercase text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
      >
        {isSubmitting ? "One moment…" : "Open your invitation"}
      </button>
    </form>
  );
}
