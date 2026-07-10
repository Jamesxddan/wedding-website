"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { DrivePhoto, DriveAlbum } from "@/lib/drive";
import Reveal from "@/components/ui/Reveal";
import { albumPriority } from "@/lib/album-priority";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(Observer);

interface Props {
  folder: "engagement" | "wedding";
  title?: string;
}

interface GalleryState {
  albums: DriveAlbum[];
  photos: DrivePhoto[]; // engagement: priority-sorted flat list
  configured: boolean;
  loading: boolean;
  error: boolean;
}

const PAGE_SIZE = 32;

// ─── Spotlight tile ───────────────────────────────────────────────────────────

function SpotlightTile({
  photo, onClick, featured = false, dimmed, onEnter, onLeave,
}: {
  photo: DrivePhoto;
  onClick: () => void;
  featured?: boolean;
  dimmed: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      aria-label={featured ? "View featured photo" : "View photo"}
      className="relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blush"
      style={{
        aspectRatio: "1 / 1",
        gridColumn: featured ? "span 2" : undefined,
        gridRow: featured ? "span 2" : undefined,
        opacity: dimmed ? 0.38 : 1,
        transform: dimmed ? "scale(0.985)" : "scale(1)",
        transition: "opacity 0.22s ease, transform 0.22s ease",
        borderRadius: "6px",
      }}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-champagne/30 animate-pulse" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnailUrl}
        alt=""
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
      />
    </button>
  );
}

// ─── Spotlight grid ───────────────────────────────────────────────────────────

function SpotlightGrid({
  photos, onPhotoClick,
}: {
  photos: DrivePhoto[];
  onPhotoClick: (p: DrivePhoto) => void;
}) {
  const [cols, setCols] = useState(4);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    function update() { setCols(window.innerWidth < 640 ? 2 : 4); }
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const [featured, ...rest] = photos;
  const anyHovered = hoveredId !== null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "4px" }}>
      {featured && (
        <SpotlightTile
          photo={featured}
          onClick={() => onPhotoClick(featured)}
          featured
          dimmed={anyHovered && hoveredId !== featured.id}
          onEnter={() => setHoveredId(featured.id)}
          onLeave={() => setHoveredId(null)}
        />
      )}
      {rest.map((photo) => (
        <SpotlightTile
          key={photo.id}
          photo={photo}
          onClick={() => onPhotoClick(photo)}
          dimmed={anyHovered && hoveredId !== photo.id}
          onEnter={() => setHoveredId(photo.id)}
          onLeave={() => setHoveredId(null)}
        />
      ))}
    </div>
  );
}

// ─── Wedding album card ───────────────────────────────────────────────────────

function AlbumCard({ album, onClick }: { album: DriveAlbum; onClick: () => void }) {
  const cover = album.photos[0];
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-blush aspect-[4/3] w-full bg-champagne/40"
      aria-label={`Open ${album.name} album`}
    >
      {cover && (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-champagne/40 via-blush/20 to-champagne/40 animate-pulse" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.thumbnailUrl}
            alt={album.name}
            onLoad={() => setImgLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
        <p className="font-heading text-white text-xl md:text-2xl leading-tight">{album.name}</p>
        <p className="font-body text-white/60 text-xs tracking-widest uppercase mt-1">
          {album.photos.length} photos
        </p>
      </div>
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

// ─── Wedding masonry grid ─────────────────────────────────────────────────────

function useColumnCount() {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    function update() { setCols(window.innerWidth < 640 ? 2 : 3); }
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

function MasonryTile({ photo, onClick }: { photo: DrivePhoto; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full rounded-xl bg-champagne/25 aspect-[4/3] flex items-center justify-center mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-20">
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" stroke="#9c6b7a" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="8.5" cy="8.5" r="1.5" fill="#9c6b7a"/>
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#9c6b7a" strokeWidth="1.5"/>
        </svg>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group block w-full rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-blush mb-3"
      aria-label="View photo"
    >
      <div className="relative bg-champagne/30 w-full" style={{ paddingBottom: loaded ? "0" : "75%" }}>
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-champagne/30 via-blush/10 to-champagne/30" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnailUrl}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-auto object-cover transition-all duration-500 group-hover:scale-[1.03] ${loaded ? "block" : "absolute inset-0 opacity-0"}`}
        />
      </div>
    </button>
  );
}

function MasonryGrid({ photos, onPhotoClick }: { photos: DrivePhoto[]; onPhotoClick: (p: DrivePhoto) => void }) {
  const numCols = useColumnCount();
  const columns = Array.from({ length: numCols }, (_, col) =>
    photos.filter((_, i) => i % numCols === col)
  );
  return (
    <div className="flex gap-3">
      {columns.map((colPhotos, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col min-w-0">
          {colPhotos.map((photo) => (
            <MasonryTile key={photo.id} photo={photo} onClick={() => onPhotoClick(photo)} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Load more ────────────────────────────────────────────────────────────────

function LoadMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-center mt-10">
      <button
        onClick={onClick}
        className="px-8 py-3 rounded-full border border-deep-rose text-deep-rose font-heading text-sm tracking-widest uppercase hover:bg-blush/20 transition-colors"
      >
        Load more
      </button>
    </div>
  );
}

// ─── Album Book ──────────────────────────────────────────────────────────────

const PAGE_BG = "#f7f3ec";

function RotateDevicePrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/96 flex flex-col items-center justify-center gap-8 px-8">
      <div style={{ fontSize: "4rem", animation: "rotateHint 2.2s ease-in-out infinite" }}>📱</div>
      <div className="text-center">
        <p className="font-body text-white text-lg mb-2">Rotate your device</p>
        <p className="font-body text-white/50 text-sm">The album looks best in landscape</p>
      </div>
      <button onClick={onDismiss} className="font-body text-white/30 text-xs tracking-widest underline underline-offset-2">
        view anyway
      </button>
      <style>{`@keyframes rotateHint { 0%,100%{transform:rotate(0deg)} 40%,60%{transform:rotate(90deg)} }`}</style>
    </div>
  );
}

function BookPage({
  photo,
  isLeft,
  pageNum,
  guestName,
}: {
  photo: DrivePhoto | null;
  isLeft: boolean;
  pageNum?: number;
  guestName?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const watermarkText = guestName ? `James & Sharon  ·  ${guestName}` : null;
  return (
    <div className="relative h-full flex-shrink-0" style={{ width: "50%", background: PAGE_BG }}>
      {photo && (
        <>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-amber-300/40 border-t-amber-600/70 animate-spin" />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.fullUrl}
            alt=""
            draggable={false}
            onLoad={() => setLoaded(true)}
            className="absolute pointer-events-none"
            style={{
              inset: "7%",
              width: "86%",
              height: "86%",
              objectFit: "contain",
              background: PAGE_BG,
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.35s",
              boxShadow: "0 1px 6px rgba(0,0,0,0.09), 0 3px 12px rgba(0,0,0,0.06)",
            }}
          />
          {/* Diagonal watermark — visible in screenshots, traceable to guest */}
          {watermarkText && loaded && (
            <div
              className="absolute pointer-events-none select-none"
              style={{ inset: "7%", width: "86%", height: "86%", overflow: "hidden", zIndex: 10 }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: "-25%",
                    right: "-25%",
                    top: `${8 + i * 21}%`,
                    transform: "rotate(-28deg)",
                    textAlign: "center",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <span style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "clamp(0.55rem, 1.4vw, 0.85rem)",
                    color: "rgba(44,24,16,0.19)",
                    letterSpacing: "0.3em",
                    whiteSpace: "nowrap",
                  }}>
                    {watermarkText}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {pageNum !== undefined && (
        <p
          className="absolute bottom-2 font-body text-[9px] tracking-widest pointer-events-none select-none"
          style={{ [isLeft ? "left" : "right"]: "8%", color: "rgba(0,0,0,0.2)" }}
        >
          {pageNum}
        </p>
      )}
      {/* Inner shadow toward spine */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{
          [isLeft ? "right" : "left"]: 0,
          width: 28,
          background: isLeft
            ? "linear-gradient(to left, rgba(0,0,0,0.07), transparent)"
            : "linear-gradient(to right, rgba(0,0,0,0.07), transparent)",
        }}
      />
    </div>
  );
}

function BookSpread({
  leftPhoto, rightPhoto, leftPageNum, rightPageNum, guestName,
}: {
  leftPhoto: DrivePhoto | null;
  rightPhoto: DrivePhoto | null;
  leftPageNum?: number;
  rightPageNum?: number;
  guestName?: string;
}) {
  return (
    <div className="absolute inset-0 flex" style={{ background: PAGE_BG }}>
      <BookPage photo={leftPhoto} isLeft pageNum={leftPageNum} guestName={guestName} />
      {/* Spine shadow */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
        width: 32, zIndex: 5,
        background: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.10) 100%)",
      }} />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
        width: 2, zIndex: 6,
        background: "linear-gradient(to bottom, #c9a84c55, #8b691455, #c9a84c55)",
      }} />
      <BookPage photo={rightPhoto} isLeft={false} pageNum={rightPageNum} guestName={guestName} />
    </div>
  );
}

function BookCover() {
  return (
    <div className="absolute inset-0 flex">
      {/* Left: inside front cover */}
      <div className="relative h-full" style={{ width: "50%", background: "#f2ece0" }}>
        <div className="absolute inset-0 flex items-end justify-center pb-10 px-8">
          <p className="font-heading italic text-center" style={{ color: "rgba(0,0,0,0.18)", fontSize: "clamp(0.75rem, 2vw, 1.15rem)", lineHeight: 1.6 }}>
            "God&apos;s will was on<br/>our marriage"
          </p>
        </div>
        <div className="absolute right-0 inset-y-0 pointer-events-none" style={{ width: 28, background: "linear-gradient(to left, rgba(0,0,0,0.09), transparent)" }} />
      </div>
      {/* Spine */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 32, zIndex: 5, background: "linear-gradient(to right, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.10) 100%)" }} />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 2, zIndex: 6, background: "linear-gradient(to bottom, #c9a84c80, #8b691480, #c9a84c80)" }} />
      {/* Right: cover face */}
      <div className="relative h-full flex flex-col items-center justify-center overflow-hidden" style={{ width: "50%", background: "linear-gradient(160deg, #2c1810 0%, #4a2c15 40%, #3d2310 70%, #1e1008 100%)" }}>
        <div className="absolute pointer-events-none" style={{ inset: "5%", border: "1.5px solid rgba(201,168,76,0.45)" }} />
        <div className="absolute pointer-events-none" style={{ inset: "7.5%", border: "0.5px solid rgba(201,168,76,0.2)" }} />
        <div className="relative z-10 text-center px-[12%]">
          <p className="font-body tracking-[0.35em] mb-5" style={{ color: "rgba(201,168,76,0.65)", fontSize: "clamp(0.45rem, 1.1vw, 0.68rem)" }}>
            AN ENGAGEMENT ALBUM
          </p>
          <h1 className="font-heading" style={{ color: "#f5e6c8", fontSize: "clamp(1.1rem, 3.2vw, 2.5rem)", lineHeight: 1.1 }}>James</h1>
          <p className="font-body my-2" style={{ color: "rgba(201,168,76,0.75)", fontSize: "clamp(0.85rem, 1.8vw, 1.3rem)" }}>&amp;</p>
          <h1 className="font-heading mb-5" style={{ color: "#f5e6c8", fontSize: "clamp(1.1rem, 3.2vw, 2.5rem)", lineHeight: 1.1 }}>Sharon</h1>
          <div className="mx-auto mb-4" style={{ width: "50%", height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.55), transparent)" }} />
          <p className="font-body tracking-[0.18em]" style={{ color: "rgba(201,168,76,0.5)", fontSize: "clamp(0.42rem, 0.9vw, 0.62rem)" }}>
            OCTOBER 8, 2026 · CHENNAI
          </p>
        </div>
        <div className="absolute left-0 inset-y-0 pointer-events-none" style={{ width: 20, background: "linear-gradient(to right, rgba(0,0,0,0.45), transparent)" }} />
      </div>
    </div>
  );
}

function AlbumBook({
  photos, index, onClose, onIndexChange,
}: {
  photos: DrivePhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [guestName, setGuestName] = useState<string>("");
  useEffect(() => {
    setGuestName(localStorage.getItem("guest_name") ?? "");
  }, []);
  // Spread 0 = cover; spread k≥1 has photos[(k-1)*2] and photos[(k-1)*2+1]
  const totalSpreads = 1 + Math.ceil(photos.length / 2);

  const [spreadIndex, setSpreadIndex] = useState(() =>
    Math.min(Math.floor(index / 2) + 1, totalSpreads - 1)
  );
  const [progress, setProgress]         = useState(0);
  const [dir, setDir]                   = useState<"next" | "prev">("next");
  const [busy, setBusy]                 = useState(false);
  const [isAnimating, setIsAnimating]   = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const [isPortrait, setIsPortrait]     = useState(false);
  const [dismissedRotate, setDismissedRotate] = useState(false);

  const sceneRef      = useRef<HTMLDivElement>(null);
  const proxy         = useRef({ value: 0 });
  const tweenRef      = useRef<gsap.core.Tween | null>(null);
  const dirRef        = useRef<"next" | "prev">("next");
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spreadIdxRef  = useRef(spreadIndex); // always reflects current spread for event handlers
  useEffect(() => { spreadIdxRef.current = spreadIndex; }, [spreadIndex]);

  // Detect mobile / orientation
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    const update = () => setIsPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // Screenshot / print logging
  useEffect(() => {
    const token = localStorage.getItem("session_token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { "x-session-token": token } : {}),
    };

    const currentSpreadMeta = () => {
      const si = spreadIdxRef.current;
      const base = (si - 1) * 2;
      const left  = si > 0 ? photos[base]     : null;
      const right = si > 0 ? photos[base + 1] : null;
      return {
        spread_index: si,
        page_left:  si > 0 ? (si - 1) * 2 + 1 : null,
        page_right: si > 0 && right ? (si - 1) * 2 + 2 : null,
        photo_left:  left?.name  ?? null,
        photo_right: right?.name ?? null,
        total_photos: photos.length,
      };
    };

    const log = (type: string) =>
      fetch("/api/gallery-event", {
        method: "POST",
        headers,
        body: JSON.stringify({ type, metadata: currentSpreadMeta() }),
      }).catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") log("screenshot_printscreen");
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3","4","5","s"].includes(e.key)) log("screenshot_macos");
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); log("print_attempt"); }
    };
    const onVis = () => {
      if (document.hidden) {
        log("screenshot_attempt");
        // Blur the book instantly — on many mobile browsers the page briefly hides
        // during a screenshot capture; this makes the captured frame blurred.
        if (sceneRef.current) sceneRef.current.style.filter = "blur(24px)";
      } else {
        if (sceneRef.current) sceneRef.current.style.filter = "";
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSpreadPhotos = (si: number): [DrivePhoto | null, DrivePhoto | null] => {
    if (si <= 0) return [null, null];
    const base = (si - 1) * 2;
    return [photos[base] ?? null, photos[base + 1] ?? null];
  };

  const renderSpread = (si: number) => {
    if (si <= 0) return <BookCover />;
    const [l, r] = getSpreadPhotos(si);
    const ln = (si - 1) * 2 + 1;
    const rn = (si - 1) * 2 + 2;
    return (
      <BookSpread
        leftPhoto={l}
        rightPhoto={r}
        leftPageNum={ln <= photos.length ? ln : undefined}
        rightPageNum={rn <= photos.length ? rn : undefined}
        guestName={guestName || undefined}
      />
    );
  };

  const hasPrev = spreadIndex > 0;
  const hasNext = spreadIndex < totalSpreads - 1;

  // Preload next 2 spreads
  useEffect(() => {
    for (let offset = 1; offset <= 2; offset++) {
      const [l, r] = getSpreadPhotos(spreadIndex + offset);
      [l, r].forEach(ph => { if (ph) { const img = new Image(); img.src = ph.fullUrl; } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadIndex]);

  // CSS-transition-based animation: rAF is throttled in background tabs but
  // CSS transitions run on the compositor regardless. We drive the state to the
  // target in a microtask so React has one render at the "from" value before
  // we commit the "to" value, giving the browser time to set up the transition.
  const animateTo = useCallback((onComplete: () => void) => {
    tweenRef.current?.kill();
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    proxy.current.value = 0;
    setProgress(0);
    setIsAnimating(true);
    // one tick so React paints the "from" state with transition enabled
    timerRef.current = setTimeout(() => {
      setProgress(1);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onComplete();
      }, 660);
    }, 16);
  }, []);

  const snapBack = useCallback((fromP: number) => {
    tweenRef.current?.kill();
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    proxy.current.value = fromP;
    setIsAnimating(true);
    setProgress(0);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsAnimating(false);
      setBusy(false);
    }, 320);
  }, []);

  const goNext = useCallback(() => {
    if (busy || !hasNext) return;
    setBusy(true);
    setDir("next");
    dirRef.current = "next";
    animateTo(() => {
      setSpreadIndex(s => {
        const n = s + 1;
        onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2));
        return n;
      });
      setProgress(0);
      setIsAnimating(false);
      setBusy(false);
    });
  }, [busy, hasNext, animateTo, onIndexChange]);

  const goPrev = useCallback(() => {
    if (busy || !hasPrev) return;
    setBusy(true);
    setDir("prev");
    dirRef.current = "prev";
    animateTo(() => {
      setSpreadIndex(s => {
        const n = s - 1;
        onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2));
        return n;
      });
      setProgress(0);
      setIsAnimating(false);
      setBusy(false);
    });
  }, [busy, hasPrev, animateTo, onIndexChange]);

  // Drag / swipe via GSAP Observer
  useEffect(() => {
    if (!sceneRef.current) return;
    let dragging = false;
    let dragStartX = 0;
    let localDir: "next" | "prev" = "next";

    const obs = Observer.create({
      target: sceneRef.current,
      type: "touch,pointer",
      lockAxis: true,
      dragMinimum: 8,
      onPress(self) {
        if (tweenRef.current?.isActive()) return;
        tweenRef.current?.kill();
        const rect = sceneRef.current!.getBoundingClientRect();
        localDir = (self.x ?? 0) - rect.left >= rect.width * 0.5 ? "next" : "prev";
        if (localDir === "next" && !hasNext) return;
        if (localDir === "prev" && !hasPrev) return;
        dragging = true;
        dragStartX = self.startX ?? 0;
        dirRef.current = localDir;
        setDir(localDir);
        proxy.current.value = 0;
        setProgress(0);
        setBusy(true);
      },
      onDrag(self) {
        if (!dragging) return;
        tweenRef.current?.kill();
        const rect = sceneRef.current!.getBoundingClientRect();
        const delta = localDir === "next"
          ? dragStartX - (self.x ?? 0)
          : (self.x ?? 0) - dragStartX;
        proxy.current.value = Math.max(0, Math.min(0.97, delta / (rect.width * 0.7)));
        setProgress(proxy.current.value);
      },
      onDragEnd(self) {
        if (!dragging) return;
        dragging = false;
        const p = proxy.current.value;
        const vel = localDir === "next" ? -(self.velocityX ?? 0) : (self.velocityX ?? 0);
        if (p > 0.3 || vel > 400) {
          if (localDir === "next" && hasNext) {
            animateTo(() => {
              setSpreadIndex(s => { const n = s + 1; onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2)); return n; });
              setProgress(0); setIsAnimating(false); setBusy(false);
            });
          } else if (localDir === "prev" && hasPrev) {
            animateTo(() => {
              setSpreadIndex(s => { const n = s - 1; onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2)); return n; });
              setProgress(0); setIsAnimating(false); setBusy(false);
            });
          } else {
            snapBack(p);
          }
        } else {
          snapBack(p);
        }
      },
    });
    return () => obs.kill();
  }, [hasNext, hasPrev, animateTo, snapBack, onIndexChange]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => () => {
    tweenRef.current?.kill();
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  // Fold geometry: horizontal wipe with shadow crease.
  // currentClip is always defined so CSS transition can interpolate between states.
  const p = progress;
  const showFold = p > 0.003 || isAnimating;
  const foldX = dir === "next" ? (1 - p) * 100 : p * 100;
  const currentClip = dir === "next"
    ? `polygon(0% 0%, ${foldX}% 0%, ${foldX}% 100%, 0% 100%)`
    : `polygon(${foldX}% 0%, 100% 0%, 100% 100%, ${foldX}% 100%)`;

  const adjacentSpreadIndex = dir === "next" ? spreadIndex + 1 : spreadIndex - 1;

  const leftNum  = spreadIndex <= 0 ? undefined : (spreadIndex - 1) * 2 + 1;
  const rightNum = spreadIndex <= 0 ? undefined : (spreadIndex - 1) * 2 + 2;
  const spreadLabel = spreadIndex === 0
    ? "Cover"
    : `${leftNum}–${Math.min(rightNum ?? 0, photos.length)} of ${photos.length}`;

  const showRotate = isMobile && isPortrait && !dismissedRotate;

  return (
    <>
      {showRotate && <RotateDevicePrompt onDismiss={() => setDismissedRotate(true)} />}

      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(8,4,2,0.96)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Top bar */}
        <p className="absolute top-4 left-1/2 -translate-x-1/2 font-body text-[10px] tracking-widest text-white/35 z-20 pointer-events-none select-none">
          {spreadLabel}
        </p>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg transition-colors z-20"
        >×</button>

        {/* Book spread */}
        <div
          ref={sceneRef}
          className="relative select-none overflow-hidden"
          style={{
            width: "min(94vw, calc(88vh * 1.5))",
            aspectRatio: "3/2",
            borderRadius: "3px",
            boxShadow: "0 30px 90px rgba(0,0,0,0.75), 0 8px 30px rgba(0,0,0,0.5)",
            cursor: busy ? "grabbing" : "grab",
            touchAction: "none",
          }}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Layer 1: adjacent spread (bottom, fully visible during animation) */}
          {showFold && (
            <div className="absolute inset-0">{renderSpread(adjacentSpreadIndex)}</div>
          )}

          {/* Layer 2: current spread, clipped during fold */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: currentClip,
              transition: isAnimating ? "clip-path 0.65s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
            }}
          >
            {renderSpread(spreadIndex)}
          </div>

          {/* Layer 3: crease shadow at fold line */}
          {showFold && (
            <div
              className="absolute inset-y-0 pointer-events-none"
              style={{
                left: `calc(${foldX}% - 24px)`,
                width: 48,
                zIndex: 20,
                transition: isAnimating ? "left 0.65s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                background: dir === "next"
                  ? "linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.12) 40%, rgba(255,255,255,0.04) 70%, transparent 100%)"
                  : "linear-gradient(to left, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.12) 40%, rgba(255,255,255,0.04) 70%, transparent 100%)",
              }}
            />
          )}
        </div>

        {/* Nav arrows */}
        {hasPrev && (
          <button
            onClick={goPrev}
            aria-label="Previous spread"
            disabled={busy}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-20 transition-colors disabled:opacity-20"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            onClick={goNext}
            aria-label="Next spread"
            disabled={busy}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-20 transition-colors disabled:opacity-20"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Gallery({ folder, title = "Gallery" }: Props) {
  const [state, setState] = useState<GalleryState>({
    albums: [],
    photos: [],
    configured: false,
    loading: true,
    error: false,
  });
  const [openAlbum, setOpenAlbum] = useState<DriveAlbum | null>(null);
  const [page, setPage] = useState(1);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const sessionToken = localStorage.getItem("session_token");
    const headers: HeadersInit = sessionToken ? { "x-session-token": sessionToken } : {};

    const url = `/api/drive-photos?folder=${folder}&view=albums`;

    fetch(url, { headers })
      .then((r) => r.json())
      .then((data) => {
        const sortedPhotos =
          folder === "engagement"
            ? (data.albums ?? [])
                .sort((a: DriveAlbum, b: DriveAlbum) => albumPriority(a.name) - albumPriority(b.name))
                .flatMap((album: DriveAlbum) => album.photos)
            : [];
        setState({
          albums: data.albums ?? [],
          photos: sortedPhotos,
          configured: data.configured ?? false,
          loading: false,
          error: !!data.error,
        });
      })
      .catch(() => setState((s) => ({ ...s, loading: false, error: true })));
  }, [folder]);

  useEffect(() => { setPage(1); }, [openAlbum]);

  const lightboxPhotos = folder === "engagement" ? state.photos : (openAlbum?.photos ?? []);

  const openLightbox = useCallback((photo: DrivePhoto) => {
    const photos = folder === "engagement" ? state.photos : (openAlbum?.photos ?? []);
    const idx = photos.findIndex(p => p.id === photo.id);
    setLightboxIndex(idx !== -1 ? idx : 0);
    // Set a short-lived cookie so drive-image route can authenticate img tag requests
    const token = localStorage.getItem("session_token");
    if (token) {
      document.cookie = `gallery_token=${token}; path=/api/drive-image; SameSite=Strict; max-age=3600`;
    }
    // Track gallery open in the phase_view event_data row
    fetch("/api/gallery-event", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
      body: JSON.stringify({ type: "gallery_open" }),
    }).catch(() => {});
  }, [folder, state.photos, openAlbum]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    // Revoke the gallery access cookie when the book is closed
    document.cookie = "gallery_token=; path=/api/drive-image; SameSite=Strict; max-age=0";
  }, []);

  const handleIndexChange = useCallback((i: number) => setLightboxIndex(i), []);

  // Escape key — close album when lightbox is closed
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && lightboxIndex === null && openAlbum) {
        setOpenAlbum(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIndex, openAlbum]);

  const spotlightVisible = state.photos.slice(0, page * PAGE_SIZE);
  const spotlightHasMore = folder === "engagement" && state.photos.length > page * PAGE_SIZE;

  const albumPhotosVisible = openAlbum?.photos.slice(0, page * PAGE_SIZE) ?? [];
  const albumHasMore = openAlbum ? openAlbum.photos.length > page * PAGE_SIZE : false;

  const subtitle = folder === "engagement" ? "Moments before forever" : "Moments we treasure";

  return (
    <section id="gallery" className="py-24 px-6 max-w-6xl mx-auto">
      <Reveal>
        <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">{title}</h2>
        <p className="font-script italic text-sage text-center text-xl mb-12">{subtitle}</p>
      </Reveal>

      {state.loading && (
        <div className="flex justify-center py-16">
          <span className="font-script italic text-deep-rose/60 text-lg animate-pulse">Loading photos…</span>
        </div>
      )}

      {!state.loading && !state.configured && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-blush/40 flex items-center justify-center text-4xl">🌸</div>
          <p className="font-heading text-deep-rose text-xl">Photos coming soon</p>
          <p className="font-body text-deep-rose/60 text-sm max-w-xs">
            Our gallery will appear here once the photos are uploaded.
          </p>
        </div>
      )}

      {!state.loading && state.configured && state.error && (
        <div className="flex justify-center py-16">
          <p className="font-body text-deep-rose/60 text-sm">Could not load photos right now.</p>
        </div>
      )}

      {/* Engagement: Spotlight mosaic */}
      {folder === "engagement" && !state.loading && state.configured && !state.error && spotlightVisible.length > 0 && (
        <Reveal delay={150}>
          <SpotlightGrid photos={spotlightVisible} onPhotoClick={openLightbox} />
          {spotlightHasMore && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
        </Reveal>
      )}

      {/* Wedding: album cards */}
      {folder === "wedding" && !state.loading && !openAlbum && state.albums.length > 0 && (
        <Reveal delay={150}>
          <div className={`grid gap-6 ${
            state.albums.length === 1 ? "grid-cols-1 max-w-sm mx-auto"
            : state.albums.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          }`}>
            {state.albums.map((album) => (
              <AlbumCard key={album.id} album={album} onClick={() => setOpenAlbum(album)} />
            ))}
          </div>
        </Reveal>
      )}

      {/* Wedding: open album detail */}
      {folder === "wedding" && !state.loading && openAlbum && (
        <div>
          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <button
              onClick={() => setOpenAlbum(null)}
              className="flex items-center gap-1.5 font-body text-xs text-deep-rose/60 hover:text-deep-rose transition-colors tracking-widest uppercase"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All Albums
            </button>
            <span className="text-champagne text-xs">·</span>
            <span className="font-heading text-deep-rose">{openAlbum.name}</span>
            <span className="font-body text-deep-rose/40 text-xs tracking-widest uppercase">
              {openAlbum.photos.length} photos
            </span>
          </div>
          <MasonryGrid photos={albumPhotosVisible} onPhotoClick={openLightbox} />
          {albumHasMore && <LoadMoreButton onClick={() => setPage((p) => p + 1)} />}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <AlbumBook
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={closeLightbox}
          onIndexChange={handleIndexChange}
        />
      )}
    </section>
  );
}
