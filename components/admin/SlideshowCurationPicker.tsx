"use client";

import { useEffect, useState } from "react";

interface Photo {
  id: string;
  name: string;
  thumbnailUrl: string;
}

const MAX_PICKS = 5;

function DeviceColumn({
  device, label, initialIds,
}: {
  device: "mobile" | "desktop";
  label: string;
  initialIds: string[];
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string[]>(initialIds);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/slideshow-photos?device=${device}`)
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((d: { photos?: Photo[] }) => setPhotos(d.photos ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [device]);

  function toggle(id: string) {
    setSaved(false);
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PICKS) return prev; // cap reached — ignore
      return [...prev, id];
    });
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: device === "mobile" ? "slideshow_mobile_ids" : "slideshow_desktop_ids",
        value: picked.join(","),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function clearPicks() {
    setPicked([]);
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: device === "mobile" ? "slideshow_mobile_ids" : "slideshow_desktop_ids", value: "" }),
    });
    setSaving(false);
  }

  return (
    <div style={{ flex: "1 1 260px", minWidth: 240 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#333" }}>{label}</p>
        <span style={{ fontSize: 11, color: picked.length >= MAX_PICKS ? "#8B4A6B" : "#999" }}>
          {picked.length} / {MAX_PICKS}
        </span>
      </div>

      {loading && <p style={{ fontSize: 12, color: "#999" }}>Loading photos…</p>}
      {!loading && photos.length === 0 && <p style={{ fontSize: 12, color: "#999" }}>No photos found in this folder.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 6, maxHeight: 260, overflowY: "auto", padding: 4 }}>
        {photos.map((p) => {
          const isPicked = picked.includes(p.id);
          const disabled = !isPicked && picked.length >= MAX_PICKS;
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={disabled}
              title={p.name}
              style={{
                position: "relative", padding: 0, border: "none", cursor: disabled ? "not-allowed" : "pointer",
                borderRadius: 8, overflow: "hidden", aspectRatio: "1 / 1",
                outline: isPicked ? "3px solid #8B4A6B" : "1px solid #e5ddd3",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <img src={p.thumbnailUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {isPicked && (
                <span style={{
                  position: "absolute", top: 3, right: 3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#8B4A6B", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {picked.indexOf(p.id) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: saved ? "#4caf50" : "#8B4A6B", color: "#fff", fontSize: 12, fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save selection"}
        </button>
        {picked.length > 0 && (
          <button
            onClick={clearPicks}
            disabled={saving}
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #ddd", background: "transparent", color: "#888", fontSize: 12, cursor: "pointer" }}
          >
            Clear (use auto)
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  initialMobileIds: string[];
  initialDesktopIds: string[];
}

export default function SlideshowCurationPicker({ initialMobileIds, initialDesktopIds }: Props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <DeviceColumn device="mobile" label="📱 Mobile (portrait)" initialIds={initialMobileIds} />
      <DeviceColumn device="desktop" label="🖥️ Desktop (landscape)" initialIds={initialDesktopIds} />
    </div>
  );
}
