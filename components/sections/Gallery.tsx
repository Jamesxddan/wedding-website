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
  wmExtra,
  wmTime,
  fullWidth,
  noSpineShadow,
}: {
  photo: DrivePhoto | null;
  isLeft: boolean;
  pageNum?: number;
  guestName?: string;
  wmExtra?: string;   // city
  wmTime?: string;    // IST open-time (rendered on its own line)
  fullWidth?: boolean;
  noSpineShadow?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const lineParts = ["James & Sharon", guestName, wmExtra].filter(Boolean);
  const watermarkLine1 = lineParts.length > 1 ? lineParts.join("  ·  ") : null;
  const watermarkLine2 = wmTime ?? null;
  return (
    <div className="relative h-full flex-shrink-0" style={{ width: fullWidth ? "100%" : "50%", background: PAGE_BG }}>
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
          {(watermarkLine1 || watermarkLine2) && loaded && (
            <div
              className="absolute pointer-events-none select-none"
              style={{ inset: "7%", width: "86%", height: "86%", overflow: "hidden", zIndex: 10 }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: "-35%",
                    right: "-35%",
                    top: `${3 + i * 11}%`,
                    transform: "rotate(-28deg)",
                    textAlign: "center",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {watermarkLine1 && (
                    <span style={{
                      display: "block",
                      fontFamily: "Georgia, serif",
                      fontSize: "clamp(0.7rem, 1.8vw, 1.05rem)",
                      fontWeight: "700",
                      color: "rgba(44,24,16,0.22)",
                      letterSpacing: "0.28em",
                      whiteSpace: "nowrap",
                      textShadow: "0 0 1px rgba(44,24,16,0.10)",
                    }}>
                      {watermarkLine1}
                    </span>
                  )}
                  {watermarkLine2 && (
                    <span style={{
                      display: "block",
                      fontFamily: "Georgia, serif",
                      fontSize: "clamp(0.55rem, 1.3vw, 0.82rem)",
                      fontWeight: "400",
                      color: "rgba(44,24,16,0.18)",
                      letterSpacing: "0.20em",
                      whiteSpace: "nowrap",
                    }}>
                      {watermarkLine2}
                    </span>
                  )}
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
      {!noSpineShadow && (
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
      )}
    </div>
  );
}

function BookSpread({
  leftPhoto, rightPhoto, leftPageNum, rightPageNum, guestName, wmExtra, wmTime,
}: {
  leftPhoto: DrivePhoto | null;
  rightPhoto: DrivePhoto | null;
  leftPageNum?: number;
  rightPageNum?: number;
  guestName?: string;
  wmExtra?: string;
  wmTime?: string;
}) {
  return (
    <div className="absolute inset-0 flex" style={{ background: PAGE_BG }}>
      <BookPage photo={leftPhoto} isLeft pageNum={leftPageNum} guestName={guestName} wmExtra={wmExtra} wmTime={wmTime} />
      {/* Spine shadow */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
        width: 32, zIndex: 5,
        background: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.10) 100%)",
      }} />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
        width: 2, zIndex: 6,
        background: "linear-gradient(to bottom, #c9a84c55, #8b691455, #c9a84c55)",
      }} />
      <BookPage photo={rightPhoto} isLeft={false} pageNum={rightPageNum} guestName={guestName} wmExtra={wmExtra} wmTime={wmTime} />
    </div>
  );
}

function BookCoverLeft() {
  return (
    <div className="relative h-full w-full" style={{ background: "#f2ece0" }}>
      <div className="absolute inset-0 flex items-end justify-center pb-10 px-8">
        <p className="font-heading italic text-center" style={{ color: "rgba(0,0,0,0.18)", fontSize: "clamp(0.75rem, 2vw, 1.15rem)", lineHeight: 1.6 }}>
          "God&apos;s will was on<br/>our marriage"
        </p>
      </div>
      <div className="absolute right-0 inset-y-0 pointer-events-none" style={{ width: 28, background: "linear-gradient(to left, rgba(0,0,0,0.09), transparent)" }} />
    </div>
  );
}

function BookCoverRight({ folder }: { folder: "engagement" | "wedding" }) {
  const albumLabel = folder === "engagement" ? "AN ENGAGEMENT ALBUM" : "A WEDDING ALBUM";
  const dateLabel  = folder === "engagement" ? "FEBRUARY 12, 2026 · CHENNAI" : "OCTOBER 8, 2026 · CHENNAI";
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden" style={{ background: "linear-gradient(160deg, #2c1810 0%, #4a2c15 40%, #3d2310 70%, #1e1008 100%)" }}>
      <div className="absolute pointer-events-none" style={{ inset: "5%", border: "1.5px solid rgba(201,168,76,0.45)" }} />
      <div className="absolute pointer-events-none" style={{ inset: "7.5%", border: "0.5px solid rgba(201,168,76,0.2)" }} />
      <div className="relative z-10 text-center px-[12%]">
        <p className="font-body tracking-[0.35em] mb-5" style={{ color: "rgba(201,168,76,0.65)", fontSize: "clamp(0.45rem, 1.1vw, 0.68rem)" }}>
          {albumLabel}
        </p>
        <h1 className="font-heading" style={{ color: "#f5e6c8", fontSize: "clamp(1.1rem, 3.2vw, 2.5rem)", lineHeight: 1.1 }}>James</h1>
        <p className="font-body my-2" style={{ color: "rgba(201,168,76,0.75)", fontSize: "clamp(0.85rem, 1.8vw, 1.3rem)" }}>&amp;</p>
        <h1 className="font-heading mb-5" style={{ color: "#f5e6c8", fontSize: "clamp(1.1rem, 3.2vw, 2.5rem)", lineHeight: 1.1 }}>Sharon</h1>
        <div className="mx-auto mb-4" style={{ width: "50%", height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.55), transparent)" }} />
        <p className="font-body tracking-[0.18em]" style={{ color: "rgba(201,168,76,0.5)", fontSize: "clamp(0.42rem, 0.9vw, 0.62rem)" }}>
          {dateLabel}
        </p>
      </div>
      <div className="absolute left-0 inset-y-0 pointer-events-none" style={{ width: 20, background: "linear-gradient(to right, rgba(0,0,0,0.45), transparent)" }} />
    </div>
  );
}

function BookCover({ folder }: { folder: "engagement" | "wedding" }) {
  return (
    <div className="absolute inset-0 flex">
      <div className="relative h-full" style={{ width: "50%" }}><BookCoverLeft /></div>
      {/* Spine */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 32, zIndex: 5, background: "linear-gradient(to right, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.10) 100%)" }} />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 2, zIndex: 6, background: "linear-gradient(to bottom, #c9a84c80, #8b691480, #c9a84c80)" }} />
      <div className="relative h-full" style={{ width: "50%" }}><BookCoverRight folder={folder} /></div>
    </div>
  );
}

// ─── Canvas cylinder-curl helpers ────────────────────────────────────────────

function ctxDrawHalfPage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  W: number,
  H: number,
  img: HTMLImageElement | undefined,
  isLeft: boolean,
  pageNum: number | undefined,
  wmLine1: string | null,
  wmLine2: string | null,
) {
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, W, H);

  if (img && img.complete && img.naturalWidth > 0) {
    const inset = 0.07;
    const bw = W * (1 - 2 * inset);
    const bh = H * (1 - 2 * inset);
    const bx = W * inset;
    const by = H * inset;
    const imgAR = img.naturalWidth / img.naturalHeight;
    const boxAR = bw / bh;
    let pw: number, ph: number, px: number, py: number;
    if (imgAR > boxAR) {
      pw = bw; ph = bw / imgAR;
      px = bx; py = by + (bh - ph) / 2;
    } else {
      ph = bh; pw = bh * imgAR;
      py = by; px = bx + (bw - pw) / 2;
    }
    ctx.drawImage(img, px, py, pw, ph);
  }

  if (wmLine1 || wmLine2) {
    ctx.save();
    const diag = Math.sqrt(W * W + H * H);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 4);
    const rowSpacing = Math.min(H * 0.14, 52);
    const numRows = Math.ceil(diag / rowSpacing) + 1;
    const fs1 = Math.min(W * 0.020, 10.5);
    const fs2 = Math.min(W * 0.015, 8.2);
    for (let r = -numRows; r <= numRows; r++) {
      const ry = r * rowSpacing;
      if (wmLine1) {
        ctx.font = `bold ${fs1}px Georgia, serif`;
        ctx.fillStyle = "rgba(44,24,16,0.22)";
        ctx.textAlign = "center";
        for (let xi = -2; xi <= 2; xi++) {
          ctx.fillText(wmLine1, xi * (diag / 2.5), ry);
        }
      }
      if (wmLine2) {
        ctx.font = `${fs2}px Georgia, serif`;
        ctx.fillStyle = "rgba(44,24,16,0.18)";
        ctx.textAlign = "center";
        for (let xi = -2; xi <= 2; xi++) {
          ctx.fillText(wmLine2, xi * (diag / 2.5), ry + (wmLine1 ? fs1 + 2 : 0));
        }
      }
    }
    ctx.restore();
  }

  if (pageNum !== undefined) {
    ctx.save();
    ctx.font = `${Math.min(W * 0.018, 9)}px Georgia, serif`;
    ctx.fillStyle = "rgba(44,24,16,0.35)";
    ctx.textAlign = isLeft ? "left" : "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(String(pageNum), isLeft ? W * 0.06 : W * 0.94, H * 0.94);
    ctx.restore();
  }
}

function hFlipCanvas(src: OffscreenCanvas, W: number, H: number): OffscreenCanvas {
  const oc = new OffscreenCanvas(Math.ceil(W), Math.ceil(H));
  const c = oc.getContext("2d") as OffscreenCanvasRenderingContext2D;
  c.translate(W, 0);
  c.scale(-1, 1);
  c.drawImage(src, 0, 0);
  return oc;
}

function ctxDrawCurl(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  frontImg: HTMLImageElement | undefined,
  backImg: HTMLImageElement | undefined,
  frontIsLeft: boolean,
  backIsLeft: boolean,
  frontPageNum: number | undefined,
  backPageNum: number | undefined,
  wm1: string | null,
  wm2: string | null,
  progress: number,
  foldShadow: number,
  mirrorX: boolean,   // true for prev direction (left page curls right)
) {
  const R = W / Math.PI;
  const foldX = W * (1 - progress);
  const thetaMax = progress * Math.PI;
  const N = 60;

  const frontOCBase = new OffscreenCanvas(Math.ceil(W), Math.ceil(H));
  ctxDrawHalfPage(
    frontOCBase.getContext("2d") as OffscreenCanvasRenderingContext2D,
    W, H, frontImg, frontIsLeft, frontPageNum, wm1, wm2,
  );
  // When mirrorX is active the canvas has scale(-1,1), so pre-flip the OC
  // content so the double-flip restores the correct orientation.
  const frontOC = mirrorX ? hFlipCanvas(frontOCBase, W, H) : frontOCBase;

  const backOCBase = new OffscreenCanvas(Math.ceil(W), Math.ceil(H));
  ctxDrawHalfPage(
    backOCBase.getContext("2d") as OffscreenCanvasRenderingContext2D,
    W, H, backImg, backIsLeft, backPageNum, wm1, wm2,
  );
  const backOC = mirrorX ? hFlipCanvas(backOCBase, W, H) : backOCBase;

  // caller is responsible for clearRect and save/translate[/scale] before invoking this
  if (foldX > 0) {
    ctx.drawImage(frontOC, 0, 0, foldX, H, 0, 0, foldX, H);
  }

  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * thetaMax;
    const t1 = ((i + 1) / N) * thetaMax;
    const tMid = (t0 + t1) / 2;

    const x0s = foldX + R * Math.sin(t0);
    const x1s = foldX + R * Math.sin(t1);
    const screenLeft = Math.min(x0s, x1s);
    const scrnW = Math.abs(x1s - x0s);
    if (scrnW < 0.25) continue;

    if (tMid <= Math.PI / 2) {
      const srcX0 = foldX + (W - foldX) * (i / N);
      const srcW = (W - foldX) / N;
      if (srcW > 0) {
        ctx.drawImage(frontOC, srcX0, 0, srcW, H, screenLeft, 0, scrnW, H);
      }
    } else {
      const bSrc0 = W - ((t0 - Math.PI / 2) / (thetaMax - Math.PI / 2)) * (W - foldX);
      const bSrc1 = W - ((t1 - Math.PI / 2) / (thetaMax - Math.PI / 2)) * (W - foldX);
      const srcLeft = Math.min(bSrc0, bSrc1);
      const srcW = Math.abs(bSrc1 - bSrc0);
      if (srcW > 0) {
        ctx.drawImage(backOC, srcLeft, 0, srcW, H, screenLeft, 0, scrnW, H);
      }
    }

    const alpha = (1 - Math.abs(Math.cos(tMid))) * foldShadow * 0.55;
    if (alpha > 0.005) {
      ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
      ctx.fillRect(screenLeft, 0, scrnW, H);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function AlbumBook({
  photos, index, onClose, onIndexChange, folder,
}: {
  photos: DrivePhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  folder: "engagement" | "wedding";
}) {
  const [guestName, setGuestName] = useState<string>("");
  const [guestCity, setGuestCity] = useState<string>("");
  const openedAtRef = useRef<string>("");
  useEffect(() => {
    setGuestName(localStorage.getItem("guest_name") ?? "");
    setGuestCity(localStorage.getItem("guest_city") ?? "");
    openedAtRef.current = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      day: "numeric",
      month: "short",
    }).format(new Date());
  }, []);
  // Spread 0 = cover; spread k≥1 has photos[(k-1)*2] and photos[(k-1)*2+1]
  const totalSpreads = 1 + Math.ceil(photos.length / 2);

  const [spreadIndex, setSpreadIndex] = useState(() =>
    Math.min(Math.floor(index / 2) + 1, totalSpreads - 1)
  );
  // Ref so GSAP callbacks (closures) always read the latest spread without
  // triggering re-registration of the observer effect.
  const spreadIndexRef = useRef(spreadIndex);
  spreadIndexRef.current = spreadIndex;

  const [progress, setProgress]         = useState(0);
  const [dir, setDir]                   = useState<"next" | "prev">("next");
  const [busy, setBusy]                 = useState(false);
  const [isAnimating, setIsAnimating]   = useState(false);
  const [isMobile, setIsMobile]         = useState(false);
  const [isPortrait, setIsPortrait]     = useState(false);
  const [dismissedRotate, setDismissedRotate] = useState(false);

  const sceneRef      = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const imgCacheRef   = useRef<Map<string, HTMLImageElement>>(new Map());
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
    const blur = () => {
      if (sceneRef.current) sceneRef.current.style.filter = "blur(24px)";
    };
    const unblur = () => {
      if (sceneRef.current) sceneRef.current.style.filter = "";
    };
    const onVis = () => {
      if (document.hidden) {
        log("screenshot_attempt");
        blur();
      } else {
        unblur();
      }
    };
    // window blur fires on iOS when the screenshot UI appears (swipe gesture)
    // and on Android when the app switcher opens during screenshot
    const onBlur = () => { log("screenshot_attempt"); blur(); };
    const onFocus = () => { unblur(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSpreadPhotos = (si: number): [DrivePhoto | null, DrivePhoto | null] => {
    if (si <= 0) return [null, null];
    const base = (si - 1) * 2;
    return [photos[base] ?? null, photos[base + 1] ?? null];
  };

  const wmExtra = guestCity || undefined;                      // city — line 1
  const wmTime  = openedAtRef.current || undefined;            // IST open-time — line 2

  const renderSpread = (si: number) => {
    if (si <= 0) return <BookCover folder={folder} />;
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
        wmExtra={wmExtra}
        wmTime={wmTime}
      />
    );
  };

  const renderHalfPage = (si: number, side: "left" | "right") => {
    const isLeft = side === "left";
    if (si <= 0) return isLeft ? <BookCoverLeft /> : <BookCoverRight folder={folder} />;
    const [l, r] = getSpreadPhotos(si);
    const photo = isLeft ? l : r;
    const pn = isLeft ? (si - 1) * 2 + 1 : (si - 1) * 2 + 2;
    return (
      <BookPage
        photo={photo}
        isLeft={isLeft}
        pageNum={photo && pn <= photos.length ? pn : undefined}
        guestName={guestName || undefined}
        wmExtra={wmExtra}
        wmTime={wmTime}
        fullWidth
        noSpineShadow
      />
    );
  };

  const hasPrev = spreadIndex > 0;
  const hasNext = spreadIndex < totalSpreads - 1;

  // Preload photos for canvas (thumbnailUrl = /api/drive-image proxy, same-origin)
  useEffect(() => {
    const urls: string[] = [];
    for (let offset = -1; offset <= 2; offset++) {
      const [l, r] = getSpreadPhotos(spreadIndex + offset);
      [l, r].forEach(ph => { if (ph) urls.push(ph.thumbnailUrl); });
    }
    urls.forEach(url => {
      if (imgCacheRef.current.has(url)) return;
      const img = new window.Image();
      img.onload = () => imgCacheRef.current.set(url, img);
      img.onerror = () => imgCacheRef.current.set(url, img);
      img.src = url;
      imgCacheRef.current.set(url, img); // placeholder while loading
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadIndex]);

  // GSAP-driven animation — drives progress each frame so the canvas redraws smoothly.
  const animateTo = useCallback((onComplete: () => void) => {
    tweenRef.current?.kill();
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    proxy.current.value = 0;
    setProgress(0);
    setIsAnimating(true);
    tweenRef.current = gsap.to(proxy.current, {
      value: 1,
      duration: 0.72,
      ease: "power2.out",
      onUpdate() { setProgress(proxy.current.value); },
      onComplete() { tweenRef.current = null; onComplete(); },
    });
  }, []);

  const snapBack = useCallback((fromP: number) => {
    tweenRef.current?.kill();
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    proxy.current.value = fromP;
    setIsAnimating(true);
    tweenRef.current = gsap.to(proxy.current, {
      value: 0,
      duration: 0.32,
      ease: "power1.out",
      onUpdate() { setProgress(proxy.current.value); },
      onComplete() { tweenRef.current = null; setIsAnimating(false); setBusy(false); },
    });
  }, []);

  const goNext = useCallback(() => {
    if (busy || !hasNext) return;
    setBusy(true);
    setDir("next");
    dirRef.current = "next";
    animateTo(() => {
      const n = spreadIndexRef.current + 1;
      setSpreadIndex(n);
      setProgress(0);
      setIsAnimating(false);
      setBusy(false);
      // Defer cross-component setState to avoid concurrent-mode render warning
      setTimeout(() => onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2)), 0);
    });
  }, [busy, hasNext, animateTo, onIndexChange]);

  const goPrev = useCallback(() => {
    if (busy || !hasPrev) return;
    setBusy(true);
    setDir("prev");
    dirRef.current = "prev";
    animateTo(() => {
      const n = spreadIndexRef.current - 1;
      setSpreadIndex(n);
      setProgress(0);
      setIsAnimating(false);
      setBusy(false);
      setTimeout(() => onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2)), 0);
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
              const n = spreadIndexRef.current + 1;
              setSpreadIndex(n);
              setProgress(0); setIsAnimating(false); setBusy(false);
              setTimeout(() => onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2)), 0);
            });
          } else if (localDir === "prev" && hasPrev) {
            animateTo(() => {
              const n = spreadIndexRef.current - 1;
              setSpreadIndex(n);
              setProgress(0); setIsAnimating(false); setBusy(false);
              setTimeout(() => onIndexChange(n <= 0 ? 0 : Math.max(0, (n - 1) * 2)), 0);
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

  // Canvas cylinder-curl geometry
  const showLeaf = progress > 0.003 || isAnimating;
  const turningIsRight = dir === "next";
  const adjacentSpreadIndex = turningIsRight ? spreadIndex + 1 : spreadIndex - 1;
  // fold shadow peaks at 90° — drives cast shadow on the static layer underneath
  const foldShadow = Math.sin(progress * Math.PI);

  // Canvas draw effect — redraws at every progress tick (GSAP drives setProgress each frame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showLeaf) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;   // full book width
    const cssH = canvas.clientHeight;
    const halfW = cssW / 2;            // one page width
    if (cssW === 0 || cssH === 0) return;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width  = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const [l, r] = getSpreadPhotos(spreadIndex);
    const frontPhoto = turningIsRight ? r : l;
    const [al, ar] = getSpreadPhotos(adjacentSpreadIndex);
    const backPhoto  = turningIsRight ? al : ar;

    const frontImg = frontPhoto ? imgCacheRef.current.get(frontPhoto.thumbnailUrl) : undefined;
    const backImg  = backPhoto  ? imgCacheRef.current.get(backPhoto.thumbnailUrl)  : undefined;

    const frontIsLeft = !turningIsRight;
    const backIsLeft  =  turningIsRight;
    const frontPageNum = frontPhoto
      ? (spreadIndex - 1) * 2 + (turningIsRight ? 2 : 1) : undefined;
    const backPageNum  = backPhoto
      ? (adjacentSpreadIndex - 1) * 2 + (turningIsRight ? 1 : 2) : undefined;

    const wm1 = ["James & Sharon", guestName, wmExtra].filter(Boolean).join("  ·  ") || null;
    const wm2 = wmTime ?? null;

    // Two-phase full-spread turn so the page visually crosses the spine:
    //
    //  Phase 1 (progress 0→0.5, p1 0→1): turning page curls from outer edge inward to spine.
    //  Phase 2 (progress 0.5→1, p2 0→1): adjacent page uncurls from spine outward onto the
    //    opposite half, replacing what Layer 2 showed there.
    //
    // For NEXT (turningIsRight): Phase 1 on right half, Phase 2 on left half (mirrored).
    // For PREV (!turningIsRight): Phase 1 on left half (mirrored), Phase 2 on right half.

    const p1 = Math.min(progress * 2, 1);
    const p2 = Math.max(progress * 2 - 1, 0);

    // Phase 1 — turning page curls toward spine (suppressed once Phase 2 begins
    // to avoid a double-cylinder overlap at the spine centre)
    if (p1 > 0.003 && p2 < 0.003) {
      ctx.save();
      if (turningIsRight) {
        ctx.translate(halfW, 0);          // right half, no flip
      } else {
        ctx.translate(halfW, 0);
        ctx.scale(-1, 1);                 // left half, mirror so fold sweeps outer→spine
      }
      ctxDrawCurl(ctx, halfW, cssH,
        frontImg, undefined,              // cream paper back (next page revealed in Phase 2)
        frontIsLeft, false,
        frontPageNum, undefined,
        wm1, wm2,
        p1, Math.sin(p1 * Math.PI),
        !turningIsRight,
      );
      ctx.restore();
    }

    // Phase 2 — adjacent page uncurls from spine onto the opposite half
    if (p2 > 0.003) {
      const uncurlP = 1 - p2;            // 1→0: fully curled at spine → fully flat
      ctx.save();
      if (turningIsRight) {
        // Next left page unfurls in left half (mirrored)
        ctx.translate(halfW, 0);
        ctx.scale(-1, 1);
        ctxDrawCurl(ctx, halfW, cssH,
          backImg, undefined,
          backIsLeft, false,
          backPageNum, undefined,
          wm1, wm2,
          uncurlP, Math.sin(uncurlP * Math.PI),
          true,
        );
      } else {
        // Prev right page unfurls in right half (no mirror)
        ctx.translate(halfW, 0);
        ctxDrawCurl(ctx, halfW, cssH,
          backImg, undefined,
          backIsLeft, false,
          backPageNum, undefined,
          wm1, wm2,
          uncurlP, Math.sin(uncurlP * Math.PI),
          false,
        );
      }
      ctx.restore();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, showLeaf, spreadIndex, adjacentSpreadIndex, turningIsRight,
      foldShadow, guestName, wmExtra, wmTime]);

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

        {/* Book spread — no overflow:hidden so CSS preserve-3d works on the turning leaf */}
        <div
          ref={sceneRef}
          className="relative select-none"
          style={{
            width: "min(94vw, calc(88vh * 1.5))",
            aspectRatio: "3/2",
            borderRadius: "3px",
            boxShadow: "0 30px 90px rgba(0,0,0,0.75), 0 8px 30px rgba(0,0,0,0.5)",
            cursor: busy ? "grabbing" : "grab",
            touchAction: "none",
            perspective: "700px",
          }}
          onContextMenu={e => e.preventDefault()}
        >
          {!showLeaf ? (
            // Static state: full spread
            <div className="absolute inset-0">{renderSpread(spreadIndex)}</div>
          ) : (
            <>
              {/* Layer 1: target spread (full, underneath) */}
              <div className="absolute inset-0" style={{ zIndex: 0 }}>
                {renderSpread(adjacentSpreadIndex)}
              </div>

              {/* Cast shadow from turning page onto target spread — peaks at 90° */}
              <div className="absolute inset-0 pointer-events-none" style={{
                zIndex: 1,
                background: `rgba(0,0,0,${(foldShadow * 0.28).toFixed(3)})`,
              }} />

              {/* Layer 2: anchor — stationary half, with retreating edge shadow */}
              <div
                className="absolute inset-y-0"
                style={{
                  [turningIsRight ? "left" : "right"]: 0,
                  width: "50%",
                  zIndex: 2,
                }}
              >
                {renderHalfPage(spreadIndex, turningIsRight ? "left" : "right")}
                {/* Shadow near spine edge — fades as page turns away */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: turningIsRight
                    ? `linear-gradient(to left, rgba(0,0,0,${((1 - progress) * 0.14).toFixed(3)}) 0%, transparent 50%)`
                    : `linear-gradient(to right, rgba(0,0,0,${((1 - progress) * 0.14).toFixed(3)}) 0%, transparent 50%)`,
                }} />
              </div>

              {/* Layer 3: spine (always at centre, on top) */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 32, zIndex: 10, background: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.10) 100%)" }} />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 2, zIndex: 11, background: "linear-gradient(to bottom, #c9a84c55, #8b691455, #c9a84c55)" }} />

              {/* Layer 4: Canvas cylinder curl — full-width so the fold sweeps across the whole spread */}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 4,
                  pointerEvents: "none",
                  display: showLeaf ? "block" : "none",
                }}
              />
            </>
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

  // Set gallery_token cookie early so thumbnail img tags (which can't use custom
  // headers) pass the drive-image auth check as soon as the section mounts.
  useEffect(() => {
    const token = localStorage.getItem("session_token");
    if (token) {
      document.cookie = `gallery_token=${token}; path=/api/drive-image; SameSite=Strict; max-age=3600`;
    }
  }, []);

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
          folder={folder}
        />
      )}
    </section>
  );
}
