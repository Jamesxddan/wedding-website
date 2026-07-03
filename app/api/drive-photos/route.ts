import { NextRequest, NextResponse } from "next/server";
import { fetchDrivePhotos } from "@/lib/drive";

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const engagementFolderId = process.env.ENGAGEMENT_FOLDER_ID;
  const weddingFolderId = process.env.WEDDING_FOLDER_ID;

  const folder = req.nextUrl.searchParams.get("folder");

  const folderId = folder === "wedding" ? weddingFolderId : engagementFolderId;

  if (!apiKey || !folderId) {
    return NextResponse.json({ photos: [], configured: false });
  }

  try {
    const photos = await fetchDrivePhotos(folderId, apiKey);
    return NextResponse.json({ photos, configured: true });
  } catch {
    return NextResponse.json({ photos: [], configured: true, error: true }, { status: 500 });
  }
}
