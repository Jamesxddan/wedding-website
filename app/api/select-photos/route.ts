import { NextResponse } from "next/server";
import { fetchDriveAlbumsPublic } from "@/lib/drive";

// Public — no session required. These photos load before the guest registers.
export async function GET() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.SELECT_PHOTOS_FOLDER_ID;

  if (!apiKey || !folderId) {
    return NextResponse.json({ albums: [], configured: false });
  }

  try {
    const { albums } = await fetchDriveAlbumsPublic(folderId, apiKey);
    return NextResponse.json({ albums, configured: true });
  } catch (err) {
    console.error("[select-photos] error:", err);
    return NextResponse.json({ albums: [], configured: true, error: true });
  }
}
