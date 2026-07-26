"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Comment {
  id: string;
  guest_id: string;
  guest_name: string;
  message: string;
  created_at: string;
  updated_at: string;
}

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

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("session_token") : null;
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

// ─── Decorative divider ──────────────────────────────────────────
function DecorativeDivider() {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <span className="h-px w-12 bg-gradient-to-r from-transparent via-sage/30 to-transparent" />
      <span className="text-2xl text-sage/60" aria-hidden>🌿</span>
      <span className="h-px w-12 bg-gradient-to-r from-transparent via-sage/30 to-transparent" />
    </div>
  );
}

// ─── Stagger animation on mount ──────────────────────────────────
function useStagger(delay = 60) {
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const addId = useCallback((id: string) => {
    setVisible((prev) => { if (prev.has(id)) return prev; const n = new Set(prev); n.add(id); return n; });
  }, []);
  const style = useCallback((id: string): React.CSSProperties => ({
    opacity: visible.has(id) ? 1 : 0,
    transform: visible.has(id) ? "translateY(0) rotate(0deg)" : "translateY(16px) rotate(-0.5deg)",
    transition: `opacity 0.45s ease, transform 0.5s ease`,
  }), [visible]);

  const enter = useCallback((id: string, i: number) => {
    setTimeout(() => addId(id), i * delay);
  }, [addId, delay]);

  return { enter, style };
}

// ─── Guest Book Card ─────────────────────────────────────────────
const CARD_ROTATIONS = ["-0.3deg", "0.2deg", "-0.1deg", "0.4deg", "-0.2deg", "0.1deg"];

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
  const textRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const { enter: enterStagger, style: staggerStyle } = useStagger(70);

  const load = useCallback(async () => {
    const res = await fetch("/api/comments");
    if (res.ok) setComments(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Stagger animation on new comments
  useEffect(() => {
    comments.forEach((c, i) => enterStagger(c.id, i));
  }, [comments, enterStagger]);

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
    if (res.ok) { await load(); }
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
    if (res.ok) { setMessage(""); await load(); }
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

  // Share your message UI when not logged in
  const NotLoggedInPrompt = () => (
    <div className="text-center py-12 px-6 bg-white/60 rounded-2xl border border-dashed border-champagne/60">
      <span className="text-4xl block mb-3">💌</span>
      <p className="font-body text-deep-rose/50 text-sm mb-1">Want to leave a message?</p>
      <p className="font-body text-deep-rose/40 text-xs">
        Register your name on the home page to share your wishes.
      </p>
    </div>
  );

  const iconBtn: React.CSSProperties = {
    fontSize: 20, background: "#faf5f0", border: "none", borderRadius: 8,
    width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };

  const pickerBox: React.CSSProperties = {
    position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#fff",
    border: "1px solid #e8ddd4", borderRadius: 14, padding: 12, width: 280,
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)", zIndex: 100,
  };

  return (
    <section id="wall-of-love" className="py-24 px-6" style={{ background: "linear-gradient(180deg, #faf8f5 0%, #f5f0eb 100%)" }}>
      <div className="max-w-2xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="font-heading text-3xl md:text-4xl text-deep-rose mb-2">
            Wall of Love
          </h2>
          <DecorativeDivider />
          <p className="font-script italic text-sage text-lg">
            Leave your blessings for James &amp; Sharon 💛
          </p>
        </div>

        {/* Write message area */}
        {guestName ? (
          <div
            className="bg-white rounded-2xl p-6 mb-10"
            style={{
              boxShadow: "0 2px 16px rgba(139,74,107,0.06), 0 1px 4px rgba(0,0,0,0.04)",
              transform: "rotate(-0.1deg)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #8B4A6B, #b56576)" }}
              >
                {guestName![0].toUpperCase()}
              </div>
              <span className="font-heading text-deep-rose text-sm tracking-wider">{guestName}</span>
            </div>
            <textarea
              ref={textRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
              placeholder="Write a sweet message… (Enter to send)"
              rows={3}
              className="w-full border rounded-xl px-4 py-3 text-sm resize-none outline-none font-body transition-colors"
              style={{ borderColor: "#e8ddd4", color: "#1a1a1a", background: "#fdfbf9" }}
            />
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }} style={iconBtn}>😊</button>
                {showEmoji && (
                  <div style={pickerBox}>
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {EMOJI_GROUPS.map((g, i) => (
                        <button key={i} onClick={() => setEmojiTab(i)} className="text-xs px-2 py-1 rounded-lg border-none cursor-pointer transition-colors" style={{ background: emojiTab === i ? "#8B4A6B" : "#f5efe8", color: emojiTab === i ? "#fff" : "#666" }}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_GROUPS[emojiTab].emojis.map((em) => (
                        <button key={em} onClick={() => insertEmoji(em)} className="text-xl bg-none border-none cursor-pointer p-0.5 rounded leading-none">{em}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); }} style={iconBtn}>🎁</button>
                {showStickers && (
                  <div style={{ ...pickerBox, width: 260 }}>
                    <p className="text-[11px] text-deep-rose/50 mb-2 font-body">Tap a sticker to send</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {STICKERS.map((s) => (
                        <button key={s.id} onClick={() => sendSticker(s)} className="bg-[#fdf6ff] border border-[#e8d8f0] rounded-xl p-2 cursor-pointer text-center flex flex-col items-center gap-0.5 hover:border-blush transition-colors">
                          <span className="text-2xl">{s.emoji}</span>
                          <span className="text-[9px] text-deep-rose/60">{s.label}</span>
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
                  background: message.trim() ? "linear-gradient(135deg, #8B4A6B, #b56576)" : "#ddd",
                  color: "#fff",
                  opacity: posting ? 0.7 : 1,
                }}
              >
                {posting ? "Sending…" : "Send 💌"}
              </button>
            </div>
            {error && <p className="mt-2 text-[13px]" style={{ color: "#c0392b" }}>{error}</p>}
          </div>
        ) : (
          <div className="mb-10">
            <NotLoggedInPrompt />
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-5">
          {comments.map((c, idx) => {
            const isMe = guestId ? c.guest_id === guestId : false;
            const left = isMe ? timeLeft(c.created_at) : 0;
            const canEdit = isMe && left > 0;
            const sticker = isSticker(c.message) ? stickerData(c.message) : null;
            const rotation = CARD_ROTATIONS[idx % CARD_ROTATIONS.length];

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl p-5 transition-shadow hover:shadow-md"
                style={{
                  ...staggerStyle(c.id),
                  boxShadow: "0 1px 6px rgba(139,74,107,0.05), 0 1px 3px rgba(0,0,0,0.03)",
                  transform: sticker?.id ? staggerStyle(c.id).transform : `${staggerStyle(c.id).transform} rotate(${rotation})`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: isMe ? "linear-gradient(135deg, #8B4A6B, #b56576)" : "linear-gradient(135deg, #a8b8a0, #8a9e80)" }}
                  >
                    {c.guest_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-heading text-sm text-deep-rose">{c.guest_name}</span>
                    <div className="flex items-center gap-2 text-[11px] text-deep-rose/40">
                      <span>{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {c.updated_at !== c.created_at && <span className="italic">· edited</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEdit && editingId !== c.id && (
                      <button onClick={() => { setEditingId(c.id); setEditText(c.message); }} className="text-[11px] px-2 py-1 rounded-full border-none cursor-pointer transition-colors" style={{ color: "#8B4A6B", background: "rgba(139,74,107,0.08)" }}>
                        Edit · {formatCountdown(left)}
                      </button>
                    )}
                    {(isOwner || isMe) && editingId !== c.id && (
                      <button onClick={() => { if (confirm("Delete this message?")) deleteComment(c.id); }} className="text-[14px] opacity-30 hover:opacity-60 border-none cursor-pointer bg-none" style={{ color: "#8B4A6B" }}>✕</button>
                    )}
                  </div>
                </div>

                {sticker ? (
                  <div className="text-center py-2">
                    <div className="text-5xl">{sticker.emoji}</div>
                    <div className="text-sm font-heading text-sage mt-1">{sticker.label}</div>
                  </div>
                ) : editingId === c.id ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <div style={{ position: "relative" }}>
                        <button onClick={() => setShowEmoji(!showEmoji)} style={iconBtn}>😊</button>
                        {showEmoji && (
                          <div style={pickerBox}>
                            <div className="flex gap-1 mb-2 flex-wrap">
                              {EMOJI_GROUPS.map((g, i) => (
                                <button key={i} onClick={() => setEmojiTab(i)} className="text-xs px-2 py-1 rounded-lg border-none cursor-pointer" style={{ background: emojiTab === i ? "#8B4A6B" : "#f5efe8", color: emojiTab === i ? "#fff" : "#666" }}>
                                  {g.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {EMOJI_GROUPS[emojiTab].emojis.map((em) => (
                                <button key={em} onClick={() => insertEmoji(em, true)} className="text-xl bg-none border-none cursor-pointer p-0.5 rounded leading-none">{em}</button>
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
                      style={{ borderColor: "#c084a0", background: "#fdfbf9" }}
                    />
                    <div className="flex gap-3 mt-2 items-center">
                      <button onClick={() => saveEdit(c.id)} className="font-heading text-xs tracking-wider px-4 py-2 rounded-full border-none cursor-pointer text-white" style={{ background: "linear-gradient(135deg, #8B4A6B, #b56576)" }}>Save</button>
                      <button onClick={() => setEditingId(null)} className="font-body text-xs px-4 py-2 rounded-full border-none cursor-pointer" style={{ background: "#f0e8e0", color: "#888" }}>Cancel</button>
                      <span className="font-body text-xs" style={{ color: "#aaa" }}>· {formatCountdown(left)} left</span>
                    </div>
                  </div>
                ) : (
                  <p className="font-body text-[15px] leading-relaxed" style={{ color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.message}</p>
                )}
              </div>
            );
          })}
          {comments.length === 0 && (
            <div className="text-center py-16">
              <span className="text-5xl block mb-4">💫</span>
              <p className="font-body text-deep-rose/40 text-sm">No messages yet — be the first blessing!</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
