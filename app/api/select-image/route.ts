import { NextRequest, NextResponse } from "next/server";
import { fetchDriveAlbumsPublic } from "@/lib/drive";

// Public image proxy for the select-photos folder.
// No session required — these photos appear before the guest registers.
// Validates file IDs against the cached album list to prevent proxying arbitrary Drive files.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const sz = req.nextUrl.searchParams.get("sz") ?? "600";
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.SELECT_PHOTOS_FOLDER_ID;

  if (!id || !apiKey || !folderId) {
    return new NextResponse(null, { status: 400 });
  }

  // Validate this file ID belongs to the known select-photos folder.
  // Uses the in-memory cache so this is free after the first request.
  const { flat } = await fetchDriveAlbumsPublic(folderId, apiKey);
  if (!flat.some(p => p.id === id)) {
    return new NextResponse(null, { status: 403 });
  }

  const url = `https://drive.google.com/thumbnail?id=${id}&sz=w${sz}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
