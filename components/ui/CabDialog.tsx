"use client";

import { useState, useEffect, useRef } from "react";

interface VenueOption {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Place {
  address: string;
  lat: number;
  lng: number;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

const VENUES: VenueOption[] = [
  {
    name: "St Andrews Kirk",
    address: "Poonamallee High Rd, Vepery, Chennai 600007",
    lat: 13.0795825,
    lng: 80.2640559,
  },
  {
    name: "BKN Auditorium",
    address: "BKN Auditorium, Chennai, Tamil Nadu",
    lat: 13.0825229,
    lng: 80.2601169,
  },
];

function uberToVenue(venue: VenueOption) {
  const p = new URLSearchParams({
    action: "setPickup",
    "pickup[my_location]": "true",
    "dropoff[latitude]": String(venue.lat),
    "dropoff[longitude]": String(venue.lng),
    "dropoff[nickname]": venue.name,
    "dropoff[formatted_address]": venue.address,
  });
  return `https://m.uber.com/ul/?${p}`;
}

function uberFromVenueTo(from: VenueOption, to: Place) {
  const p = new URLSearchParams({
    action: "setPickup",
    "pickup[latitude]": String(from.lat),
    "pickup[longitude]": String(from.lng),
    "pickup[nickname]": from.name,
    "dropoff[latitude]": String(to.lat),
    "dropoff[longitude]": String(to.lng),
    "dropoff[formatted_address]": to.address,
  });
  return `https://m.uber.com/ul/?${p}`;
}

function uberCeremonyToReception() {
  const from = VENUES[0];
  const to = VENUES[1];
  const p = new URLSearchParams({
    action: "setPickup",
    "pickup[latitude]": String(from.lat),
    "pickup[longitude]": String(from.lng),
    "pickup[nickname]": from.name,
    "dropoff[latitude]": String(to.lat),
    "dropoff[longitude]": String(to.lng),
    "dropoff[nickname]": to.name,
  });
  return `https://m.uber.com/ul/?${p}`;
}

// Rapido has no public deep-link spec — open their homepage and rely on copy-address fallback.
const RAPIDO_URL = "https://rapido.bike";

function olaToVenue(venue: VenueOption) {
  const p = new URLSearchParams({
    serviceType: "p2p",
    drop_lat: String(venue.lat),
    drop_lng: String(venue.lng),
    drop_name: venue.name,
  });
  return `https://book.olacabs.com/?${p}`;
}

function olaFromVenueTo(from: VenueOption, to: Place) {
  const p = new URLSearchParams({
    serviceType: "p2p",
    pickup_lat: String(from.lat),
    pickup_lng: String(from.lng),
    pickup_name: from.name,
    drop_lat: String(to.lat),
    drop_lng: String(to.lng),
    drop_name: to.address,
  });
  return `https://book.olacabs.com/?${p}`;
}

function olaCeremonyToReception() {
  const from = VENUES[0];
  const to = VENUES[1];
  const p = new URLSearchParams({
    serviceType: "p2p",
    pickup_lat: String(from.lat),
    pickup_lng: String(from.lng),
    pickup_name: from.name,
    drop_lat: String(to.lat),
    drop_lng: String(to.lng),
    drop_name: to.name,
  });
  return `https://book.olacabs.com/?${p}`;
}

export type CabMode = "to-venue" | "home" | "ceremony-to-reception" | null;

interface Props {
  mode: CabMode;
  onClose: () => void;
}

export default function CabDialog({ mode, onClose }: Props) {
  const [selectedVenue, setSelectedVenue] = useState<VenueOption>(VENUES[0]);

  // Home mode: address autocomplete
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesCallCount = useRef(0);
  const PLACES_SESSION_LIMIT = 50;
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close suggestions on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedPlace(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    if (placesCallCount.current >= PLACES_SESSION_LIMIT) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        placesCallCount.current += 1;
        const res = await fetch(`/api/places?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setPredictions(data.predictions ?? []);
        setShowSuggestions((data.predictions ?? []).length > 0);
      } catch {
        setPredictions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }

  async function selectPrediction(pred: Prediction) {
    // Fetch coordinates for the selected place via Places Details
    setQuery(pred.structured_formatting.main_text);
    setPredictions([]);
    setShowSuggestions(false);
    try {
      const res = await fetch(`/api/places?place_id=${encodeURIComponent(pred.place_id)}`);
      const data = await res.json();
      if (data.lat && data.lng) {
        setSelectedPlace({ address: pred.description, lat: data.lat, lng: data.lng });
      }
    } catch {
      // If details fail, use description as fallback (no coordinates)
    }
  }

  function copyAddress() {
    const text =
      mode === "home"
        ? (selectedPlace?.address ?? query)
        : mode === "ceremony-to-reception"
        ? VENUES[1].address
        : selectedVenue.address;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canBook =
    mode === "to-venue" ||
    mode === "ceremony-to-reception" ||
    (mode === "home" && selectedPlace !== null);

  const uberHref =
    mode === "to-venue"
      ? uberToVenue(selectedVenue)
      : mode === "home" && selectedPlace
      ? uberFromVenueTo(selectedVenue, selectedPlace)
      : mode === "ceremony-to-reception"
      ? uberCeremonyToReception()
      : "";

  const rapidoHref = canBook ? RAPIDO_URL : "";

  const olaHref =
    mode === "to-venue"
      ? olaToVenue(selectedVenue)
      : mode === "home" && selectedPlace
      ? olaFromVenueTo(selectedVenue, selectedPlace)
      : mode === "ceremony-to-reception"
      ? olaCeremonyToReception()
      : "";

  const title =
    mode === "to-venue"
      ? "Ride to the Venue"
      : mode === "home"
      ? "Ride Home"
      : "Ceremony → Reception";

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-cream rounded-2xl border border-champagne shadow-2xl w-full max-w-sm p-7 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-xl text-deep-rose">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-deep-rose/50 hover:text-deep-rose text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Ceremony → Reception: fixed route summary */}
        {mode === "ceremony-to-reception" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-blush/20 border border-blush">
              <span className="font-heading text-[10px] tracking-widest uppercase text-sage">From</span>
              <span className="font-body text-sm text-deep-rose font-semibold">St Andrews Kirk</span>
              <span className="font-body text-xs text-deep-rose/60">Poonamallee High Rd, Vepery</span>
            </div>
            <div className="flex items-center justify-center text-deep-rose/40 text-xl">↓</div>
            <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-sage/10 border border-sage/30">
              <span className="font-heading text-[10px] tracking-widest uppercase text-sage">To</span>
              <span className="font-body text-sm text-deep-rose font-semibold">BKN Auditorium</span>
              <span className="font-body text-xs text-deep-rose/60">Chennai, Tamil Nadu</span>
            </div>
          </div>
        )}

        {/* To venue: choose which venue */}
        {mode === "to-venue" && (
          <div className="flex flex-col gap-2">
            <p className="font-heading text-xs tracking-widest uppercase text-sage">
              Choose destination
            </p>
            <div className="flex flex-col gap-2">
              {VENUES.map((v) => (
                <button
                  key={v.name}
                  onClick={() => setSelectedVenue(v)}
                  className={`text-left px-4 py-3 rounded-xl border font-body text-sm transition-colors ${
                    selectedVenue.name === v.name
                      ? "border-deep-rose bg-blush/30 text-deep-rose"
                      : "border-champagne text-deep-rose/70 hover:border-deep-rose/40"
                  }`}
                >
                  <span className="font-heading block">{v.name}</span>
                  <span className="text-xs text-deep-rose/50">{v.address}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Home mode: pickup = venue, drop = autocomplete address */}
        {mode === "home" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-heading text-xs tracking-widest uppercase text-sage">
                Returning from
              </p>
              <div className="flex flex-col gap-2">
                {VENUES.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => setSelectedVenue(v)}
                    className={`text-left px-4 py-3 rounded-xl border font-body text-sm transition-colors ${
                      selectedVenue.name === v.name
                        ? "border-deep-rose bg-blush/30 text-deep-rose"
                        : "border-champagne text-deep-rose/70 hover:border-deep-rose/40"
                    }`}
                  >
                    <span className="font-heading block">{v.name}</span>
                    <span className="text-xs text-deep-rose/50">{v.address}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Destination autocomplete */}
            <div className="flex flex-col gap-2">
              <label className="font-heading text-xs tracking-widest uppercase text-sage">
                Your destination
              </label>
              <div className="relative" ref={suggestionBoxRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
                    placeholder="Start typing your address…"
                    className={`w-full border rounded-lg px-4 py-3 bg-white text-deep-rose font-body text-sm placeholder:text-deep-rose/40 focus:outline-none focus:ring-2 focus:ring-blush pr-8 ${
                      selectedPlace ? "border-sage" : "border-champagne"
                    }`}
                    autoComplete="off"
                    autoFocus
                  />
                  {/* Status icon */}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                    {isSearching ? (
                      <span className="text-deep-rose/30 animate-pulse">⋯</span>
                    ) : selectedPlace ? (
                      <span className="text-sage">✓</span>
                    ) : null}
                  </span>
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && predictions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-champagne rounded-xl shadow-lg overflow-hidden">
                    {predictions.map((pred) => (
                      <button
                        key={pred.place_id}
                        onClick={() => selectPrediction(pred)}
                        className="w-full text-left px-4 py-3 hover:bg-blush/20 transition-colors border-b border-champagne/50 last:border-0"
                      >
                        <span className="font-body text-sm text-deep-rose block">{pred.structured_formatting.main_text}</span>
                        {pred.structured_formatting.secondary_text && (
                          <span className="font-body text-xs text-deep-rose/50 block mt-0.5">{pred.structured_formatting.secondary_text}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* No results hint */}
                {showSuggestions && !isSearching && query.trim().length >= 3 && predictions.length === 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-champagne rounded-xl shadow-lg px-4 py-3">
                    <span className="font-body text-sm text-deep-rose/50">No results found — try a different area or landmark</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Booking buttons */}
        <div className="flex flex-col gap-3">
          <a
            href={canBook ? uberHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canBook}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full font-heading tracking-widest uppercase text-sm transition-opacity ${
              canBook
                ? "bg-deep-rose text-cream hover:opacity-90"
                : "bg-deep-rose/30 text-cream cursor-not-allowed pointer-events-none"
            }`}
          >
            🚗 Book with Uber
          </a>
          <a
            href={canBook ? rapidoHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canBook}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full border font-heading tracking-widest uppercase text-sm transition-colors ${
              canBook
                ? "border-deep-rose text-deep-rose hover:bg-blush/30"
                : "border-deep-rose/30 text-deep-rose/30 cursor-not-allowed pointer-events-none"
            }`}
          >
            🛵 Open Rapido
          </a>
          <a
            href={canBook ? olaHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canBook}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full border font-heading tracking-widest uppercase text-sm transition-colors ${
              canBook
                ? "border-sage text-sage hover:bg-sage/10"
                : "border-sage/30 text-sage/30 cursor-not-allowed pointer-events-none"
            }`}
          >
            🚖 Book with Ola
          </a>

          {/* Rapido copy-address fallback */}
          {canBook && (
            <div className="flex flex-col gap-1">
              <p className="font-body text-xs text-deep-rose/50 text-center">
                For Rapido, copy the address then paste it after opening:
              </p>
              <button
                onClick={copyAddress}
                className="font-body text-xs text-sage underline underline-offset-2 text-center transition-opacity hover:opacity-70"
              >
                {copied
                  ? "✓ Copied!"
                  : mode === "ceremony-to-reception"
                  ? `Copy: ${VENUES[1].address}`
                  : mode === "home" && selectedPlace
                  ? `Copy destination address`
                  : `Copy: ${selectedVenue.address}`}
              </button>
            </div>
          )}
        </div>

        {/* Destination hint for home mode */}
        {mode === "home" && !selectedPlace && (
          <p className="font-body text-xs text-deep-rose/40 text-center -mt-3">
            Select an address from the dropdown to enable booking
          </p>
        )}
      </div>
    </div>
  );
}
