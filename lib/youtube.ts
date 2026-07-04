export interface YoutubeComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

const YT_API = "https://www.googleapis.com/youtube/v3";

export async function fetchYoutubeComments(
  videoId: string,
  apiKey: string,
  maxResults = 20
): Promise<YoutubeComment[]> {
  const params = new URLSearchParams({
    part: "snippet",
    videoId,
    maxResults: String(maxResults),
    order: "relevance",
    key: apiKey,
  });

  const res = await fetch(`${YT_API}/commentThreads?${params}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json() as {
    items: {
      id: string;
      snippet: {
        topLevelComment: {
          snippet: {
            authorDisplayName: string;
            authorProfileImageUrl: string;
            textDisplay: string;
            likeCount: number;
            publishedAt: string;
          };
        };
      };
    }[];
  };

  return (data.items ?? []).map((item) => {
    const s = item.snippet.topLevelComment.snippet;
    return {
      id: item.id,
      authorName: s.authorDisplayName,
      authorAvatar: s.authorProfileImageUrl,
      text: s.textDisplay,
      likeCount: s.likeCount,
      publishedAt: s.publishedAt,
    };
  });
}
