import { NextRequest, NextResponse } from "next/server";

// Proxies Google Places so the API key stays server-side.
// GET ?q=...          → autocomplete predictions (biased to Chennai, India)
// GET ?place_id=...   → place details with lat/lng
export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not configured" }, { status: 503 });
  }

  const placeId = req.nextUrl.searchParams.get("place_id");

  if (placeId) {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "geometry",
      key: apiKey,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    if (!loc) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ lat: loc.lat, lng: loc.lng });
  }

  const input = req.nextUrl.searchParams.get("q");
  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const params = new URLSearchParams({
    input: input.trim(),
    key: apiKey,
    components: "country:in",
    location: "13.0827,80.2707",
    radius: "50000",
    language: "en",
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json({ error: data.status }, { status: 500 });
  }

  return NextResponse.json({ predictions: data.predictions ?? [] });
}
