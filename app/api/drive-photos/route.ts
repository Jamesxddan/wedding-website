import { NextRequest, NextResponse } from "next/server";
import { fetchDrivePhotos, fetchDriveAlbums } from "@/lib/drive";

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const engagementFolderId = process.env.ENGAGEMENT_FOLDER_ID;
  const weddingFolderId = process.env.WEDDING_FOLDER_ID;

  const folder = req.nextUrl.searchParams.get("folder");
  const view = req.nextUrl.searchParams.get("view"); // "albums" | "flat"

  const folderId = folder === "wedding" ? weddingFolderId : engagementFolderId;

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
  } catch {
    return NextResponse.json(
      { photos: [], albums: [], configured: true, error: true },
      { status: 500 }
    );
  }
}
