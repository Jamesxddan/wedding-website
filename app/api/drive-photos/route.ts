import { NextRequest, NextResponse } from "next/server";
import { fetchDrivePhotos, fetchDriveAlbums } from "@/lib/drive";
import { validateSession } from "@/lib/session-check";
import { albumPriority } from "@/lib/album-priority";

export async function GET(req: NextRequest) {
  const folder = req.nextUrl.searchParams.get("folder") ?? "engagement";

  const check = await validateSession(req, "photo_api", { folder });
  if (check instanceof NextResponse) return check;

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const engagementFolderId = process.env.ENGAGEMENT_FOLDER_ID;
  const weddingFolderId = process.env.WEDDING_FOLDER_ID;

  const view = req.nextUrl.searchParams.get("view"); // "albums" | "flat"
  const device = req.nextUrl.searchParams.get("device"); // only sent by CountdownHero

  let folderId: string | undefined;
  if (folder === "wedding") {
    folderId = weddingFolderId;
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
      const priorityPhotos = sorted.flatMap((a) => a.photos);
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
