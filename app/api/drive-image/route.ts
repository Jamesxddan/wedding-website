import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import sharp from "sharp";
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
    return new NextResponse(null, { status: 404 });
  }

  const fileId = verifyToken(token);
  if (!fileId) {
    return new NextResponse(null, { status: 404 });
  }

  // Referer check applies in ALL environments — direct URL access (no Referer) returns 404.
  // This prevents anyone who sees a URL in devtools from opening it in a new tab.
  // Legitimate image loads always carry a Referer from our own hostname.
  const referer = req.headers.get("referer") ?? "";
  const ownHost = req.nextUrl.hostname;

  if (!referer || !referer.includes(ownHost)) {
    // In production: if the caller had a valid session cookie, punish them for hotlinking.
    if (process.env.VERCEL_ENV === "production") {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const cookieHeader = req.headers.get("cookie") ?? "";
      const galleryToken = cookieHeader
        .split(";")
        .map(c => c.trim())
        .find(c => c.startsWith("gallery_token="))
        ?.slice("gallery_token=".length);

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
    }
    return new NextResponse(null, { status: 404 });
  }

  // In production, also require a valid gallery_token session cookie.
  if (process.env.VERCEL_ENV === "production") {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const galleryToken = cookieHeader
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith("gallery_token="))
      ?.slice("gallery_token=".length);

    if (!galleryToken || !(await isValidSession(galleryToken))) {
      return new NextResponse(null, { status: 404 });
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
      return new NextResponse(null, { status: 404 });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";

    // Only serve actual images — block HTML error pages
    if (!contentType.startsWith("image/")) {
      return new NextResponse(null, { status: 404 });
    }

    const arrayBuf = await res.arrayBuffer();

    // Convert to WebP if the browser supports it — smaller, faster decode
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("image/webp")) {
      try {
        const webp = await sharp(Buffer.from(arrayBuf)).webp({ quality: 82 }).toBuffer();
        return new NextResponse(new Uint8Array(webp), {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      } catch {
        // Fall through to original JPEG on conversion failure
      }
    }

    return new NextResponse(arrayBuf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
