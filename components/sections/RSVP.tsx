"use client";

import { useState, useEffect, useCallback } from "react";
import { safeGetItem } from "@/lib/storage";
import AnimatedSection from "@/components/ui/AnimatedSection";

type RsvpResponse = "attending" | "not_attending" | "maybe";

interface RsvpData {
  response: RsvpResponse;
  plus_one: boolean;
  plus_one_name: string | null;
  dietary_notes: string | null;
  updated_at: string;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? safeGetItem("session_token") : null;
  return { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) };
}

const OPTIONS: { value: RsvpResponse; label: string; emoji: string; sub: string }[] = [
  { value: "attending",     label: "Wouldn't miss it!",  emoji: "💍", sub: "I'll be there" },
  { value: "maybe",         label: "I'll try my best",   emoji: "🤞", sub: "Hoping to come" },
  { value: "not_attending", label: "Sadly can't make it", emoji: "💌", sub: "With love from afar" },
];

const LABEL: Record<RsvpResponse, string> = {
  attending:     "Wouldn't miss it!",
  maybe:         "Hoping to be there",
  not_attending: "Sadly unable to attend",
};

export default function RSVP({ guestName }: { guestName?: string | null }) {
  const [saved, setSaved] = useState<RsvpData | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [response, setResponse] = useState<RsvpResponse | null>(null);
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rsvp", { headers: authHeaders() });
      if (res.ok) {
        const { rsvp } = await res.json() as { rsvp: RsvpData | null };
        setSaved(rsvp);
        if (rsvp) {
          setResponse(rsvp.response);
          setPlusOne(rsvp.plus_one);
          setPlusOneName(rsvp.plus_one_name ?? "");
          setDietaryNotes(rsvp.dietary_notes ?? "");
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!response || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          response,
          plus_one: plusOne,
          plus_one_name: plusOneName.trim() || null,
          dietary_notes: dietaryNotes.trim() || null,
        }),
      });
      const data = await res.json() as { rsvp?: RsvpData; error?: string };
      if (!res.ok) {
        setError("Something went wrong — please try again.");
        return;
      }
      setSaved(data.rsvp ?? null);
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch {
      setError("Connection error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isAttending = response === "attending" || response === "maybe";
  const showForm = !saved || editing;
  const name = guestName ?? "Friend";

  return (
    <AnimatedSection id="rsvp">
      <section
        id="rsvp"
        style={{
          background: "linear-gradient(180deg, #fdf6ec 0%, #faf0e4 100%)",
          padding: "80px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background ornament */}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(circle at 80% 20%, rgba(212,175,55,0.06) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(90,31,46,0.04) 0%, transparent 55%)",
          }}
        />

        <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: 11, letterSpacing: "0.32em",
              textTransform: "uppercase", color: "#D4AF37",
              marginBottom: 10,
            }}>
              October 8, 2026
            </p>
            <h2 style={{
              fontFamily: "var(--font-script, Georgia, serif)",
              fontSize: "clamp(2rem, 5vw, 2.8rem)",
              fontStyle: "italic", color: "#5a1f2e",
              margin: "0 0 10px", lineHeight: 1.15,
            }}>
              Will you join us?
            </h2>
            <p style={{
              fontFamily: "var(--font-body, Georgia, serif)",
              fontSize: 14, color: "rgba(90,31,46,0.55)", margin: 0,
            }}>
              {saved ? `${name}, your RSVP is recorded` : `Let us know, ${name}`}
            </p>
          </div>

          {/* Saved confirmation card */}
          {saved && !editing && (
            <div
              style={{
                background: "#fffdf9",
                borderRadius: 16,
                border: "1px solid rgba(212,175,55,0.3)",
                boxShadow: "0 4px 28px rgba(90,31,46,0.08)",
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div style={{ height: 3, background: "linear-gradient(90deg, transparent, #D4AF37, transparent)" }} />
              <div style={{ padding: "28px 28px 24px" }}>
                {/* Response */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <span style={{ fontSize: 32 }}>
                    {OPTIONS.find(o => o.value === saved.response)?.emoji}
                  </span>
                  <div>
                    <p style={{
                      fontFamily: "var(--font-heading, Georgia, serif)",
                      fontSize: 16, color: "#5a1f2e", margin: "0 0 2px",
                    }}>
                      {LABEL[saved.response]}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body, Georgia, serif)",
                      fontSize: 12, color: "rgba(90,31,46,0.45)", margin: 0,
                    }}>
                      RSVP · {new Date(saved.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Plus one */}
                {saved.plus_one && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px",
                    background: "rgba(212,175,55,0.07)",
                    borderRadius: 8, marginBottom: 12,
                    fontFamily: "var(--font-body, Georgia, serif)",
                    fontSize: 13, color: "rgba(90,31,46,0.7)",
                  }}>
                    <span>+1</span>
                    <span>{saved.plus_one_name ? `— ${saved.plus_one_name}` : "(name not provided)"}</span>
                  </div>
                )}

                {/* Dietary notes */}
                {saved.dietary_notes && (
                  <div style={{
                    padding: "10px 14px",
                    background: "rgba(168,184,160,0.08)",
                    border: "1px solid rgba(168,184,160,0.25)",
                    borderRadius: 8, marginBottom: 16,
                    fontFamily: "var(--font-body, Georgia, serif)",
                    fontSize: 13, color: "rgba(90,31,46,0.65)",
                  }}>
                    <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(90,31,46,0.4)", display: "block", marginBottom: 3 }}>
                      Notes
                    </span>
                    {saved.dietary_notes}
                  </div>
                )}

                {justSaved && (
                  <p style={{
                    fontFamily: "var(--font-script, Georgia, serif)",
                    fontStyle: "italic", fontSize: 14,
                    color: "#D4AF37", textAlign: "center",
                    margin: "0 0 12px", animation: "rsvp-fade-in 0.5s ease both",
                  }}>
                    ✓ Saved! We&apos;re so happy you&apos;re coming
                  </p>
                )}

                <button
                  onClick={() => setEditing(true)}
                  style={{
                    width: "100%", padding: "10px",
                    border: "1px solid rgba(212,175,55,0.35)",
                    borderRadius: 10, background: "transparent",
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: 11, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: "#5a1f2e",
                    cursor: "pointer",
                  }}
                >
                  Update my RSVP
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {showForm && !loading && (
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  background: "#fffdf9",
                  borderRadius: 16,
                  border: "1px solid rgba(212,175,55,0.25)",
                  boxShadow: "0 4px 28px rgba(90,31,46,0.07)",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: 3, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)" }} />
                <div style={{ padding: "28px 24px" }}>

                  {/* Response options */}
                  <p style={{
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: 10, letterSpacing: "0.24em",
                    textTransform: "uppercase", color: "rgba(90,31,46,0.5)",
                    marginBottom: 14,
                  }}>
                    Your response
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                    {OPTIONS.map((opt) => {
                      const selected = response === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResponse(opt.value)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14,
                            padding: "14px 16px",
                            borderRadius: 12,
                            border: selected
                              ? "2px solid rgba(212,175,55,0.7)"
                              : "1.5px solid rgba(212,175,55,0.2)",
                            background: selected
                              ? "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(90,31,46,0.05))"
                              : "rgba(253,246,236,0.5)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.emoji}</span>
                          <div>
                            <p style={{
                              fontFamily: "var(--font-heading, Georgia, serif)",
                              fontSize: 14, color: "#5a1f2e", margin: "0 0 1px",
                            }}>
                              {opt.label}
                            </p>
                            <p style={{
                              fontFamily: "var(--font-body, Georgia, serif)",
                              fontSize: 11, color: "rgba(90,31,46,0.45)", margin: 0,
                            }}>
                              {opt.sub}
                            </p>
                          </div>
                          {selected && (
                            <span style={{
                              marginLeft: "auto", fontSize: 14,
                              color: "#D4AF37", flexShrink: 0,
                            }}>
                              ✦
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* +1 option — only if attending */}
                  {isAttending && (
                    <div
                      style={{
                        borderTop: "1px solid rgba(212,175,55,0.15)",
                        paddingTop: 20, marginBottom: 20,
                        animation: "rsvp-slide-in 0.3s ease both",
                      }}
                    >
                      <label style={{
                        display: "flex", alignItems: "center", gap: 12,
                        cursor: "pointer", marginBottom: plusOne ? 14 : 0,
                      }}>
                        <span
                          onClick={() => setPlusOne(v => !v)}
                          style={{
                            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                            border: plusOne ? "2px solid #D4AF37" : "2px solid rgba(212,175,55,0.4)",
                            background: plusOne ? "rgba(212,175,55,0.15)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s ease", cursor: "pointer",
                            fontSize: 11, color: "#D4AF37",
                          }}
                        >
                          {plusOne && "✓"}
                        </span>
                        <div>
                          <p style={{
                            fontFamily: "var(--font-heading, Georgia, serif)",
                            fontSize: 13, color: "#5a1f2e", margin: "0 0 1px",
                          }}>
                            Bringing a +1?
                          </p>
                          <p style={{
                            fontFamily: "var(--font-body, Georgia, serif)",
                            fontSize: 11, color: "rgba(90,31,46,0.45)", margin: 0,
                          }}>
                            We&apos;d love to know who&apos;s coming with you
                          </p>
                        </div>
                      </label>

                      {plusOne && (
                        <input
                          type="text"
                          value={plusOneName}
                          onChange={e => setPlusOneName(e.target.value)}
                          placeholder="Companion's name (optional)"
                          style={{
                            width: "100%", padding: "10px 14px",
                            borderRadius: 8, border: "1px solid rgba(212,175,55,0.3)",
                            background: "rgba(253,246,236,0.7)",
                            fontFamily: "var(--font-body, Georgia, serif)",
                            fontSize: 13, color: "#5a1f2e",
                            outline: "none", boxSizing: "border-box",
                            animation: "rsvp-slide-in 0.25s ease both",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Dietary notes */}
                  {isAttending && (
                    <div style={{ marginBottom: 22 }}>
                      <label style={{
                        fontFamily: "var(--font-heading, Georgia, serif)",
                        fontSize: 10, letterSpacing: "0.22em",
                        textTransform: "uppercase", color: "rgba(90,31,46,0.5)",
                        display: "block", marginBottom: 8,
                      }}>
                        Dietary notes <span style={{ opacity: 0.5 }}>(optional)</span>
                      </label>
                      <textarea
                        value={dietaryNotes}
                        onChange={e => setDietaryNotes(e.target.value)}
                        placeholder="Any allergies or preferences we should know?"
                        rows={2}
                        maxLength={200}
                        style={{
                          width: "100%", padding: "10px 14px",
                          borderRadius: 8, border: "1px solid rgba(212,175,55,0.25)",
                          background: "rgba(253,246,236,0.7)",
                          fontFamily: "var(--font-body, Georgia, serif)",
                          fontSize: 13, color: "#5a1f2e",
                          outline: "none", resize: "none",
                          boxSizing: "border-box", lineHeight: 1.5,
                        }}
                      />
                    </div>
                  )}

                  {error && (
                    <p style={{
                      fontFamily: "var(--font-body, Georgia, serif)",
                      fontSize: 13, color: "#c0392b",
                      textAlign: "center", marginBottom: 14,
                    }}>
                      {error}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => { setEditing(false); setError(null); }}
                        style={{
                          flex: 1, padding: "13px",
                          border: "1px solid rgba(212,175,55,0.3)",
                          borderRadius: 10, background: "transparent",
                          fontFamily: "var(--font-heading, Georgia, serif)",
                          fontSize: 11, letterSpacing: "0.16em",
                          textTransform: "uppercase", color: "rgba(90,31,46,0.5)",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!response || submitting}
                      style={{
                        flex: 2, padding: "13px",
                        border: "none", borderRadius: 10,
                        background: response
                          ? "linear-gradient(135deg, #5a1f2e 0%, #8B4A6B 100%)"
                          : "rgba(90,31,46,0.15)",
                        color: response ? "#fef9f0" : "rgba(90,31,46,0.35)",
                        fontFamily: "var(--font-heading, Georgia, serif)",
                        fontSize: 11, letterSpacing: "0.22em",
                        textTransform: "uppercase", cursor: response ? "pointer" : "default",
                        boxShadow: response ? "0 4px 18px rgba(90,31,46,0.25)" : "none",
                        transition: "all 0.25s ease",
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? "Saving…" : (editing ? "Update RSVP" : "Send my RSVP")}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{
                fontFamily: "var(--font-script, Georgia, serif)",
                fontStyle: "italic", fontSize: 14,
                color: "rgba(90,31,46,0.35)",
              }}>
                Loading…
              </p>
            </div>
          )}
        </div>

        <style>{`
          @keyframes rsvp-fade-in {
            from { opacity: 0; transform: translateY(-4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes rsvp-slide-in {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </section>
    </AnimatedSection>
  );
}
