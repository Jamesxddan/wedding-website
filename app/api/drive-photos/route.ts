import { NextRequest, NextResponse } from "next/server";
import { fetchDrivePhotos, fetchDriveAlbums } from "@/lib/drive";
import { validateSession } from "@/lib/session-check";

export async function GET(req: NextRequest) {
  const folder = req.nextUrl.searchParams.get("folder") ?? "engagement";

  const check = await validateSession(req, "photo_api", { folder });
  if (check instanceof NextResponse) return check;

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const engagementFolderId = process.env.ENGAGEMENT_FOLDER_ID;
  const weddingFolderId = process.env.WEDDING_FOLDER_ID;

  const view = req.nextUrl.searchParams.get("view"); // "albums" | "flat"
  const device = req.nextUrl.searchParams.get("device") ?? "desktop";

  let folderId: string | undefined;
  if (folder === "wedding") {
    folderId = weddingFolderId;
  } else if (device === "mobile") {
    folderId = process.env.ENGAGEMENT_FOLDER_ID_MOBILE ?? engagementFolderId;
  } else {
    folderId = process.env.ENGAGEMENT_FOLDER_ID_DESKTOP ?? engagementFolderId;
  }

  if (!apiKey || !folderId) {
    return NextResponse.json({ photos: [], albums: [], configured: false });
  }

  try {
    if (view === "albums") {
      const { albums, flat } = await fetchDriveAlbums(folderId, apiKey);
      return NextResponse.json({ albums, photos: flat, configured: true });
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
