import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("rsvps")
    .select(`
      id, response, guest_count, meal_pref, attending_events, updated_at,
      guests!inner ( id, name, city, email )
    `)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r) => {
    const g = Array.isArray(r.guests) ? r.guests[0] : r.guests;
    return {
      id: r.id,
      response: r.response,
      guest_count: r.guest_count,
      meal_pref: r.meal_pref,
      attending_events: r.attending_events,
      updated_at: r.updated_at,
      guest_id: g?.id ?? null,
      name: g?.name ?? "Unknown",
      city: g?.city ?? "",
      email: g?.email ?? null,
    };
  });

  // Summary counts
  const attending = rows.filter((r) => r.response === "attending");
  const maybe     = rows.filter((r) => r.response === "maybe");
  const declined  = rows.filter((r) => r.response === "not_attending");

  const summary = {
    total_rsvps:       rows.length,
    attending_count:   attending.length,
    maybe_count:       maybe.length,
    declined_count:    declined.length,
    total_people:      [...attending, ...maybe].reduce((s, r) => s + r.guest_count, 0),
    veg_count:         rows.filter((r) => r.meal_pref === "veg").length,
    non_veg_count:     rows.filter((r) => r.meal_pref === "non_veg").length,
    ceremony_count:    rows.filter((r) => r.attending_events === "ceremony" || r.attending_events === "both").length,
    reception_count:   rows.filter((r) => r.attending_events === "reception" || r.attending_events === "both").length,
  };

  return NextResponse.json({ summary, rows });
}
