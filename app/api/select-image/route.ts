import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { fetchDriveAlbumsPublic } from "@/lib/drive";

// Public image proxy for the select-photos folder.
// No session required — these photos appear before the guest registers.
// Validates file IDs against the cached album list to prevent proxying arbitrary Drive files.
// Referer check applied in all environments so direct URL access returns 404.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const sz = req.nextUrl.searchParams.get("sz") ?? "600";
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const folderId = process.env.SELECT_PHOTOS_FOLDER_ID;

  if (!id || !apiKey || !folderId) {
    return new NextResponse(null, { status: 404 });
  }

  // Block direct URL access in all environments — legitimate <img> loads always carry a Referer.
  const referer = req.headers.get("referer") ?? "";
  const ownHost = req.nextUrl.hostname;
  if (!referer || !referer.includes(ownHost)) {
    return new NextResponse(null, { status: 404 });
  }

  // Validate this file ID belongs to the known select-photos folder.
  // Uses the in-memory cache so this is free after the first request.
  const { flat } = await fetchDriveAlbumsPublic(folderId, apiKey);
  if (!flat.some(p => p.id === id)) {
    return new NextResponse(null, { status: 404 });
  }

  const url = `https://drive.google.com/thumbnail?id=${id}&sz=w${sz}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    return new NextResponse(null, { status: 404 });
  }

  const body = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("Content-Type") ?? "image/jpeg";

  // Convert to WebP if the browser supports it
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("image/webp")) {
    try {
      const webp = await sharp(body).webp({ quality: 82 }).toBuffer();
      return new NextResponse(webp, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      // Fall through to original JPEG on conversion failure
    }
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
