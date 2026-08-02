"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { safeGetItem } from "@/lib/storage";
import { GOLD_GRADIENT, DamaskDivider, ConfettiBurst } from "@/components/ui/OrnamentalMotifs";
import AnimatedSection from "@/components/ui/AnimatedSection";

interface Comment {
  id: string;
  guest_id: string;
  guest_name: string;
  message: string;
  created_at: string;
  updated_at: string;
}

interface YoutubeComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

/** Shared display item for the Wall of Love — guest messages and (optional) YouTube comments. */
type WallItem =
  | ({ source: "guest" } & Comment)
  | ({ source: "youtube"; authorName: string; authorAvatar: string; text: string; likeCount: number } & Pick<Comment, "id" | "created_at" | "updated_at">);

const EDIT_MS = 2 * 60 * 1000;

const EMOJI_GROUPS = [
  { label: "💒 Wedding", emojis: ["💍","💒","👰","🤵","💐","🌹","🥂","🎂","🎊","🎉","💌","🕊️","🌸","✨","🙏","🫶"] },
  { label: "❤️ Hearts", emojis: ["❤️","💕","💖","💗","💝","💞","🥰","😍","💓","💘","🩷","🫀"] },
  { label: "😊 Faces", emojis: ["😊","😄","😂","🥹","😭","🤗","🥳","😎","🤩","😇","🤭","🫠"] },
  { label: "🎶 Vibes", emojis: ["🎶","🎵","🌟","💫","⭐","🌙","☀️","🔥","🌈","🎈","🪄","🍾"] },
];

const STICKERS = [
  { id: "congrats", label: "Congrats!", emoji: "🎊" },
  { id: "love", label: "Love!", emoji: "💕" },
  { id: "cheers", label: "Cheers!", emoji: "🥂" },
  { id: "blessed", label: "Blessed", emoji: "🙏" },
  { id: "beautiful", label: "Beautiful", emoji: "🌹" },
  { id: "forever", label: "Forever", emoji: "💍" },
  { id: "joy", label: "Joy!", emoji: "🎉" },
  { id: "wishes", label: "Best Wishes", emoji: "⭐" },
];

/** Frame colours cycled per card */
const FRAME_STYLES = [
  { name: "gold", gradient: "linear-gradient(145deg, #c8a86a, #a88848, #c8a86a)" },
  { name: "silver", gradient: "linear-gradient(145deg, #b0b0b0, #909090, #b0b0b0)" },
  { name: "rose", gradient: "linear-gradient(145deg, #c89090, #a87070, #c89090)" },
  { name: "sage", gradient: "linear-gradient(145deg, #8a9e80, #6a7e60, #8a9e80)" },
  { name: "dark", gradient: "linear-gradient(145deg, #4a3a3a, #2a1a1a, #4a3a3a)" },
];

const CARD_ROTATIONS = ["-0.8deg", "0.6deg", "-1.2deg", "0.9deg", "-0.5deg", "1.1deg", "-0.3deg", "0.4deg"];

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? safeGetItem("session_token") : null;
  return { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) };
}

function timeLeft(createdAt: string): number {
  return Math.max(0, EDIT_MS - (Date.now() - new Date(createdAt).getTime()));
}

function formatCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function isSticker(message: string) {
  return message.startsWith("[sticker:") && message.endsWith("]");
}

function stickerData(message: string) {
  const id = message.slice(9, -1);
  return STICKERS.find((s) => s.id === id);
}

interface Props {
  guestName?: string | null;
  guestId?: string | null;
  isOwner?: boolean;
}

// ─── Stagger animation ───────────────────────────────────────────
function useStagger(delay = 80) {
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const addId = useCallback((id: string) => {
    setVisible((prev) => { if (prev.has(id)) return prev; const n = new Set(prev); n.add(id); return n; });
  }, []);
  const style = useCallback((id: string): React.CSSProperties => ({
    opacity: visible.has(id) ? 1 : 0,
    transform: visible.has(id) ? "translateY(0) scale(1)" : "translateY(16px) scale(0.95)",
    transition: `opacity 0.5s ease, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)`,
  }), [visible]);

  const enter = useCallback((id: string, i: number) => {
    setTimeout(() => addId(id), i * delay);
  }, [addId, delay]);

  return { enter, style };
}

// ─── Main Component ──────────────────────────────────────────────
export default function Comments({ guestName, guestId, isOwner }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab] = useState(0);
  const [showStickers, setShowStickers] = useState(false);
  const [, setTick] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const [ytComments, setYtComments] = useState<YoutubeComment[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const { enter: enterStagger, style: staggerStyle } = useStagger(80);

  // Merge the configured video's YouTube comments into the same feed, if any.
  const display: WallItem[] = useMemo(() => {
    const items: WallItem[] = [
      ...comments.map((c): WallItem => ({ source: "guest", ...c })),
      ...ytComments.map((c): WallItem => ({
        source: "youtube",
        id: c.id,
        created_at: c.publishedAt,
        updated_at: c.publishedAt,
        authorName: c.authorName,
        authorAvatar: c.authorAvatar,
        text: c.text,
        likeCount: c.likeCount,
      })),
    ];
    return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments, ytComments]);

  const load = useCallback(async () => {
    const res = await fetch("/api/comments");
    if (res.ok) setComments(await res.json());
    const yt = await fetch("/api/youtube-comments").then((r) => r.json().catch(() => ({})));
    const list = Array.isArray(yt) ? [] : (yt.comments ?? []);
    setYtComments(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    display.forEach((c, i) => enterStagger(c.id, i));
  }, [display, enterStagger]);

  function insertEmoji(emoji: string, forEdit = false) {
    if (forEdit) {
      const el = editRef.current;
      if (!el) return;
      const start = el.selectionStart ?? editText.length;
      const end = el.selectionEnd ?? editText.length;
      const next = editText.slice(0, start) + emoji + editText.slice(end);
      setEditText(next);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
    } else {
      const el = textRef.current;
      if (!el) return;
      const start = el.selectionStart ?? message.length;
      const end = el.selectionEnd ?? message.length;
      const next = message.slice(0, start) + emoji + message.slice(end);
      setMessage(next);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
    }
    setShowEmoji(false);
  }

  async function sendSticker(sticker: typeof STICKERS[0]) {
    if (!guestName) return;
    setShowStickers(false);
    setPosting(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: `[sticker:${sticker.id}]` }),
    });
    setPosting(false);
    if (res.ok) { setConfetti(true); await load(); }
    else {
      const d = await res.json().catch(() => ({}));
      if (d.error === "blocked_peace") setError(d.message);
      else if (d.error === "blocked") setError("You are temporarily blocked from commenting.");
      else setError("Something went wrong.");
    }
  }

  async function post() {
    if (!message.trim() || posting || !guestName) return;
    setPosting(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message }),
    });
    setPosting(false);
    if (res.ok) { setMessage(""); setConfetti(true); await load(); }
    else {
      const d = await res.json();
      if (d.error === "blocked_peace") setError(d.message);
      else if (d.error === "flagged") setError("Your message was flagged for review. You've been temporarily blocked from commenting pending review.");
      else if (d.error === "blocked") setError("You are temporarily blocked from commenting. Please contact James & Sharon.");
      else setError("Something went wrong. Please try again.");
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ id, message: editText }),
    });
    if (res.ok) { setEditingId(null); await load(); }
    else {
      const d = await res.json();
      if (d.error === "blocked_peace") setError(d.message);
      else if (d.error === "edit_expired") setError("Edit window has closed.");
      else if (d.error === "flagged") setError("Edit flagged for review.");
      else setError("Failed to save.");
    }
  }

  async function deleteComment(id: string) {
    await fetch("/api/comments", {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    });
    await load();
  }

  // ── Shared button styles ───────────────────────────────────────
  const iconBtn: React.CSSProperties = {
    fontSize: 18, background: "rgba(139,74,107,0.06)", border: "1px solid rgba(139,74,107,0.12)",
    borderRadius: 8, width: 34, height: 34, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#8B4A6B", transition: "all 0.2s",
  };

  const pickerBox: React.CSSProperties = {
    position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#faf5ec",
    border: "1px solid rgba(180,150,130,0.15)", borderRadius: 14, padding: 12, width: 280,
    boxShadow: "0 8px 32px rgba(0,0,0,0.08)", zIndex: 100,
  };

  const goldGradient = GOLD_GRADIENT;

  return (
    <section
      id="wall-of-love"
      className="py-24 px-6"
      style={{
        background: `
          radial-gradient(ellipse 100% 60% at 50% 0%, rgba(181,101,118,0.05) 0%, transparent 100%),
          radial-gradient(ellipse 80% 50% at 20% 100%, rgba(200,180,160,0.06) 0%, transparent 100%),
          linear-gradient(180deg, #fcf8f3 0%, #f5eee6 50%, #efe6db 100%)
        `,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Damask pattern overlay */}
      <div
        style={{
          position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 15 Q70 35 60 55 Q50 35 60 15z M60 55 Q70 75 60 95 Q50 75 60 55z M15 60 Q35 70 55 60 Q35 50 15 60z M55 60 Q75 70 95 60 Q75 50 55 60z' fill='%238B4A6B'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      <ConfettiBurst active={confetti} onDone={() => setConfetti(false)} />

      <div className="max-w-5xl mx-auto" style={{ position: "relative", zIndex: 1 }}>
        {/* ── Heading ────────────────────────────────────────────── */}
        <AnimatedSection variant="fade-up" as="div" className="text-center mb-8">
          <h2
            className="font-heading text-3xl md:text-4xl mb-1"
            style={{ color: "#3a2528", letterSpacing: "0.5px", fontFamily: "'Playfair Display', serif" }}
          >
            Wall of Love
          </h2>
          <DamaskDivider />
          <p className="font-script italic text-lg" style={{ color: "rgba(100,80,85,0.6)" }}>
            Leave your blessings for James &amp; Sharon 💛
          </p>
          {comments.length > 0 && (
            <p style={{
              fontSize: 12, color: "rgba(100,80,85,0.4)", marginTop: 6,
              letterSpacing: "1px", fontFamily: "Inter, sans-serif",
            }}>
              <span style={{ color: "#b56576", fontWeight: 600 }}>{comments.length}</span> blessing{comments.length !== 1 ? "s" : ""} from your loved ones
            </p>
          )}
        </AnimatedSection>

        {/* ── Write message area ─────────────────────────────────── */}
        {guestName ? (
          <div
            className="mx-auto mb-12"
            style={{ maxWidth: 540, position: "relative" }}
          >
            {/* Ornamental frame around form */}
            <div
              style={{
                padding: 5, borderRadius: 6,
                background: goldGradient,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
                position: "relative",
              }}
            >
              {/* gold shimmer */}
              <div style={{
                position: "absolute", inset: 2, borderRadius: 4, pointerEvents: "none",
                background: "linear-gradient(135deg, transparent 30%, rgba(255,215,0,0.04) 40%, transparent 50%, rgba(255,215,0,0.03) 60%, transparent 70%)",
              }} />

              {/* hanging ring */}
              <div style={{
                position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                width: 12, height: 12, borderRadius: "50%",
                border: "2px solid #8a7a5a", background: "transparent",
                boxShadow: "0 0 4px rgba(0,0,0,0.2)", zIndex: 2,
              }} />

              <div style={{
                background: "#faf5ec", borderRadius: 4, padding: "20px 22px 16px",
                position: "relative",
              }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: goldGradient }}
                  >
                    {guestName![0].toUpperCase()}
                  </div>
                  <span className="text-sm tracking-wider" style={{ color: "#3a2528", fontFamily: "'Playfair Display', serif" }}>
                    {guestName}
                  </span>
                </div>
                <textarea
                  ref={textRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
                  placeholder="Write a sweet message… (Enter to send)"
                  rows={3}
                  className="w-full border rounded-xl px-4 py-3 text-sm resize-none outline-none font-body transition-colors"
                  style={{
                    borderColor: "rgba(180,150,130,0.25)", color: "#2a1a1a",
                    background: "#fdfbf9",
                    caretColor: "#8B4A6B",
                  }}
                />
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <div style={{ position: "relative" }}>
                    <button onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }} style={iconBtn}>😊</button>
                    {showEmoji && (
                      <div style={pickerBox}>
                        <div className="flex gap-1 mb-2 flex-wrap">
                          {EMOJI_GROUPS.map((g, i) => (
                            <button key={i} onClick={() => setEmojiTab(i)}
                              className="text-xs px-2 py-1 rounded-lg border-none cursor-pointer transition-colors"
                              style={{
                                background: emojiTab === i ? goldGradient : "rgba(200,168,139,0.1)",
                                color: emojiTab === i ? "#fff" : "rgba(200,184,168,0.5)",
                              }}>
                              {g.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {EMOJI_GROUPS[emojiTab].emojis.map((em) => (
                            <button key={em} onClick={() => insertEmoji(em)}
                              className="text-xl bg-none border-none cursor-pointer p-0.5 rounded leading-none"
                              style={{ filter: "brightness(1.2)" }}>
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ position: "relative" }}>
                    <button onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); }} style={iconBtn}>🎁</button>
                    {showStickers && (
                      <div style={{ ...pickerBox, width: 260 }}>
                        <p className="text-[11px] mb-2 font-body" style={{ color: "rgba(200,184,168,0.4)" }}>Tap a sticker to send</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {STICKERS.map((s) => (
                            <button key={s.id} onClick={() => sendSticker(s)}
                              className="rounded-xl p-2 cursor-pointer text-center flex flex-col items-center gap-0.5 hover:border-blush transition-colors"
                              style={{
                                background: "rgba(200,168,139,0.06)", border: "1px solid rgba(200,168,139,0.1)",
                              }}>
                              <span className="text-2xl">{s.emoji}</span>
                              <span className="text-[9px]" style={{ color: "rgba(200,184,168,0.4)" }}>{s.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1" />
                  <button
                    onClick={post}
                    disabled={posting || !message.trim()}
                    className="font-heading text-sm tracking-wider px-5 py-2 rounded-full border-none cursor-pointer transition-all"
                    style={{
                      background: message.trim() ? goldGradient : "rgba(180,150,130,0.2)",
                      color: "#fff",
                      opacity: posting ? 0.7 : 1,
                      boxShadow: message.trim() ? "0 2px 12px rgba(200,168,106,0.2)" : "none",
                    }}
                  >
                    {posting ? "Sending…" : "Send 💌"}
                  </button>
                </div>
                {error && <p className="mt-2 text-[13px]" style={{ color: "#c0392b" }}>{error}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto mb-12 max-w-lg">
            <div
              className="text-center py-12 px-6 rounded-2xl"
              style={{
                background: "rgba(250,245,236,0.6)",
                border: "1px dashed rgba(139,74,107,0.15)",
              }}
            >
              <span className="text-4xl block mb-3">💌</span>
              <p className="font-body text-sm mb-1" style={{ color: "rgba(100,80,85,0.5)" }}>Want to leave a message?</p>
              <p className="font-body text-xs" style={{ color: "rgba(100,80,85,0.3)" }}>
                Register your name on the home page to share your wishes.
              </p>
            </div>
          </div>
        )}

        {/* ── Messages Grid ──────────────────────────────────────── */}
        {display.length > 0 ? (
          <AnimatedSection variant="pop" className="flex flex-wrap justify-center gap-6 items-start" as="div">
            {display.map((c, idx) => {
              const isYt = c.source === "youtube";
              let isMe = false;
              if (!isYt && guestId) isMe = c.guest_id === guestId;
              const left = isMe ? timeLeft(c.created_at) : 0;
              const canEdit = isMe && left > 0;
              let sticker: ReturnType<typeof stickerData> | null = null;
              if (!isYt) sticker = isSticker(c.message) ? stickerData(c.message) : null;
              const frame = FRAME_STYLES[idx % FRAME_STYLES.length];
              const rotation = CARD_ROTATIONS[idx % CARD_ROTATIONS.length];

              // YouTube comments are read-only — no edit/delete/emoji/sticker controls.
              if (isYt) {
                return (
                  <div
                    key={`yt-${c.id}`}
                    className="frame-card"
                    style={{
                      ...staggerStyle(c.id),
                      transform: staggerStyle(c.id).transform
                        ? `${staggerStyle(c.id).transform} rotate(${rotation})`
                        : `rotate(${rotation})`,
                      width: 270,
                      position: "relative",
                      transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s",
                      cursor: "default",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: 5, borderRadius: 4,
                        background: frame.gradient,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          background: "#faf5ef", borderRadius: 2, padding: "16px 18px 14px",
                          position: "relative",
                        }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.authorAvatar || ""}
                            alt={c.authorName}
                            className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                            style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-xs tracking-wider truncate"
                              style={{ color: "#2a1a1a", fontFamily: "'Marcellus SC', serif", letterSpacing: "1px", textTransform: "uppercase", fontSize: 11 }}
                            >
                              {c.authorName}
                            </div>
                            <span style={{ fontSize: 9, color: "#b0a090", fontFamily: "Inter, sans-serif" }}>
                              {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              {c.likeCount > 0 && <> · ♥ {c.likeCount}</>}
                            </span>
                          </div>
                          <span
                            className="flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded-full text-white"
                            style={{ background: "#c4302b", fontFamily: "Inter, sans-serif", letterSpacing: "0.5px" }}
                          >
                            YouTube
                          </span>
                        </div>
                        <p
                          className="font-body leading-relaxed"
                          style={{
                            color: "#2a1a1a",
                            fontSize: 15,
                            fontFamily: "'Caveat', cursive",
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {c.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  className="frame-card"
                  style={{
                    ...staggerStyle(c.id),
                    transform: staggerStyle(c.id).transform
                      ? `${staggerStyle(c.id).transform} rotate(${rotation})`
                      : `rotate(${rotation})`,
                    width: 270,
                    position: "relative",
                    transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s",
                    cursor: "default",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `scale(1.04) rotate(${rotation})`;
                    e.currentTarget.style.zIndex = "5";
                  }}
                  onMouseLeave={(e) => {
                    const v = staggerStyle(c.id).opacity;
                    e.currentTarget.style.transform = v === 0 ? `rotate(${rotation})` : `scale(1) rotate(${rotation})`;
                    e.currentTarget.style.zIndex = "1";
                  }}
                >
                  {/* Frame outer */}
                  <div
                    style={{
                      padding: 5, borderRadius: 4,
                      background: frame.gradient,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
                      position: "relative",
                    }}
                  >
                    {/* gold shimmer */}
                    <div style={{
                      position: "absolute", inset: 2, borderRadius: 3, pointerEvents: "none",
                      background: "linear-gradient(135deg, transparent 30%, rgba(255,215,0,0.03) 40%, transparent 50%, rgba(255,215,0,0.02) 60%, transparent 70%)",
                    }} />

                    {/* hanging ring */}
                    <div style={{
                      position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                      width: 10, height: 10, borderRadius: "50%",
                      border: "2px solid #8a7a5a", background: "transparent",
                      boxShadow: "0 0 4px rgba(0,0,0,0.15)", zIndex: 2,
                    }} />
                    <div style={{
                      position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                      width: 1, height: 10, background: "rgba(138,122,90,0.2)", zIndex: 1,
                    }} />

                    {/* Frame inner */}
                    <div style={{
                      background: "#faf5ec", borderRadius: 2, padding: "16px 18px 14px",
                      position: "relative",
                    }}>
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{
                            background: isMe ? goldGradient : "linear-gradient(135deg, #8a7a6a, #6a5a4a)",
                            fontFamily: "'Marcellus SC', serif",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          }}
                        >
                          {c.guest_name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-xs tracking-wider truncate"
                            style={{
                              color: "#2a1a1a",
                              fontFamily: "'Marcellus SC', serif",
                              letterSpacing: "1px",
                              textTransform: "uppercase",
                              fontSize: 11,
                            }}
                          >
                            {c.guest_name}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span style={{ fontSize: 9, color: "#b0a090", fontFamily: "Inter, sans-serif", letterSpacing: "0.5px" }}>
                              {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {c.updated_at !== c.created_at && (
                              <span style={{ fontSize: 9, color: "#b0a090", fontStyle: "italic" }}>· edited</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {canEdit && !isEditing && (
                            <button
                              onClick={() => { setEditingId(c.id); setEditText(c.message); }}
                              className="text-[11px] px-2 py-1 rounded-full border-none cursor-pointer transition-colors"
                              style={{ color: "#8B4A6B", background: "rgba(139,74,107,0.08)", fontSize: 10 }}
                            >
                              Edit · {formatCountdown(left)}
                            </button>
                          )}
                          {(isOwner || isMe) && !isEditing && (
                            <button
                              onClick={() => { if (confirm("Delete this message?")) deleteComment(c.id); }}
                              className="text-[14px] border-none cursor-pointer bg-none"
                              style={{ color: "#8B4A6B", opacity: 0.3 }}
                            >✕</button>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      {sticker ? (
                        <div className="text-center py-2">
                          <div className="text-5xl">{sticker.emoji}</div>
                          <div className="text-sm mt-1" style={{ color: "#6a5a4a", fontFamily: "'Caveat', cursive", fontWeight: 700 }}>
                            {sticker.label}
                          </div>
                        </div>
                      ) : isEditing ? (
                        <div>
                          <div className="flex gap-2 mb-2">
                            <div style={{ position: "relative" }}>
                              <button onClick={() => setShowEmoji(!showEmoji)} style={iconBtn}>😊</button>
                              {showEmoji && (
                                <div style={pickerBox}>
                                  <div className="flex gap-1 mb-2 flex-wrap">
                                    {EMOJI_GROUPS.map((g, i) => (
                                      <button key={i} onClick={() => setEmojiTab(i)}
                                        className="text-xs px-2 py-1 rounded-lg border-none cursor-pointer"
                                        style={{
                                          background: emojiTab === i ? goldGradient : "rgba(200,168,139,0.1)",
                                          color: emojiTab === i ? "#fff" : "rgba(200,184,168,0.5)",
                                        }}>
                                        {g.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {EMOJI_GROUPS[emojiTab].emojis.map((em) => (
                                      <button key={em} onClick={() => insertEmoji(em, true)}
                                        className="text-xl bg-none border-none cursor-pointer p-0.5 rounded leading-none"
                                        style={{ filter: "brightness(1.2)" }}>
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <textarea
                            ref={editRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full border rounded-xl px-4 py-3 text-sm resize-none outline-none font-body"
                            style={{ borderColor: "rgba(200,168,139,0.3)", background: "#fdfbf9", color: "#1a1a1a" }}
                          />
                          <div className="flex gap-3 mt-2 items-center">
                            <button
                              onClick={() => saveEdit(c.id)}
                              className="font-heading text-xs tracking-wider px-4 py-2 rounded-full border-none cursor-pointer text-white"
                              style={{ background: goldGradient }}
                            >Save</button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="font-body text-xs px-4 py-2 rounded-full border-none cursor-pointer"
                              style={{ background: "rgba(180,150,130,0.1)", color: "rgba(100,80,85,0.5)" }}
                            >Cancel</button>
                            <span className="font-body text-xs" style={{ color: "rgba(100,80,85,0.3)" }}>
                              · {formatCountdown(left)} left
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="font-body leading-relaxed"
                          style={{
                            color: "#2a1a1a",
                            fontSize: 15,
                            fontFamily: "'Caveat', cursive",
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {c.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </AnimatedSection>
        ) : (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">💫</span>
            <p className="font-body text-sm" style={{ color: "rgba(100,80,85,0.4)" }}>
              No messages yet — be the first blessing!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
