import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "@/lib/supabase";

// In-memory session token cache — avoids a DB hit on every image request.
// Entries expire after 5 minutes; valid session tokens are re-confirmed on cache miss.
const sessionCache = new Map<string, { valid: boolean; expiresAt: number }>();
const SESSION_CACHE_TTL = 5 * 60 * 1000;

async function isValidSession(sessionToken: string): Promise<boolean> {
  const hit = sessionCache.get(sessionToken);
  if (hit && hit.expiresAt > Date.now()) return hit.valid;
  const { data } = await supabase
    .from("device_fingerprints")
    .select("device_uuid")
    .eq("session_token", sessionToken)
    .maybeSingle();
  const valid = !!data;
  sessionCache.set(sessionToken, { valid, expiresAt: Date.now() + SESSION_CACHE_TTL });
  return valid;
}

function verifyToken(token: string): string | null {
  const secret = process.env.DRIVE_TOKEN_SECRET;
  if (!secret) {
    // No secret — dev mode, treat token as raw file ID
    return /^[\w-]+$/.test(token) ? token : null;
  }
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const fileId = decoded.slice(0, lastDot);
    const receivedSig = decoded.slice(lastDot + 1);
    const expectedSig = createHmac("sha256", secret).update(fileId).digest("hex").slice(0, 24);
    if (receivedSig !== expectedSig) return null;
    if (!/^[\w-]+$/.test(fileId)) return null;
    return fileId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  const token = req.nextUrl.searchParams.get("id");
  const sz = req.nextUrl.searchParams.get("sz") ?? "600";

  if (!apiKey || !token) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileId = verifyToken(token);
  if (!fileId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // On Vercel, enforce two checks:
  // 1. The request must originate from our own site (Referer contains our hostname).
  //    This blocks direct tab access and hotlinking — browsers only send Referer
  //    when the image is loaded by a page on the same origin.
  // 2. A valid gallery_token session cookie must be present.
  if (process.env.VERCEL_ENV) {
    const referer = req.headers.get("referer") ?? "";
    const ownHost = req.nextUrl.hostname;
    if (!referer || !referer.includes(ownHost)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const cookieHeader = req.headers.get("cookie") ?? "";
    const galleryToken = cookieHeader
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("gallery_token="))
      ?.slice("gallery_token=".length);
    if (!galleryToken || !(await isValidSession(galleryToken))) {
      return new NextResponse("Forbidden", { status: 403 });
    }
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
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
