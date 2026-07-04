export const WEDDING_DATE = new Date("2026-10-08T00:00:00+05:30");

export const COLORS = {
  blush: "#F4C2C2",
  sage: "#87A878",
  cream: "#FDF6EC",
  champagne: "#F5E6C8",
  deepRose: "#B56576",
} as const;

export const COUPLE = {
  groom: "James Daniel",
  bride: "Sharon",
} as const;

export const VENUES = {
  ceremony: {
    name: "St Andrews Kirk",
    city: "Chennai",
    websiteUrl: "",
  },
  reception: {
    name: "BKN Auditorium",
    city: "Chennai",
    youtubeUrl: "",
  },
} as const;

// Optional ambient music for the hero — set to a URL of an MP3/OGG file.
// Leave empty to hide the music button entirely.
export const MUSIC_URL = "";

// Replace with actual stream URLs from each media team on the day.
// YouTube URLs are auto-embedded; any other URL gets a "Watch Live" button.
export const KIRK_STREAM_URL = "https://www.youtube.com/watch?v=jfKfPfyJRdk"; // TEST — replace before wedding
export const BKN_STREAM_URL = "https://www.youtube.com/watch?v=jfKfPfyJRdk";  // TEST — replace before wedding

export const ITINERARY = [
  { time: "TBD", label: "Ceremony", venue: "St Andrews Kirk" },
  { time: "TBD", label: "Reception", venue: "BKN Auditorium" },
] as const;

// Giscus comments — fill these in after running https://giscus.app
// Steps: enable Discussions on your GitHub repo, install the giscus app,
// then paste the repo/repoId/category/categoryId values below.
// Wedding highlights reel — YouTube URL, shown in POST_WEDDING phase.
export const HIGHLIGHTS_VIDEO_URL = "";

// Set to a YouTube video ID (the part after ?v=) to show its comments.
// Can be a pre-wedding video now; swap to the live stream ID after the wedding.
export const YOUTUBE_COMMENT_VIDEO_ID = "";

export const GISCUS_CONFIG = {
  repo: "Jamesxddan/wedding-website" as `${string}/${string}`,
  repoId: "R_kgDOTNgUhA",
  category: "General",
  categoryId: "DIC_kwDOTNgUhM4DAe_R",
} as const;
