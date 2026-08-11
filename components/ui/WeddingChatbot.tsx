"use client";

import { useEffect, useRef, useState } from "react";
import { safeGetItem } from "@/lib/storage";

const ROSE = "#5a1f2e";
const GOLD = "#D4AF37";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;

interface FaqPair { q: string; a: string; }

const DEFAULT_FAQ: FaqPair[] = [
  { q: "Where's the venue?", a: "The ceremony is at St Andrews Kirk and the reception at BKN Auditorium, both in Chennai. See the Venue section on this page for directions." },
  { q: "What time should I arrive?", a: "The ceremony at St Andrews Kirk starts at 4:30 PM and the reception at BKN Auditorium at 7:00 PM." },
  { q: "What's the dress code?", a: "Nothing too strict — smart/semi-formal is perfect. Come ready to celebrate! 🎉" },
  { q: "Can't attend — how do I watch?", a: "Both the ceremony and reception will be streamed live right here on this page on October 8th — just come back and scroll down!" },
];

type Msg = { role: "user" | "bot"; text: string };

interface Props { enabled: boolean; }

export default function WeddingChatbot({ enabled }: Props) {
  const [open, setOpen] = useState(false);
  const [faq, setFaq] = useState<FaqPair[]>(DEFAULT_FAQ);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((s: Record<string, string>) => {
        if (!s.chatbot_faq) return;
        try {
          const parsed = JSON.parse(s.chatbot_faq);
          if (Array.isArray(parsed) && parsed.length) setFaq(parsed);
        } catch { /* keep defaults on bad JSON */ }
      })
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function ask(question: string) {
    if (!question.trim() || sending) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setSending(true);
    try {
      const token = safeGetItem("session_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["x-session-token"] = token;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      const answer = data.answer ?? "Sorry, I couldn't answer that right now — please try again.";
      setMessages((m) => [...m, { role: "bot", text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I couldn't answer that right now — please try again." }]);
    } finally {
      setSending(false);
    }
  }

  function askCanned(pair: FaqPair) {
    setMessages((m) => [...m, { role: "user", text: pair.q }, { role: "bot", text: pair.a }]);
  }

  if (!enabled) return null;

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed", bottom: 154, right: 20, zIndex: 9997,
            width: "min(320px, calc(100vw - 40px))",
            maxHeight: "min(440px, calc(100vh - 200px))",
            display: "flex", flexDirection: "column",
            background: "#fffdf9",
            borderRadius: 18,
            boxShadow: "0 20px 60px rgba(90,31,46,0.28)",
            border: `1px solid ${GA(0.25)}`,
            overflow: "hidden",
            animation: "chat-in 0.25s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <div style={{ padding: "12px 16px", background: `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`, color: "#fef9f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: 13, letterSpacing: "0.04em" }}>💐 Wedding FAQ</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 16, cursor: "pointer" }} aria-label="Close chat">×</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: RA(0.5), fontStyle: "italic", textAlign: "center", margin: "8px 0" }}>
                Ask a question, or tap a quick option below 👇
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.role === "user" ? RA(0.9) : "rgba(212,175,55,0.1)",
                color: m.role === "user" ? "#fef9f0" : ROSE,
                padding: "8px 12px", borderRadius: 12,
                fontFamily: "Georgia, serif", fontSize: 13, lineHeight: 1.5,
              }}>
                {m.text}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", fontSize: 12, color: RA(0.4), fontStyle: "italic" }}>Typing…</div>
            )}
          </div>

          <div style={{ padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 6, borderTop: `1px solid ${GA(0.12)}` }}>
            {faq.slice(0, 4).map((pair) => (
              <button
                key={pair.q}
                onClick={() => askCanned(pair)}
                style={{
                  padding: "5px 10px", borderRadius: 99, border: `1px solid ${GA(0.35)}`,
                  background: "transparent", color: ROSE, fontSize: 11,
                  fontFamily: "Georgia, serif", cursor: "pointer",
                }}
              >
                {pair.q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: `1px solid ${GA(0.12)}` }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question…"
              maxLength={300}
              disabled={sending}
              style={{ flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: 10, border: `1px solid ${GA(0.3)}`, fontSize: 13, fontFamily: "Georgia, serif", outline: "none" }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                padding: "8px 14px", borderRadius: 10, border: "none",
                background: ROSE, color: "#fef9f0", fontSize: 12, fontWeight: 600,
                cursor: "pointer", opacity: sending || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        title="Wedding FAQ chat"
        style={{
          position: "fixed", bottom: 90, right: 20, zIndex: 9996,
          width: 48, height: 48, borderRadius: "50%",
          background: open ? "rgba(12,5,3,0.85)" : `linear-gradient(135deg, ${ROSE} 0%, #8B4A6B 100%)`,
          border: `1px solid ${GA(0.3)}`,
          color: "#fef9f0", fontSize: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 6px 24px rgba(90,31,46,0.3)",
        }}
      >
        {open ? "×" : "💬"}
      </button>

      <style>{`
        @keyframes chat-in { from { opacity:0; transform: translateY(12px) scale(0.96); } to { opacity:1; transform: translateY(0) scale(1); } }
      `}</style>
    </>
  );
}
