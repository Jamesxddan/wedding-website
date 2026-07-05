"use client";

import { useState, useRef, useEffect } from "react";
import { searchCities, type City } from "@/lib/cities";
import { startBackgroundMusic } from "@/components/ui/BackgroundMusic";

interface Props {
  onComplete: (name: string) => void;
}

export default function FirstVisitForm({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !selectedCity) return;
    // Start music here — guaranteed user gesture on all mobile browsers
    startBackgroundMusic("/song.mp3");
    localStorage.setItem("guest_name", name.trim());
    localStorage.setItem("guest_city", selectedCity.name);
    onComplete(name.trim());
  }

  const canSubmit = name.trim().length > 0 && selectedCity !== null;

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

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-2 px-8 py-3 rounded-full bg-deep-rose text-cream font-heading tracking-widest uppercase text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
      >
        Open your invitation
      </button>
    </form>
  );
}
