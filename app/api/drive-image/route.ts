import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "@/lib/supabase";
import { sendBreachAlert } from "@/lib/alert";

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
  const token = req.nextUrl.searchParams.get("id");
  const sz = req.nextUrl.searchParams.get("sz") ?? "600";

  if (!token) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileId = verifyToken(token);
  if (!fileId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // On Vercel, enforce two checks:
  // 1. Referer must be from our own hostname — blocks direct tab access / hotlinking.
  // 2. A valid gallery_token session cookie must be present.
  // If someone has a valid cookie but bad Referer (direct URL access while logged in),
  // immediately kill their session and ban them for 1 hour.
  if (process.env.VERCEL_ENV === "production") {
    const referer = req.headers.get("referer") ?? "";
    const ownHost = req.nextUrl.hostname;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const cookieHeader = req.headers.get("cookie") ?? "";
    const galleryToken = cookieHeader
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("gallery_token="))
      ?.slice("gallery_token=".length);

    if (!referer || !referer.includes(ownHost)) {
      // If they have a valid session token, identify and punish them.
      if (galleryToken) {
        const { data: fp } = await supabase
          .from("device_fingerprints")
          .select("device_uuid")
          .eq("session_token", galleryToken)
          .maybeSingle();
        if (fp) {
          // Kill their session so they must re-register.
          await supabase.from("device_fingerprints").delete().eq("session_token", galleryToken);
          // Block re-registration for 1 hour.
          await supabase.from("breach_flags").insert({
            device_uuid: fp.device_uuid,
            ip,
            reason: "hotlink_attempt",
            blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
          void sendBreachAlert({
            reason: "hotlink_attempt",
            device_uuid: fp.device_uuid,
            ip,
            extra: "Session killed. Guest blocked from re-registering for 1 hour.",
          });
        }
      }
      return new NextResponse("Forbidden", { status: 403 });
    }

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
