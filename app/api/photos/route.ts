import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const deviceUuid = req.headers.get("x-device-uuid");
  const album = req.nextUrl.searchParams.get("album") ?? "wedding";

  if (!deviceUuid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Verify this device belongs to a known guest
  const { data: fp } = await supabase
    .from("device_fingerprints")
    .select("guest_id")
    .eq("device_uuid", deviceUuid)
    .maybeSingle();

  if (!fp?.guest_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // List files in the album folder
  const { data: files, error: listError } = await supabase.storage
    .from("photos")
    .list(album, { limit: 500, sortBy: { column: "name", order: "asc" } });

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|heic)$/i;
  const paths = (files ?? [])
    .filter((f) => IMAGE_EXT.test(f.name))
    .map((f) => `${album}/${f.name}`);

  if (paths.length === 0) return NextResponse.json([]);

  // Batch-generate signed URLs (5-minute expiry each — fast to redirect)
  const { data: signed, error: signError } = await supabase.storage
    .from("photos")
    .createSignedUrls(paths, 300);

  if (signError) return NextResponse.json({ error: signError.message }, { status: 500 });

  return NextResponse.json(
    (signed ?? []).map((s) => ({
      path: s.path,
      name: (s.path ?? "").split("/").pop() ?? "",
      url: s.signedUrl,
    })),
    { headers: { "Cache-Control": "no-store" } }
  );
}
