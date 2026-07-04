"use client";

import { useState, useEffect, useRef } from "react";

interface Venue {
  name: string;
  address: string;
}

const VENUES: Venue[] = [
  { name: "St Andrews Kirk", address: "Poonamallee High Rd, Vepery, Chennai, Tamil Nadu 600007" },
  { name: "BKN Auditorium", address: "BKN Auditorium, Chennai, Tamil Nadu" },
];

function uberUrl(dropoffName: string, dropoffAddress: string) {
  const p = new URLSearchParams({
    action: "setPickup",
    "pickup[my_location]": "true",
    "dropoff[nickname]": dropoffName,
    "dropoff[formatted_address]": dropoffAddress,
  });
  return `https://m.uber.com/ul/?${p}`;
}

function rapidoUrl(dropoffAddress: string) {
  // Rapido doesn't have a public deep-link spec — open the app search page
  return `https://rapido.bike/`;
}

interface Props {
  mode: "to-venue" | "home";
  onClose: () => void;
}

export default function CabDialog({ mode, onClose }: Props) {
  const [selectedVenue, setSelectedVenue] = useState<Venue>(VENUES[0]);
  const [destination, setDestination] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dropoffName = mode === "to-venue" ? selectedVenue.name : destination;
  const dropoffAddress = mode === "to-venue" ? selectedVenue.address : destination;

  const canBook = mode === "to-venue" || destination.trim().length > 0;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "to-venue" ? "Get a ride to the venue" : "Book a ride home"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-cream rounded-2xl border border-champagne shadow-2xl w-full max-w-sm p-7 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-xl text-deep-rose">
            {mode === "to-venue" ? "Ride to the Venue" : "Ride Home"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-deep-rose/50 hover:text-deep-rose text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Venue selector (to-venue mode) */}
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

        {/* Destination input (home mode) */}
        {mode === "home" && (
          <div className="flex flex-col gap-2">
            <label className="font-heading text-xs tracking-widest uppercase text-sage">
              Your destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter your address"
              className="border border-champagne rounded-lg px-4 py-3 bg-white text-deep-rose font-body text-sm placeholder:text-deep-rose/40 focus:outline-none focus:ring-2 focus:ring-blush"
              autoFocus
            />
          </div>
        )}

        {/* Booking buttons */}
        <div className="flex flex-col gap-3">
          <a
            href={canBook ? uberUrl(dropoffName, dropoffAddress) : undefined}
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
            href={canBook ? rapidoUrl(dropoffAddress) : undefined}
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
          {mode === "home" && canBook && (
            <p className="font-body text-xs text-deep-rose/50 text-center">
              Copy this address into Rapido: <span className="font-heading">{destination}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
