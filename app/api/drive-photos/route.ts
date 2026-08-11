import { NextRequest, NextResponse } from "next/server";
import { fetchDrivePhotos, fetchDriveAlbums, type DrivePhoto } from "@/lib/drive";
import { validateSession } from "@/lib/session-check";
import { albumPriority } from "@/lib/album-priority";
import { supabase } from "@/lib/supabase";

// Reorders/filters photos to just the curated IDs (in the order given), when
// the admin has manually picked a set for this slideshow. Falls back to the
// full auto-pulled list untouched when no curation is set.
function applyCuration(photos: DrivePhoto[], curatedIdsCsv: string | undefined): DrivePhoto[] {
  const ids = curatedIdsCsv?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!ids?.length) return photos;
  const byId = new Map(photos.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is DrivePhoto => !!p);
}

export async function GET(req: NextRequest) {
  const folder = req.nextUrl.searchParams.get("folder") ?? "engagement";

  const check = await validateSession(req, "photo_api", { folder });
  if (check instanceof NextResponse) return check;

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const engagementFolderId = process.env.ENGAGEMENT_FOLDER_ID;
  const weddingFolderIdEnv = process.env.WEDDING_FOLDER_ID;

  const view = req.nextUrl.searchParams.get("view"); // "albums" | "flat"
  const device = req.nextUrl.searchParams.get("device"); // only sent by CountdownHero

  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["wedding_folder_id", "slideshow_mobile_ids", "slideshow_desktop_ids"]);
  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value;

  let folderId: string | undefined;
  if (folder === "wedding") {
    // Admin-pasted Drive link (settings) takes priority over the env var.
    folderId = settings.wedding_folder_id || weddingFolderIdEnv;
  } else if (device === "mobile") {
    // CountdownHero slideshow — portrait photos
    folderId = process.env.ENGAGEMENT_FOLDER_ID_MOBILE ?? engagementFolderId;
  } else if (device === "desktop") {
    // CountdownHero slideshow — landscape photos
    folderId = process.env.ENGAGEMENT_FOLDER_ID_DESKTOP ?? engagementFolderId;
  } else {
    // Gallery (no device param) — general folder for all devices
    folderId = engagementFolderId;
  }

  if (!apiKey || !folderId) {
    return NextResponse.json({ photos: [], albums: [], configured: false });
  }

  try {
    if (view === "albums") {
      const { albums, flat } = await fetchDriveAlbums(folderId, apiKey);
      // Return photos sorted by album priority so slideshow and gallery both respect main/sub1/sub2…
      const sorted = [...albums].sort((a, b) => albumPriority(a.name) - albumPriority(b.name));
      let priorityPhotos = sorted.flatMap((a) => a.photos);

      // Manually curated background-slideshow selection, if the admin has set one.
      if (device === "mobile") priorityPhotos = applyCuration(priorityPhotos, settings.slideshow_mobile_ids);
      if (device === "desktop") priorityPhotos = applyCuration(priorityPhotos, settings.slideshow_desktop_ids);

      return NextResponse.json({ albums, photos: priorityPhotos, configured: true });
    }
    const photos = await fetchDrivePhotos(folderId, apiKey);
    return NextResponse.json({ photos, configured: true });
  } catch (err) {
    console.error("[drive-photos] error:", err);
    return NextResponse.json(
      { photos: [], albums: [], configured: true, error: true, message: String(err) },
      { status: 500 }
    );
  }
}
