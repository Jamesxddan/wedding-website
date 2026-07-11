"use client";

import { useState, useEffect, useCallback } from "react";
import { getOrCreateDeviceUUID } from "@/lib/fingerprint";

interface Photo {
  path: string;
  name: string;
  url: string;
}

interface Props {
  album?: string;
}

async function trackEvent(event_type: string, metadata?: Record<string, string>) {
  try {
    const device_uuid = await getOrCreateDeviceUUID();
    await fetch("/api/gallery-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_uuid, event_type, metadata }),
    });
  } catch {
    // silent — tracking must never block the UI
  }
}

export default function PhotoGallery({ album = "wedding" }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const res = await fetch(`/api/photos?album=${encodeURIComponent(album)}`, {
        headers: { "x-device-uuid": device_uuid },
      });
      if (res.status === 401) {
        setError("Please register to view photos.");
        return;
      }
      if (!res.ok) {
        setError("Could not load photos.");
        return;
      }
      setPhotos(await res.json());
    } catch {
      setError("Could not load photos.");
    } finally {
      setLoading(false);
    }
  }, [album]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  async function handleDownload(photo: Photo) {
    trackEvent("photo_download", { photo: photo.name, album });
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = photo.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  async function handleShare(photo: Photo) {
    trackEvent("photo_share", { photo: photo.name, album });
    if (navigator.share) {
      try {
        await navigator.share({ url: photo.url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(photo.url).catch(() => {});
  }

  function openLightbox(photo: Photo) {
    trackEvent("photo_view", { photo: photo.name, album });
    setLightbox(photo);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
        <div style={{ color: "rgba(212,175,55,0.6)", fontSize: 13, letterSpacing: 2 }}>
          Loading photos…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: 14 }}>
        {error}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: 14 }}>
        Photos will appear here soon.
      </div>
    );
  }

  return (
    <>
      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {photos.map((photo) => (
          <div
            key={photo.path}
            style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#111", aspectRatio: "1", cursor: "pointer" }}
            onClick={() => openLightbox(photo)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.name}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.3s" }}
            />
            {/* Hover overlay */}
            <div
              className="photo-hover"
              style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)",
                opacity: 0, transition: "opacity 0.2s",
                display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
                padding: 10, gap: 8,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleDownload(photo)}
                title="Download"
                style={iconBtn}
              >
                ↓
              </button>
              <button
                onClick={() => handleShare(photo)}
                title="Share"
                style={iconBtn}
              >
                ↗
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 28, cursor: "pointer" }}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.name}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8 }}
          />
          <div
            style={{ position: "absolute", bottom: 24, display: "flex", gap: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleDownload(lightbox)}
              style={{ ...pillBtn, background: "rgba(255,255,255,0.12)" }}
            >
              ↓ Download
            </button>
            <button
              onClick={() => handleShare(lightbox)}
              style={{ ...pillBtn, background: "rgba(255,255,255,0.12)" }}
            >
              ↗ Share
            </button>
          </div>
        </div>
      )}

      <style>{`
        .photo-hover { opacity: 0; }
        div:hover > .photo-hover { opacity: 1; }
      `}</style>
    </>
  );
}

const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: "50%",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.3)",
  color: "#fff", fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(4px)",
};

const pillBtn: React.CSSProperties = {
  padding: "8px 20px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.3)",
  color: "#fff", fontSize: 13, cursor: "pointer", backdropFilter: "blur(8px)",
};
