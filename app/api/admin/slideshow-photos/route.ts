import { NextRequest, NextResponse } from "next/server";
import { fetchDriveAlbums } from "@/lib/drive";
import { albumPriority } from "@/lib/album-priority";
import { isAdmin } from "@/lib/admin-auth";

// Admin-only candidate list for the background-slideshow curation picker —
// same engagement folder the CountdownHero pulls from, but gated by admin
// auth instead of a guest session token.
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const device = req.nextUrl.searchParams.get("device"); // "mobile" | "desktop"
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const engagementFolderId = process.env.ENGAGEMENT_FOLDER_ID;
  const folderId = device === "mobile"
    ? (process.env.ENGAGEMENT_FOLDER_ID_MOBILE ?? engagementFolderId)
    : device === "desktop"
      ? (process.env.ENGAGEMENT_FOLDER_ID_DESKTOP ?? engagementFolderId)
      : engagementFolderId;

  if (!apiKey || !folderId) {
    return NextResponse.json({ photos: [], configured: false });
  }

  try {
    const { albums } = await fetchDriveAlbums(folderId, apiKey);
    const sorted = [...albums].sort((a, b) => albumPriority(a.name) - albumPriority(b.name));
    const photos = sorted.flatMap((a) => a.photos);
    return NextResponse.json({ photos, configured: true });
  } catch (err) {
    console.error("[admin/slideshow-photos] error:", err);
    return NextResponse.json({ photos: [], configured: true, error: true }, { status: 500 });
  }
}
