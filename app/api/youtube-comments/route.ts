import { NextResponse } from "next/server";
import { fetchYoutubeComments } from "@/lib/youtube";
import { YOUTUBE_COMMENT_VIDEO_ID } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

function extractVideoId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const url = new URL(s.includes("://") ? s : "https://" + s);
    const v = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
    return v && v.length >= 6 ? v : null;
  } catch {
    return /^[\w-]{6,}$/.test(s) ? s : null;
  }
}

export async function GET() {
  // Dedicated YouTube Data API key, if present; otherwise fall back to the
  // shared Google key (often Drive-scoped and blocked from YouTube methods).
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY;

  // Admin can set the comment-source video via the settings table; fall back to the constant.
  let videoId = YOUTUBE_COMMENT_VIDEO_ID;
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "youtube_comment_video_id")
      .maybeSingle();
    if (!error && data?.value) {
      videoId = extractVideoId(data.value) ?? videoId;
    }
  } catch {
    // ignore settings lookup failure; fall back to constant
  }

  if (!apiKey || !videoId) {
    return NextResponse.json({ comments: [], configured: false });
  }

  try {
    const comments = await fetchYoutubeComments(videoId, apiKey);
    return NextResponse.json({ comments, configured: true });
  } catch (err) {
    return NextResponse.json(
      { comments: [], configured: true, error: true, errorMessage: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
