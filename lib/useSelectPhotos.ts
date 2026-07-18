"use client";

import { useState, useEffect } from "react";
import type { DrivePhoto, DriveAlbum } from "./drive";

export interface SelectPhotos {
  sub: DrivePhoto[];
  main: DrivePhoto[];
  loading: boolean;
}

function byName(photos: DrivePhoto[], name: string): DrivePhoto | undefined {
  return photos.find(p => p.name.toLowerCase() === name.toLowerCase());
}

export function useSelectPhotos(): SelectPhotos & {
  byName: (album: "sub" | "main", name: string) => DrivePhoto | undefined;
} {
  const [state, setState] = useState<SelectPhotos>({ sub: [], main: [], loading: true });

  useEffect(() => {
    fetch("/api/select-photos")
      .then(r => (r.ok ? r.json() : { albums: [] }))
      .then((data: { albums: DriveAlbum[] }) => {
        const sub = data.albums?.find(a => a.name.toLowerCase() === "sub")?.photos ?? [];
        const main = data.albums?.find(a => a.name.toLowerCase() === "main")?.photos ?? [];
        setState({ sub, main, loading: false });
      })
      .catch(() => setState(prev => ({ ...prev, loading: false })));
  }, []);

  return {
    ...state,
    byName: (album, name) => byName(album === "sub" ? state.sub : state.main, name),
  };
}
