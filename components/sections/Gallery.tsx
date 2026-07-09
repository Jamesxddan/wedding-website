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

// ─── Interactive page-turn lightbox ──────────────────────────────────────────

function PageTurnLightbox({
  photos, index, onClose, onIndexChange,
}: {
  photos: DrivePhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [progress, setProgress] = useState(0); // 0 = rest, 1 = fully turned
  const [dir, setDir]           = useState<"next" | "prev">("next");

  const sceneRef  = useRef<HTMLDivElement>(null);
  const proxy     = useRef({ value: 0 });
  const tweenRef  = useRef<gsap.core.Tween | null>(null);
  const dirRef    = useRef<"next" | "prev">("next");

  const current    = photos[index];
  const photoNext  = photos[index + 1] ?? null;
  const photoPrev  = photos[index - 1] ?? null;
  const underPhoto = dir === "next" ? photoNext : photoPrev;

  // GSAP-powered progress animation
  const animateTo = useCallback((target: number, onComplete?: () => void) => {
    tweenRef.current?.kill();
    tweenRef.current = gsap.to(proxy.current, {
      value: target,
      duration: 0.52,
      ease: "power3.inOut",
      onUpdate: () => setProgress(proxy.current.value),
      onComplete,
    });
  }, []);

  const completeTurn = useCallback((d: "next" | "prev", fromP = 0) => {
    if (d === "next" && !photoNext) return;
    if (d === "prev" && !photoPrev) return;
    dirRef.current = d;
    setDir(d);
    proxy.current.value = fromP;
    setProgress(fromP);
    animateTo(1, () => {
      proxy.current.value = 0;
      setProgress(0);
      onIndexChange(d === "next" ? index + 1 : index - 1);
    });
  }, [animateTo, index, onIndexChange, photoNext, photoPrev]);

  const snapBack = useCallback((fromP: number) => {
    proxy.current.value = fromP;
    animateTo(0);
  }, [animateTo]);

  const goNext = useCallback(() => {
    if (tweenRef.current?.isActive() || !photoNext) return;
    completeTurn("next");
  }, [photoNext, completeTurn]);

  const goPrev = useCallback(() => {
    if (tweenRef.current?.isActive() || !photoPrev) return;
    completeTurn("prev");
  }, [photoPrev, completeTurn]);

  // GSAP Observer — velocity-aware drag, handles both mouse and touch
  useEffect(() => {
    if (!sceneRef.current) return;
    let dragging = false;
    let dragStartX = 0;
    let localDir: "next" | "prev" = "next";

    const obs = Observer.create({
      target: sceneRef.current,
      type: "touch,pointer",
      lockAxis: true,
      dragMinimum: 6,
      onPress(self) {
        if (tweenRef.current?.isActive()) return;
        tweenRef.current?.kill();
        const rect = sceneRef.current!.getBoundingClientRect();
        const relX = self.x - rect.left;
        localDir = relX >= rect.width * 0.45 ? "next" : "prev";
        if (localDir === "next" && !photoNext) return;
        if (localDir === "prev" && !photoPrev) return;
        dragging = true;
        dragStartX = self.startX;
        dirRef.current = localDir;
        setDir(localDir);
        proxy.current.value = 0;
        setProgress(0);
      },
      onDrag(self) {
        if (!dragging) return;
        tweenRef.current?.kill();
        const rect = sceneRef.current!.getBoundingClientRect();
        const delta = dirRef.current === "next"
          ? dragStartX - self.x   // drag left = next
          : self.x - dragStartX;  // drag right = prev
        const newP = Math.max(0, Math.min(0.97, delta / (rect.width * 0.65)));
        proxy.current.value = newP;
        setProgress(newP);
      },
      onDragEnd(self) {
        if (!dragging) return;
        dragging = false;
        const p = proxy.current.value;
        // Velocity in px/s; positive = in the turn direction
        const vel = dirRef.current === "next" ? -self.velocityX : self.velocityX;
        if (p > 0.28 || vel > 420) {
          completeTurn(dirRef.current, p);
        } else {
          snapBack(p);
        }
      },
    });

    return () => { obs.kill(); };
  }, [photoNext, photoPrev, completeTurn, snapBack]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => () => { tweenRef.current?.kill(); }, []);

  if (!current) return null;

  // ── Geometry ──────────────────────────────────────────────────────────────
  const p        = progress;
  const showFold = p > 0.003;
  const busy     = tweenRef.current?.isActive() ?? false;

  // Diagonal fold line: sweeps from the bottom-right (or bottom-left for prev)
  // corner across the image. Two phases:
  //   phase1 (p ≤ 0.5): fold line endpoint A on right/left edge, B on bottom edge
  //   phase2 (p > 0.5): fold line endpoint A on top edge, B on left/right edge
  const phase1 = p <= 0.5;

  let foldAx: number, foldAy: number, foldBx: number, foldBy: number;
  if (dir === "next") {
    if (phase1) {
      foldAx = 100;              // right edge
      foldAy = (1 - 2 * p) * 100; // descends from H to 0 as p→0.5
      foldBx = (1 - 2 * p) * 100; // moves left from W to 0
      foldBy = 100;              // bottom edge
    } else {
      foldAx = (2 - 2 * p) * 100; // top edge, moves right→left
      foldAy = 0;
      foldBx = 0;                // left edge
      foldBy = (2 - 2 * p) * 100; // moves up from H to 0
    }
  } else {
    if (phase1) {
      foldAx = 0;                // left edge
      foldAy = (1 - 2 * p) * 100;
      foldBx = 2 * p * 100;     // bottom edge moves right
      foldBy = 100;
    } else {
      foldAx = (2 * p - 1) * 100; // top edge moves left→right
      foldAy = 0;
      foldBx = 100;              // right edge
      foldBy = (2 - 2 * p) * 100;
    }
  }

  // Clip-path for stationary layer (current photo, everything on the "keep" side)
  let stationaryClip: string | undefined;
  if (showFold) {
    if (dir === "next") {
      stationaryClip = phase1
        ? `polygon(0% 0%, 100% 0%, ${foldAx}% ${foldAy}%, ${foldBx}% ${foldBy}%, 0% 100%)`
        : `polygon(0% 0%, ${foldAx}% ${foldAy}%, ${foldBx}% ${foldBy}%)`;
    } else {
      stationaryClip = phase1
        ? `polygon(100% 0%, 0% 0%, ${foldAx}% ${foldAy}%, ${foldBx}% ${foldBy}%, 100% 100%)`
        : `polygon(100% 0%, ${foldAx}% ${foldAy}%, ${foldBx}% ${foldBy}%)`;
    }
  }

  const angle = p * 180;

  // Turning leaf: positioned at the leftmost visible point of the fold line,
  // NO clip-path (clip-path breaks preserve-3d / backfaceVisibility).
  // The stationary layer sits at a higher z-index so it covers the leaf in the
  // non-turning region — the diagonal clip on the stationary layer reveals the
  // leaf only in the correct turning region.
  //
  // "next" phase1: leaf starts at foldBx% = (1-2p)*100
  // "next" phase2: leaf starts at 0 (full width)
  // "prev" mirrors horizontally (uses right edge instead)
  const leafEdgePct = phase1 ? (1 - 2 * p) * 100 : 0;  // distance from near edge

  // Image must project full scene width onto the leaf so the correct half shows.
  // leafWidth is the fraction of scene width the leaf covers (0–1).
  const leafWidthFrac = 1 - leafEdgePct / 100;
  const imgWidthInLeafPct = leafWidthFrac > 0.005 ? (1 / leafWidthFrac) * 100 : 100;

  // Corner peel element: flat parchment triangle lifting from the corner.
  // Fades out as the main 3D leaf takes over.
  const cornerPeelVisible = showFold && p < 0.5;
  const cornerTopY  = Math.max(0, (1 - 2 * p) * 100);
  const cornerSideX = Math.max(0, (1 - 2 * p) * 100);
  const cornerPeelOpacity = Math.max(0, 1 - p / 0.38);
  const cornerPeelClip = dir === "next"
    ? `polygon(100% 100%, 100% ${cornerTopY}%, ${cornerSideX}% 100%)`
    : `polygon(0% 100%, 0% ${cornerTopY}%, ${100 - cornerSideX}% 100%)`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Counter */}
      <p className="absolute top-5 left-1/2 -translate-x-1/2 font-body text-[11px] tracking-widest text-white/50 z-20 pointer-events-none select-none">
        {index + 1} / {photos.length}
      </p>

      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white text-xl transition-colors z-20"
      >×</button>

      {/* ── Scene ── */}
      <div
        ref={sceneRef}
        className="relative rounded-2xl overflow-hidden shadow-2xl select-none"
        style={{
          width:       "min(82vw, 1100px)",
          height:      "min(85vh, 800px)",
          perspective: "1800px",
          cursor:      busy ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        {/* Layer 0 — destination photo (always behind) */}
        {underPhoto && showFold && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={underPhoto.fullUrl}
            alt=""
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: "contain" }}
            draggable={false}
          />
        )}

        {/* Layer 1 — stationary current photo, diagonally clipped (sits ABOVE the turning leaf) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: stationaryClip, zIndex: 2 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.fullUrl}
            alt=""
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ objectFit: "contain" }}
            draggable={false}
          />
          {/* Shadow cast by turning leaf onto the stationary side */}
          {showFold && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                [dir === "next" ? "right" : "left"]: 0,
                width: "90px",
                background: dir === "next"
                  ? `linear-gradient(to right, transparent, rgba(0,0,0,${Math.min(0.48, p * 0.65)}))`
                  : `linear-gradient(to left,  transparent, rgba(0,0,0,${Math.min(0.48, p * 0.65)}))`,
              }}
            />
          )}
        </div>

        {/* Layer 2 — corner peel: flat parchment triangle lifting from corner */}
        {cornerPeelVisible && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: cornerPeelClip,
              opacity:  cornerPeelOpacity,
              background: "linear-gradient(135deg, #f0e8d5 0%, #e2d5b8 50%, #d8c9a3 100%)",
              // Slight shadow line at the fold edge
              boxShadow: dir === "next"
                ? "inset 3px 0 8px rgba(0,0,0,0.18)"
                : "inset -3px 0 8px rgba(0,0,0,0.18)",
            }}
          />
        )}

        {/* Layer 3 — 3D turning leaf: NO clip-path (clip-path breaks preserve-3d).
             Positioned at the fold edge; stationary layer (z-index 2) covers it
             in the non-turning region, revealing it only in the turning triangle. */}
        {showFold && (
          <div
            className="absolute top-0 bottom-0"
            style={{
              // "next": leaf starts at foldBx from the left; "prev": from the right
              [dir === "next" ? "left" : "right"]: `${leafEdgePct}%`,
              [dir === "next" ? "right" : "left"]: 0,
              transformOrigin: dir === "next" ? "left center" : "right center",
              transform:       `perspective(1600px) rotateY(${dir === "next" ? -angle : angle}deg)`,
              transformStyle:  "preserve-3d",
              zIndex: 1,
            }}
          >
            {/* Front face — image wider than leaf so the correct portion shows through */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                backfaceVisibility:       "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.fullUrl}
                alt=""
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  // img is always 100% of scene wide, anchored so its right/left
                  // edge matches the scene edge — identical render position to the
                  // stationary layer, so the two images tile without misalignment.
                  [dir === "next" ? "right" : "left"]: 0,
                  width:     `${imgWidthInLeafPct}%`,
                  height:    "100%",
                  objectFit: "contain",
                }}
                draggable={false}
              />
              {/* Depth shading: darkens toward the fold edge */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: dir === "next"
                    ? `linear-gradient(to right, rgba(0,0,0,${Math.min(0.58, p * 0.78)}), rgba(0,0,0,0.02) 60%, transparent)`
                    : `linear-gradient(to left,  rgba(0,0,0,${Math.min(0.58, p * 0.78)}), rgba(0,0,0,0.02) 60%, transparent)`,
                }}
              />
              {/* Specular highlight at the crease */}
              {p > 0.04 && p < 0.93 && (
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    [dir === "next" ? "left" : "right"]: 0,
                    width: "20px",
                    background: dir === "next"
                      ? `linear-gradient(to right, rgba(255,255,255,${0.2 * Math.sin(p * Math.PI)}), transparent)`
                      : `linear-gradient(to left,  rgba(255,255,255,${0.2 * Math.sin(p * Math.PI)}), transparent)`,
                  }}
                />
              )}
            </div>

            {/* Back face — warm parchment paper, visible after 90° rotation */}
            <div
              className="absolute inset-0"
              style={{
                transform:                "rotateY(180deg)",
                backfaceVisibility:       "hidden",
                WebkitBackfaceVisibility: "hidden",
                background: "linear-gradient(160deg, #f5eddc 0%, #ecdfc9 45%, #e0d3b8 100%)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                background: dir === "next"
                  ? "linear-gradient(to right, rgba(0,0,0,0.2), transparent 65%)"
                  : "linear-gradient(to left,  rgba(0,0,0,0.2), transparent 65%)",
              }} />
              <div className="absolute inset-0 pointer-events-none" style={{
                background: dir === "next"
                  ? "linear-gradient(to left, rgba(255,255,255,0.12), transparent 45%)"
                  : "linear-gradient(to right, rgba(255,255,255,0.12), transparent 45%)",
              }} />
            </div>
          </div>
        )}

        {/* Corner hint — very subtle peel affordance at rest */}
        {!showFold && (photoNext || photoPrev) && (
          <>
            {photoNext && (
              <div
                className="absolute bottom-0 right-0 pointer-events-none"
                style={{
                  width: "52px",
                  height: "52px",
                  clipPath: "polygon(100% 100%, 100% 0%, 0% 100%)",
                  background: "linear-gradient(135deg, #f0e8d5, #ddd0b5)",
                  opacity: 0.55,
                  boxShadow: "-1px -1px 5px rgba(0,0,0,0.22)",
                }}
              />
            )}
            {photoPrev && (
              <div
                className="absolute bottom-0 left-0 pointer-events-none"
                style={{
                  width: "52px",
                  height: "52px",
                  clipPath: "polygon(0% 100%, 0% 0%, 100% 100%)",
                  background: "linear-gradient(225deg, #f0e8d5, #ddd0b5)",
                  opacity: 0.55,
                  boxShadow: "1px -1px 5px rgba(0,0,0,0.22)",
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Prev arrow */}
      {photoPrev && (
        <button
          onClick={goPrev}
          aria-label="Previous photo"
          disabled={busy}
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all z-20 disabled:opacity-25"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {photoNext && (
        <button
          onClick={goNext}
          aria-label="Next photo"
          disabled={busy}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all z-20 disabled:opacity-25"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
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
  }, [folder, state.photos, openAlbum]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

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
        <PageTurnLightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={closeLightbox}
          onIndexChange={handleIndexChange}
        />
      )}
    </section>
  );
}
