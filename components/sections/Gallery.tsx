"use client";

import { useEffect, useState, useCallback } from "react";
import type { DrivePhoto, DriveAlbum } from "@/lib/drive";
import Reveal from "@/components/ui/Reveal";

interface Props {
  folder: "engagement" | "wedding";
  title?: string;
}

interface GalleryState {
  albums: DriveAlbum[];
  configured: boolean;
  loading: boolean;
  error: boolean;
}

const PAGE_SIZE = 30;

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
          {/* Shimmer placeholder */}
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

function PhotoTile({ photo, onClick }: { photo: DrivePhoto; onClick: () => void }) {
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
  // Round-robin distribution keeps columns balanced regardless of photo count
  const columns = Array.from({ length: numCols }, (_, col) =>
    photos.filter((_, i) => i % numCols === col)
  );
  return (
    <div className="flex gap-3">
      {columns.map((colPhotos, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col min-w-0">
          {colPhotos.map((photo) => (
            <PhotoTile key={photo.id} photo={photo} onClick={() => onPhotoClick(photo)} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Gallery({ folder, title = "Gallery" }: Props) {
  const [state, setState] = useState<GalleryState>({
    albums: [],
    configured: false,
    loading: true,
    error: false,
  });
  const [openAlbum, setOpenAlbum] = useState<DriveAlbum | null>(null);
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState<DrivePhoto | null>(null);

  useEffect(() => {
    const sessionToken = localStorage.getItem("session_token");
    const headers: HeadersInit = sessionToken ? { "x-session-token": sessionToken } : {};
    fetch(`/api/drive-photos?folder=${folder}&view=albums`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setState({
          albums: data.albums ?? [],
          configured: data.configured ?? false,
          loading: false,
          error: !!data.error,
        });
      })
      .catch(() => setState((s) => ({ ...s, loading: false, error: true })));
  }, [folder]);

  // Reset page when album changes
  useEffect(() => { setPage(1); }, [openAlbum]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (lightbox) closeLightbox();
        else if (openAlbum) setOpenAlbum(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, openAlbum, closeLightbox]);

  const visiblePhotos = openAlbum?.photos.slice(0, page * PAGE_SIZE) ?? [];
  const hasMore = openAlbum ? openAlbum.photos.length > page * PAGE_SIZE : false;

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

      {/* Album folder cards */}
      {!state.loading && !openAlbum && state.albums.length > 0 && (
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

      {/* Open album */}
      {!state.loading && openAlbum && (
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

          {/* Masonry photo grid — JS columns for proper bottom alignment */}
          <MasonryGrid photos={visiblePhotos} onPhotoClick={setLightbox} />

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-8 py-3 rounded-full border border-deep-rose text-deep-rose font-heading text-sm tracking-widest uppercase hover:bg-blush/20 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            aria-label="Close"
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-colors"
          >×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.fullUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
