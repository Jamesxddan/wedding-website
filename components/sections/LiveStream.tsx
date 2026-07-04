"use client";

interface Props {
  url: string;
  label: string;
  channel: string;
}

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v") ?? u.pathname.split("/").pop() ?? null;
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0] || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export default function LiveStream({ url, label, channel }: Props) {
  if (!url) return null;

  const youtubeId = extractYoutubeId(url);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <h3 className="font-heading text-xl text-deep-rose">{channel}</h3>
      </div>
      <p className="font-body text-deep-rose/70 text-sm">{label}</p>

      {youtubeId ? (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
            title={channel}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        /* Non-YouTube URL — show Watch Live button */
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-deep-rose text-cream font-heading tracking-widest uppercase text-sm hover:opacity-90 transition-opacity self-start"
        >
          <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
          Watch Live
        </a>
      )}
    </div>
  );
}
