"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { safeGetItem } from "@/lib/storage";

const POLL_MS = 12_000;
const REACTION_EMOJIS = ["❤️", "🎊", "😭", "🥂", "🙏", "✨"];
const GOLD = "#D4AF37";
const ROSE = "#5a1f2e";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;

interface TickerUpdate {
  id: string;
  message: string;
  icon: string;
  created_at: string;
  reactions: Record<string, number>;
  my_reactions: string[];
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? safeGetItem("session_token") : null;
  return { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LiveTicker() {
  const [updates, setUpdates] = useState<TickerUpdate[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [reacting, setReacting] = useState<Record<string, boolean>>({});
  const knownIds = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch("/api/ticker", { headers: authHeaders() });
      if (!res.ok) return;
      const { updates: fresh } = await res.json() as { updates: TickerUpdate[] };
      const incoming = new Set<string>();
      for (const u of fresh) {
        if (!knownIds.current.has(u.id)) incoming.add(u.id);
        knownIds.current.add(u.id);
      }
      if (incoming.size > 0) setNewIds(prev => new Set([...prev, ...incoming]));
      setUpdates(fresh);
      if (incoming.size > 0) {
        setTimeout(() => setNewIds(prev => {
          const next = new Set(prev);
          incoming.forEach(id => next.delete(id));
          return next;
        }), 1200);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUpdates();
    pollRef.current = setInterval(fetchUpdates, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchUpdates]);

  async function react(updateId: string, emoji: string) {
    const key = `${updateId}:${emoji}`;
    if (reacting[key]) return;
    setReacting(r => ({ ...r, [key]: true }));

    // Optimistic update
    setUpdates(prev => prev.map(u => {
      if (u.id !== updateId) return u;
      const has = u.my_reactions.includes(emoji);
      return {
        ...u,
        reactions: { ...u.reactions, [emoji]: Math.max(0, (u.reactions[emoji] ?? 0) + (has ? -1 : 1)) },
        my_reactions: has ? u.my_reactions.filter(e => e !== emoji) : [...u.my_reactions, emoji],
      };
    }));

    try {
      await fetch("/api/ticker/react", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ update_id: updateId, emoji }),
      });
    } catch { /* best-effort */ }
    finally { setReacting(r => ({ ...r, [key]: false })); }
  }

  if (updates.length === 0) return null;

  return (
    <section
      style={{
        background: "linear-gradient(180deg, #fdf6ec 0%, #fffdf9 100%)",
        padding: "56px 20px",
        borderTop: `1px solid ${GA(0.2)}`,
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#e74c3c",
              boxShadow: "0 0 0 3px rgba(231,76,60,0.25)",
              animation: "ticker-pulse 1.4s ease-in-out infinite",
            }} />
            <p style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: 10, letterSpacing: "0.35em",
              textTransform: "uppercase", color: RA(0.5), margin: 0,
            }}>
              Live updates
            </p>
          </div>
          <h2 style={{
            fontFamily: "var(--font-script, Georgia, serif)",
            fontStyle: "italic",
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: ROSE, margin: 0,
          }}>
            What&apos;s happening right now
          </h2>
        </div>

        {/* Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {updates.map(update => {
            const isNew = newIds.has(update.id);
            return (
              <div
                key={update.id}
                style={{
                  background: "#fffdf9",
                  borderRadius: 14,
                  border: `1px solid ${GA(isNew ? 0.5 : 0.2)}`,
                  boxShadow: isNew
                    ? `0 4px 24px ${RA(0.1)}, 0 0 0 2px ${GA(0.18)}`
                    : `0 2px 12px ${RA(0.06)}`,
                  overflow: "hidden",
                  animation: isNew ? "ticker-slide-in 0.5s cubic-bezier(0.22,1,0.36,1) both" : "none",
                  transition: "border-color 0.4s ease, box-shadow 0.4s ease",
                }}
              >
                {isNew && (
                  <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
                )}
                <div style={{ padding: "14px 16px 12px" }}>
                  {/* Update row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{update.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: "var(--font-body, Georgia, serif)",
                        fontSize: 14, color: ROSE, margin: "0 0 3px",
                        lineHeight: 1.5,
                      }}>
                        {update.message}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-body, Georgia, serif)",
                        fontSize: 11, color: RA(0.35), margin: 0,
                      }}>
                        {timeAgo(update.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Reactions */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {REACTION_EMOJIS.map(emoji => {
                      const count = update.reactions[emoji] ?? 0;
                      const mine = update.my_reactions.includes(emoji);
                      const key = `${update.id}:${emoji}`;
                      return (
                        <button
                          key={emoji}
                          onClick={() => react(update.id, emoji)}
                          disabled={!!reacting[key]}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "4px 9px", borderRadius: 99,
                            border: mine ? `1.5px solid ${GA(0.6)}` : `1px solid ${GA(0.22)}`,
                            background: mine ? GA(0.1) : "transparent",
                            cursor: "pointer", transition: "all 0.15s ease",
                            fontSize: 13,
                          }}
                        >
                          <span>{emoji}</span>
                          {count > 0 && (
                            <span style={{
                              fontFamily: "var(--font-body, Georgia, serif)",
                              fontSize: 11, color: mine ? GOLD : RA(0.45),
                              fontWeight: mine ? 600 : 400,
                            }}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes ticker-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes ticker-slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
