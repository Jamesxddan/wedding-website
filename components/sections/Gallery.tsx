"use client";

import { useEffect, useState, useCallback } from "react";
import type { DrivePhoto } from "@/lib/drive";

interface Props {
  folder: "engagement" | "wedding";
  title?: string;
}

interface GalleryState {
  photos: DrivePhoto[];
  configured: boolean;
  loading: boolean;
  error: boolean;
}

export default function Gallery({ folder, title = "Gallery" }: Props) {
  const [state, setState] = useState<GalleryState>({
    photos: [],
    configured: false,
    loading: true,
    error: false,
  });
  const [lightbox, setLightbox] = useState<DrivePhoto | null>(null);

  useEffect(() => {
    fetch(`/api/drive-photos?folder=${folder}`)
      .then((r) => r.json())
      .then((data) => {
        setState({
          photos: data.photos ?? [],
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
      if (e.key === "Escape") closeLightbox();
    }
    if (lightbox) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox]);

  return (
    <section id="gallery" className="py-24 px-6 max-w-6xl mx-auto">
      <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
        {title}
      </h2>
      <p className="font-script italic text-sage text-center text-xl mb-12">
        Moments we treasure
      </p>

      {state.loading && (
        <div className="flex justify-center py-16">
          <span className="font-script italic text-deep-rose/60 text-lg animate-pulse">
            Loading photos…
          </span>
        </div>
      )}

      {!state.loading && !state.configured && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-blush/40 flex items-center justify-center text-4xl">
            🌸
          </div>
          <p className="font-heading text-deep-rose text-xl">Photos coming soon</p>
          <p className="font-body text-deep-rose/60 text-sm max-w-xs">
            Our engagement gallery will appear here once the photos are uploaded.
          </p>
        </div>
      )}

      {!state.loading && state.configured && state.error && (
        <div className="flex justify-center py-16">
          <p className="font-body text-deep-rose/60 text-sm">
            Could not load photos right now. Please try again later.
          </p>
        </div>
      )}

      {!state.loading && state.photos.length > 0 && (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {state.photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightbox(photo)}
              className="block w-full break-inside-avoid rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blush"
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
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            aria-label="Close"
            className="absolute top-4 right-4 text-white text-3xl font-body leading-none hover:opacity-70"
          >
            ×
          </button>
          <img
            src={lightbox.fullUrl}
            alt={lightbox.name}
            className="max-h-[90vh] max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
