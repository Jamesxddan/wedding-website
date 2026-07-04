import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const fileId = req.nextUrl.searchParams.get("id");
  const sz = req.nextUrl.searchParams.get("sz") ?? "600";

  if (!apiKey || !fileId || !/^[\w-]+$/.test(fileId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Fetch thumbnail server-side — avoids ERR_BLOCKED_BY_ORB (browser-only restriction)
  // drive.google.com/thumbnail serves resized images without auth for shared files
  const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${sz}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) {
      return new NextResponse("Image not found", { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    // Only serve actual images — block HTML error pages
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Not an image", { status: 404 });
    }

    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
