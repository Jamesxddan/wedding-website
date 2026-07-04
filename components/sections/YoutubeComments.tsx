"use client";

import { useEffect, useState } from "react";
import type { YoutubeComment } from "@/lib/youtube";

interface State {
  comments: YoutubeComment[];
  configured: boolean;
  loading: boolean;
  error: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function YoutubeComments() {
  const [state, setState] = useState<State>({
    comments: [],
    configured: false,
    loading: true,
    error: false,
  });

  useEffect(() => {
    fetch("/api/youtube-comments")
      .then((r) => r.json())
      .then((data) =>
        setState({
          comments: data.comments ?? [],
          configured: data.configured ?? false,
          loading: false,
          error: !!data.error,
        })
      )
      .catch(() => setState((s) => ({ ...s, loading: false, error: true })));
  }, []);

  if (state.loading) {
    return (
      <p className="font-script italic text-deep-rose/50 text-center animate-pulse py-6">
        Loading YouTube comments…
      </p>
    );
  }

  if (!state.configured || state.comments.length === 0) return null;

  return (
    <div className="mt-10">
      <h3 className="font-heading text-xl text-deep-rose mb-6 flex items-center gap-2">
        <span className="text-2xl">▶</span> YouTube Comments
      </h3>
      <ul className="flex flex-col gap-4 max-h-[32rem] overflow-y-auto pr-1">
        {state.comments.map((c) => (
          <li
            key={c.id}
            className="bg-white rounded-xl border border-champagne p-4 flex gap-3"
          >
            {/* Avatar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.authorAvatar}
              alt={c.authorName}
              className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
              loading="lazy"
            />
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-heading text-sm text-deep-rose">
                  {c.authorName}
                </span>
                <span className="font-body text-xs text-deep-rose/40">
                  {timeAgo(c.publishedAt)}
                </span>
                {c.likeCount > 0 && (
                  <span className="font-body text-xs text-deep-rose/40 ml-auto">
                    ♥ {c.likeCount}
                  </span>
                )}
              </div>
              <p
                className="font-body text-sm text-deep-rose/70 leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: c.text }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
