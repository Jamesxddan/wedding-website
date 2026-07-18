"use client";

import { useState, useEffect } from "react";
import { buildGoogleCalendarUrl, buildIcsDataUrl } from "@/lib/calendar";
import PetalScene from "@/components/webgl/PetalScene";
import { useSiteContent } from "@/lib/SiteContentContext";
import { useSelectPhotos } from "@/lib/useSelectPhotos";

interface Props {
  guestName: string;
  onExplore: () => void;
}

type Stage = "sealed" | "opening" | "card";

const GOLD = "#D4AF37";
const ROSE = "#5a1f2e";
const GA = (a: number) => `rgba(212,175,55,${a})`;
const RA = (a: number) => `rgba(90,31,46,${a})`;

export default function InvitationCard({ guestName, onExplore }: Props) {
  const [stage, setStage] = useState<Stage>("sealed");
  const [ready, setReady] = useState(false);
  const { invitation } = useSiteContent();
  const photos = useSelectPhotos();
  const couplePhoto = photos.byName("main", "10.JPG");

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  function tap() {
    if (stage !== "sealed") return;
    setStage("opening");
    setTimeout(() => setStage("card"), 950);
  }

  function handleExplore() {
    localStorage.setItem("invitation_seen", "true");
    onExplore();
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #fdf6ec 0%, #f5e8d8 60%, #f0ddd0 100%)" }}
    >
      {/* Aurora blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 520, height: 320, top: "5%", left: "-10%", background: "radial-gradient(ellipse,rgba(244,194,194,0.45) 0%,transparent 70%)", filter: "blur(60px)", animation: "aurora-1 12s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ width: 400, height: 260, top: "20%", right: "-8%", background: "radial-gradient(ellipse,rgba(139,94,131,0.3) 0%,transparent 70%)", filter: "blur(55px)", animation: "aurora-2 16s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ width: 460, height: 200, bottom: "10%", left: "20%", background: "radial-gradient(ellipse,rgba(196,165,130,0.35) 0%,transparent 70%)", filter: "blur(50px)", animation: "aurora-3 14s ease-in-out infinite" }} />
      </div>

      <PetalScene />

      {/* ── ENVELOPE ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: stage === "card" ? "none" : "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          opacity: ready ? 1 : 0,
          transform: ready ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.85s ease, transform 0.85s ease",
          zIndex: 10,
        }}
      >
        <p style={{
          fontFamily: "Georgia, serif", fontStyle: "italic",
          fontSize: 13, color: RA(0.45), letterSpacing: "1px",
          animation: "fade-in 0.6s ease 1.1s both",
        }}>
          You have a letter
        </p>

        {/* Perspective wrapper for 3-D flap */}
        <div style={{ perspective: "900px", perspectiveOrigin: "50% 0%" }} onClick={tap}>
          <div style={{
            position: "relative",
            width: "min(340px, calc(100vw - 40px))",
            aspectRatio: "1.62 / 1",
            cursor: stage === "sealed" ? "pointer" : "default",
          }}>

            {/* Body */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 1,
              background: "linear-gradient(160deg, #fefaf3 0%, #f8f0e3 100%)",
              border: `1.5px solid ${GA(0.5)}`,
              borderRadius: 6,
              boxShadow: `0 22px 65px rgba(0,0,0,0.14), 0 4px 20px rgba(0,0,0,0.07), 0 0 0 1px ${GA(0.15)}`,
              overflow: "hidden",
            }}>
              {/* X fold lines */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `
                  linear-gradient(135deg, transparent 49.3%, ${GA(0.12)} 49.3%, ${GA(0.12)} 50.7%, transparent 50.7%),
                  linear-gradient(-135deg, transparent 49.3%, ${GA(0.12)} 49.3%, ${GA(0.12)} 50.7%, transparent 50.7%)
                `,
              }} />

              {/* Addressing */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                paddingTop: "8%",
              }}>
                <p style={{
                  fontFamily: "Georgia, serif", fontStyle: "italic",
                  fontSize: 9, letterSpacing: "3px", textTransform: "uppercase",
                  color: RA(0.38), marginBottom: 8,
                }}>
                  Kindly delivered to
                </p>
                <p style={{
                  fontFamily: "'Times New Roman', Georgia, serif", fontStyle: "italic",
                  fontSize: 22, color: ROSE, lineHeight: 1.2,
                }}>
                  {guestName}
                </p>
              </div>

              {/* Wax seal */}
              <div style={{
                position: "absolute",
                bottom: "13%", left: "50%",
                width: 54, height: 54, borderRadius: "50%",
                background: "radial-gradient(circle at 36% 32%, #f2d458 0%, #c89010 46%, #8a6000 100%)",
                boxShadow: `0 0 0 2.5px ${GA(0.3)}, 0 5px 18px rgba(184,134,11,0.5), inset 0 1px 3px rgba(255,255,255,0.25)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: stage === "opening" ? 0 : 1,
                transform: stage === "opening"
                  ? "translateX(-50%) scale(1.25)"
                  : "translateX(-50%) scale(1)",
                transition: "opacity 0.22s ease, transform 0.22s ease",
                zIndex: 3,
              }}>
                <span style={{
                  fontFamily: "Georgia, serif", fontStyle: "italic",
                  fontSize: 10, color: "#fff8e0", fontWeight: "bold",
                  letterSpacing: "1px",
                  textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                }}>J & S</span>
              </div>
            </div>

            {/* Flap — triangle pointing down, rotates back on open */}
            <div style={{
              position: "absolute",
              top: 0, left: -1, right: -1,
              height: "56%",
              clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
              background: "linear-gradient(165deg, #fef2d8 0%, #e8d090 60%, #d4b870 100%)",
              border: `1.5px solid ${GA(0.5)}`,
              transformOrigin: "50% 0%",
              transform: stage !== "sealed" ? "rotateX(-180deg)" : "rotateX(0deg)",
              transition: "transform 0.88s cubic-bezier(0.4,0,0.2,1)",
              backfaceVisibility: "hidden",
              zIndex: 2,
              boxShadow: "0 6px 14px rgba(0,0,0,0.07)",
            }} />

          </div>
        </div>

        {stage === "sealed" && ready && (
          <p style={{
            fontFamily: "Georgia, serif", fontStyle: "italic",
            fontSize: 11, color: RA(0.38),
            animation: "fade-up 0.5s ease 1.9s both",
          }}>
            tap to open ✦
          </p>
        )}
      </div>

      {/* ── INVITATION CARD ────────────────────────────────────────────────────── */}
      {stage === "card" && (
        <div style={{
          position: "relative", zIndex: 20,
          width: "min(360px, calc(100vw - 24px))",
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto",
          borderRadius: 14,
          background: "#fffdf9",
          boxShadow: `0 32px 100px rgba(0,0,0,0.2), 0 0 0 1px ${GA(0.2)}`,
          animation: "card-rise 0.88s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {/* Hero photo */}
          {couplePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={couplePhoto.heroUrl}
              alt="James & Sharon"
              style={{
                width: "100%", height: 270,
                objectFit: "cover", objectPosition: "50% 40%",
                display: "block", borderRadius: "14px 14px 0 0",
              }}
            />
          ) : (
            <div style={{
              height: 200, borderRadius: "14px 14px 0 0",
              background: `linear-gradient(135deg, ${GA(0.2)}, ${RA(0.1)})`,
            }} />
          )}

          {/* Gold accent bar */}
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

          <div style={{ padding: "24px 22px 22px", textAlign: "center" }}>

            <p style={{
              fontFamily: "Georgia, serif", fontStyle: "italic",
              fontSize: 13, color: RA(0.55), marginBottom: 14,
              animation: "blur-reveal 0.9s ease 0.05s both",
            }}>
              Dear {guestName},
            </p>

            <p style={{
              fontFamily: "Georgia, serif", fontSize: 13,
              color: RA(0.75), lineHeight: 1.7, marginBottom: 16,
              animation: "blur-reveal 0.9s ease 0.2s both",
            }}>
              {invitation.body}
            </p>

            <div style={{ animation: "blur-reveal 1s ease 0.35s both", marginBottom: 12 }}>
              <h1 style={{
                fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic",
                fontSize: 30, lineHeight: 1.2, color: ROSE, margin: 0,
              }}>
                {invitation.couple_name}
              </h1>
              <p style={{
                fontFamily: "Georgia, serif", fontStyle: "italic",
                fontSize: 13, color: RA(0.5), marginTop: 6,
              }}>
                &ldquo;{invitation.quote}&rdquo;
              </p>
            </div>

            <div style={{ height: 1, margin: "14px 0", background: `linear-gradient(90deg, transparent, ${GA(0.5)}, transparent)` }} />

            <div style={{ animation: "blur-reveal 0.9s ease 0.5s both", marginBottom: 14 }}>
              <p style={{
                fontFamily: "Georgia, serif",
                fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase",
                color: ROSE, marginBottom: 5,
              }}>
                {invitation.date}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: RA(0.6), marginBottom: 2 }}>
                {invitation.ceremony_line}
              </p>
              <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 12, color: RA(0.6) }}>
                {invitation.reception_line}
              </p>
            </div>

            <p style={{
              fontFamily: "Georgia, serif", fontSize: 12,
              color: RA(0.7), marginBottom: 16,
              animation: "blur-reveal 0.9s ease 0.65s both",
            }}>
              {invitation.presence_line}
            </p>

            <div style={{ animation: "blur-reveal 0.9s ease 0.8s both", marginBottom: 16 }}>
              <p style={{
                fontFamily: "Georgia, serif",
                fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase",
                color: RA(0.35), marginBottom: 10,
              }}>
                Save the date
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                <a
                  href={buildGoogleCalendarUrl(guestName)}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "8px 14px", borderRadius: 99,
                    border: `1px solid ${ROSE}`, color: ROSE,
                    fontSize: 11, textDecoration: "none",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Google Calendar
                </a>
                <a
                  href={buildIcsDataUrl(guestName)}
                  download="james-sharon-wedding.ics"
                  style={{
                    padding: "8px 14px", borderRadius: 99,
                    border: `1px solid ${ROSE}`, color: ROSE,
                    fontSize: 11, textDecoration: "none",
                    fontFamily: "Georgia, serif",
                  }}
                >
                  Apple / Windows
                </a>
              </div>
            </div>

            <button
              onClick={handleExplore}
              style={{
                width: "100%", padding: "14px",
                background: ROSE, color: "#fef9f0",
                border: "none", borderRadius: 10,
                fontFamily: "Georgia, serif",
                fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: `0 4px 20px ${RA(0.3)}`,
                animation: "blur-reveal 0.9s ease 0.95s both",
              }}
            >
              {invitation.explore_btn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
