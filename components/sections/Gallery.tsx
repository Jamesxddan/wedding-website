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

function AlbumCard({ album, onClick }: { album: DriveAlbum; onClick: () => void }) {
  const cover = album.photos[0];
  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-blush aspect-[4/3] w-full"
      aria-label={`Open ${album.name} album`}
    >
      {cover && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={cover.thumbnailUrl}
          alt={album.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
        <p className="font-heading text-white text-xl md:text-2xl leading-tight">{album.name}</p>
        <p className="font-body text-white/60 text-xs tracking-widest uppercase mt-1">
          {album.photos.length} photos
        </p>
      </div>
      {/* Arrow */}
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
          <path d="M5 2l5 5-5 5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

function PhotoGrid({
  photos,
  onPhotoClick,
}: {
  photos: DrivePhoto[];
  onPhotoClick: (p: DrivePhoto) => void;
}) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick(photo)}
          className="block w-full break-inside-avoid rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blush"
          aria-label={`View ${photo.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbnailUrl}
            alt={photo.name}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </button>
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
  const [lightbox, setLightbox] = useState<DrivePhoto | null>(null);

  useEffect(() => {
    fetch(`/api/drive-photos?folder=${folder}&view=albums`)
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

  const subtitle = folder === "engagement"
    ? "Moments before forever"
    : "Moments we treasure";

  return (
    <section id="gallery" className="py-24 px-6 max-w-6xl mx-auto">
      <Reveal>
        <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
          {title}
        </h2>
        <p className="font-script italic text-sage text-center text-xl mb-12">
          {subtitle}
        </p>
      </Reveal>

      {/* Loading */}
      {state.loading && (
        <div className="flex justify-center py-16">
          <span className="font-script italic text-deep-rose/60 text-lg animate-pulse">
            Loading photos…
          </span>
        </div>
      )}

      {/* Not configured */}
      {!state.loading && !state.configured && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-blush/40 flex items-center justify-center text-4xl">
            🌸
          </div>
          <p className="font-heading text-deep-rose text-xl">Photos coming soon</p>
          <p className="font-body text-deep-rose/60 text-sm max-w-xs">
            Our gallery will appear here once the photos are uploaded.
          </p>
        </div>
      )}

      {/* Error */}
      {!state.loading && state.configured && state.error && (
        <div className="flex justify-center py-16">
          <p className="font-body text-deep-rose/60 text-sm">
            Could not load photos right now. Please try again later.
          </p>
        </div>
      )}

      {/* Album folder view */}
      {!state.loading && !openAlbum && state.albums.length > 0 && (
        <Reveal delay={150}>
          <div
            className={`grid gap-6 ${
              state.albums.length === 1
                ? "grid-cols-1 max-w-md mx-auto"
                : state.albums.length === 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {state.albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => setOpenAlbum(album)}
              />
            ))}
          </div>
        </Reveal>
      )}

      {/* Open album — photo grid */}
      {!state.loading && openAlbum && (
        <div>
          {/* Back button + album title */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setOpenAlbum(null)}
              className="flex items-center gap-2 font-body text-sm text-deep-rose/70 hover:text-deep-rose transition-colors tracking-widest uppercase"
              aria-label="Back to albums"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              All Albums
            </button>
            <span className="text-champagne">·</span>
            <span className="font-heading text-deep-rose text-lg">{openAlbum.name}</span>
            <span className="font-body text-deep-rose/40 text-xs tracking-widest uppercase">
              {openAlbum.photos.length} photos
            </span>
          </div>
          <PhotoGrid
            photos={openAlbum.photos}
            onPhotoClick={setLightbox}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            aria-label="Close"
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-colors"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.fullUrl}
            alt={lightbox.name}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
