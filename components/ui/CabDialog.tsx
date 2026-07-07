"use client";

import { useState, useEffect, useRef } from "react";

interface VenueOption {
  name: string;
  address: string;
  lat: number;
  lng: number;
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

function uberFromVenueTo(from: VenueOption, toAddress: string) {
  const p = new URLSearchParams({
    action: "setPickup",
    "pickup[latitude]": String(from.lat),
    "pickup[longitude]": String(from.lng),
    "pickup[nickname]": from.name,
    "dropoff[formatted_address]": toAddress,
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

// Rapido doesn't publish a deep-link spec — best-effort coordinate URL.
// Falls back gracefully to the homepage if the app doesn't handle it.
function rapidoToVenue(venue: VenueOption) {
  return `https://rapido.bike/book?src_lat=0&src_lng=0&dst_lat=${venue.lat}&dst_lng=${venue.lng}&dst_name=${encodeURIComponent(venue.name)}`;
}

function rapidoFromVenueTo(from: VenueOption, toAddress: string) {
  return `https://rapido.bike/book?src_lat=${from.lat}&src_lng=${from.lng}&src_name=${encodeURIComponent(from.name)}&dst_name=${encodeURIComponent(toAddress)}`;
}

function rapidoCeremonyToReception() {
  const from = VENUES[0];
  const to = VENUES[1];
  return `https://rapido.bike/book?src_lat=${from.lat}&src_lng=${from.lng}&src_name=${encodeURIComponent(from.name)}&dst_lat=${to.lat}&dst_lng=${to.lng}&dst_name=${encodeURIComponent(to.name)}`;
}

export type CabMode = "to-venue" | "home" | "ceremony-to-reception" | null;

interface Props {
  mode: CabMode;
  onClose: () => void;
}

export default function CabDialog({ mode, onClose }: Props) {
  const [selectedVenue, setSelectedVenue] = useState<VenueOption>(VENUES[0]);
  const [destination, setDestination] = useState("");
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function copyAddress() {
    const text = mode === "home" ? destination : mode === "ceremony-to-reception" ? VENUES[1].address : selectedVenue.address;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canBook = mode === "to-venue" || mode === "ceremony-to-reception" || destination.trim().length > 0;

  const uberHref =
    mode === "to-venue" ? uberToVenue(selectedVenue) :
    mode === "home" ? uberFromVenueTo(selectedVenue, destination) :
    mode === "ceremony-to-reception" ? uberCeremonyToReception() : "";

  const rapidoHref =
    mode === "to-venue" ? rapidoToVenue(selectedVenue) :
    mode === "home" ? rapidoFromVenueTo(selectedVenue, destination) :
    mode === "ceremony-to-reception" ? rapidoCeremonyToReception() : "";

  const title =
    mode === "to-venue" ? "Ride to the Venue" :
    mode === "home" ? "Ride Home" :
    "Ceremony → Reception";

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
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

        {/* Home mode: pickup = venue, drop = typed address */}
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
            <div className="flex flex-col gap-2">
              <label className="font-heading text-xs tracking-widest uppercase text-sage">
                Your destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter your address or area"
                className="border border-champagne rounded-lg px-4 py-3 bg-white text-deep-rose font-body text-sm placeholder:text-deep-rose/40 focus:outline-none focus:ring-2 focus:ring-blush"
                autoFocus
              />
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

          {/* Rapido copy-address fallback */}
          {canBook && (
            <div className="flex flex-col gap-1">
              <p className="font-body text-xs text-deep-rose/50 text-center">
                If Rapido doesn&apos;t pre-fill the address, tap to copy it:
              </p>
              <button
                onClick={copyAddress}
                className="font-body text-xs text-sage underline underline-offset-2 text-center transition-opacity hover:opacity-70"
              >
                {copied ? "✓ Copied!" : mode === "ceremony-to-reception" ? `Copy: ${VENUES[1].address}` : mode === "home" ? `Copy: ${destination}` : `Copy: ${selectedVenue.address}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
