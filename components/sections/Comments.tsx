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
  guestName: string | null;
  guestId?: string | null;
  isOwner?: boolean;
}

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

  const load = useCallback(async () => {
    const res = await fetch("/api/comments");
    if (res.ok) setComments(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `[sticker:${sticker.id}]` }),
    });
    setPosting(false);
    if (res.ok) { await load(); }
    else {
      const d = await res.json();
      if (d.error === "blocked") setError("You are temporarily blocked from commenting.");
      else setError("Something went wrong.");
    }
  }

  async function post() {
    if (!message.trim() || posting || !guestName) return;
    setPosting(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setPosting(false);
    if (res.ok) { setMessage(""); await load(); }
    else {
      const d = await res.json();
      if (d.error === "flagged") setError("Your message was flagged for review. You've been temporarily blocked from commenting pending review.");
      else if (d.error === "blocked") setError("You are temporarily blocked from commenting. Please contact James & Sharon.");
      else setError("Something went wrong. Please try again.");
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, message: editText }),
    });
    if (res.ok) { setEditingId(null); await load(); }
    else {
      const d = await res.json();
      if (d.error === "edit_expired") setError("Edit window has closed.");
      else if (d.error === "flagged") setError("Edit flagged for review.");
      else setError("Failed to save.");
    }
  }

  async function deleteComment(id: string) {
    await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const iconBtn: React.CSSProperties = {
    fontSize: 20, background: "#f5f0fb", border: "none", borderRadius: 8,
    width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };

  const pickerBox: React.CSSProperties = {
    position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: "#fff",
    border: "1px solid #e8d8f0", borderRadius: 14, padding: 12, width: 280,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100,
  };

  return (
    <section style={{ padding: "80px 24px", background: "#faf8f5", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", color: "#1a1a1a", marginBottom: 8, fontWeight: 400 }}>
          Wishes & Messages
        </h2>
        <p style={{ textAlign: "center", color: "#888", fontSize: 14, marginBottom: 40 }}>
          Leave a message for James & Sharon ✨
        </p>

        {guestName ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#8B4A6B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {guestName[0].toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, color: "#1a1a1a", fontSize: 14 }}>{guestName}</span>
            </div>
            <textarea
              ref={textRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
              placeholder="Share your wishes… (Enter to send)"
              rows={3}
              style={{ width: "100%", border: "1px solid #e8e0d8", borderRadius: 10, padding: "10px 14px", fontSize: 15, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#1a1a1a", background: "#fdfbf9" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }} style={iconBtn}>😊</button>
                {showEmoji && (
                  <div style={pickerBox}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                      {EMOJI_GROUPS.map((g, i) => (
                        <button key={i} onClick={() => setEmojiTab(i)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, border: "none", background: emojiTab === i ? "#8B4A6B" : "#f0e8f0", color: emojiTab === i ? "#fff" : "#555", cursor: "pointer" }}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {EMOJI_GROUPS[emojiTab].emojis.map((em) => (
                        <button key={em} onClick={() => insertEmoji(em)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 6, lineHeight: 1 }}>{em}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <button onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); }} style={iconBtn}>🎁</button>
                {showStickers && (
                  <div style={{ ...pickerBox, width: 260 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888" }}>Tap a sticker to send</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                      {STICKERS.map((s) => (
                        <button key={s.id} onClick={() => sendSticker(s)} style={{ background: "#fdf6ff", border: "1px solid #e8d8f0", borderRadius: 10, padding: "8px 4px", cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span style={{ fontSize: 26 }}>{s.emoji}</span>
                          <span style={{ fontSize: 9, color: "#888" }}>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }} />
              <button
                onClick={post}
                disabled={posting || !message.trim()}
                style={{ padding: "8px 20px", background: message.trim() ? "#8B4A6B" : "#ddd", color: "#fff", border: "none", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: message.trim() ? "pointer" : "default", transition: "background 0.2s" }}
              >
                {posting ? "Sending…" : "Send ✉️"}
              </button>
            </div>
            {error && <p style={{ marginTop: 10, color: "#c0392b", fontSize: 13 }}>{error}</p>}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, marginBottom: 32 }}>
            Register to leave a message 💌
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {comments.map((c) => {
            const isMe = guestId ? c.guest_id === guestId : false;
            const left = isMe ? timeLeft(c.created_at) : 0;
            const canEdit = isMe && left > 0;
            const sticker = isSticker(c.message) ? stickerData(c.message) : null;

            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#8B4A6B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {c.guest_name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#1a1a1a" }}>{c.guest_name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#bbb" }}>{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    {c.updated_at !== c.created_at && <span style={{ marginLeft: 6, fontSize: 10, color: "#ccc" }}>edited</span>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {canEdit && editingId !== c.id && (
                      <button onClick={() => { setEditingId(c.id); setEditText(c.message); }} style={{ fontSize: 11, color: "#8B4A6B", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>
                        Edit · {formatCountdown(left)}
                      </button>
                    )}
                    {(isOwner || isMe) && editingId !== c.id && (
                      <button onClick={() => { if (confirm("Delete this message?")) deleteComment(c.id); }} style={{ fontSize: 11, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>✕</button>
                    )}
                  </div>
                </div>

                {sticker ? (
                  <div style={{ textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: 56 }}>{sticker.emoji}</div>
                    <div style={{ fontSize: 12, color: "#8B4A6B", fontWeight: 600, marginTop: 4 }}>{sticker.label}</div>
                  </div>
                ) : editingId === c.id ? (
                  <div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <div style={{ position: "relative" }}>
                        <button onClick={() => setShowEmoji(!showEmoji)} style={iconBtn}>😊</button>
                        {showEmoji && (
                          <div style={pickerBox}>
                            <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                              {EMOJI_GROUPS.map((g, i) => (
                                <button key={i} onClick={() => setEmojiTab(i)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, border: "none", background: emojiTab === i ? "#8B4A6B" : "#f0e8f0", color: emojiTab === i ? "#fff" : "#555", cursor: "pointer" }}>
                                  {g.label}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {EMOJI_GROUPS[emojiTab].emojis.map((em) => (
                                <button key={em} onClick={() => insertEmoji(em, true)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 6, lineHeight: 1 }}>{em}</button>
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
                      style={{ width: "100%", border: "1px solid #c084a0", borderRadius: 8, padding: "8px 12px", fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => saveEdit(c.id)} style={{ padding: "6px 16px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "6px 16px", background: "#f0e8f0", color: "#888", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                      <span style={{ fontSize: 12, color: "#aaa", lineHeight: "30px" }}>· {formatCountdown(left)} left</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 15, color: "#333", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.message}</p>
                )}
              </div>
            );
          })}
          {comments.length === 0 && (
            <p style={{ textAlign: "center", color: "#ccc", fontSize: 14, padding: 32 }}>Be the first to leave a wish! 💌</p>
          )}
        </div>
      </div>
    </section>
  );
}
