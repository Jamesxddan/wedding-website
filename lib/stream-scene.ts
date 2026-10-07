// Which live-stream layout the wedding-day page shows (all times IST, Oct 8):
//   ceremony        - until 5:45 PM: ceremony player only, reception hidden
//   reception_soon  - 5:45–6:30 PM: ceremony player + "the reception will start soon" note
//   reception_live  - from 6:30 PM: reception player on top, ceremony below as a replay
export type StreamScene = "ceremony" | "reception_soon" | "reception_live";

export const RECEPTION_NOTE_FROM = new Date("2026-10-08T17:45:00+05:30");
export const RECEPTION_LIVE_FROM = new Date("2026-10-08T18:30:00+05:30");

// Set by the owner gear menu (sessionStorage, this device only) to preview a later scene.
export const OWNER_PREVIEW_STREAM_SCENE_KEY = "owner_preview_stream_scene";

export function streamSceneAt(now: number): StreamScene {
  if (now >= RECEPTION_LIVE_FROM.getTime()) return "reception_live";
  if (now >= RECEPTION_NOTE_FROM.getTime()) return "reception_soon";
  return "ceremony";
}

export function previewStreamScene(): StreamScene | null {
  try {
    const v = sessionStorage.getItem(OWNER_PREVIEW_STREAM_SCENE_KEY);
    return v === "reception_soon" || v === "reception_live" ? v : null;
  } catch {
    return null;
  }
}
