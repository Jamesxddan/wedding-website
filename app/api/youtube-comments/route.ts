import { NextResponse } from "next/server";
import { fetchYoutubeComments } from "@/lib/youtube";
import { YOUTUBE_COMMENT_VIDEO_ID } from "@/lib/constants";

export async function GET() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY; // same Google Cloud project
  const videoId = YOUTUBE_COMMENT_VIDEO_ID;

  if (!apiKey || !videoId) {
    return NextResponse.json({ comments: [], configured: false });
  }

  try {
    const comments = await fetchYoutubeComments(videoId, apiKey);
    return NextResponse.json({ comments, configured: true });
  } catch {
    return NextResponse.json(
      { comments: [], configured: true, error: true },
      { status: 500 }
    );
  }
}
