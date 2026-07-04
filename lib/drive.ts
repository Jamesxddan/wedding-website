export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailUrl: string;
  heroUrl: string;
  fullUrl: string;
  album?: string;
  landscape?: boolean;
}

export interface DriveAlbum {
  id: string;
  name: string;
  photos: DrivePhoto[];
}

const DRIVE_API = "https://www.googleapis.com/drive/v3";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  imageMediaMetadata?: { width?: number; height?: number };
};

async function listFolderContents(
  folderId: string,
  apiKey: string
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,thumbnailLink,imageMediaMetadata(width,height))",
    pageSize: "200",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    key: apiKey,
  });
  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API error: ${res.status} — ${body}`);
  }
  const data = (await res.json()) as { files: DriveFile[] };
  return data.files ?? [];
}

function toPhoto(f: DriveFile, album?: string): DrivePhoto {
  const w = f.imageMediaMetadata?.width ?? 0;
  const h = f.imageMediaMetadata?.height ?? 0;
  return {
    id: f.id,
    name: f.name,
    thumbnailUrl: `/api/drive-image?id=${f.id}&sz=600`,
    heroUrl: `/api/drive-image?id=${f.id}&sz=1600`,
    fullUrl: `/api/drive-image?id=${f.id}&sz=2400`,
    album,
    landscape: w > 0 && h > 0 ? w >= h : undefined,
  };
}

// Returns flat list of all images for hero slideshow — landscape photos first
export async function fetchDrivePhotos(
  folderId: string,
  apiKey: string
): Promise<DrivePhoto[]> {
  const photos = await collectAllImages(folderId, apiKey, "");
  // Put landscape photos first, then portrait, then unknown
  return [
    ...photos.filter((p) => p.landscape === true),
    ...photos.filter((p) => p.landscape === false),
    ...photos.filter((p) => p.landscape === undefined),
  ];
}

// Recursively collect all images within a folder (for album contents)
async function collectAllImages(
  folderId: string,
  apiKey: string,
  albumName: string,
  depth = 0
): Promise<DrivePhoto[]> {
  if (depth > 3) return [];
  const files = await listFolderContents(folderId, apiKey);
  const photos: DrivePhoto[] = [];
  for (const f of files) {
    if (f.mimeType === "application/vnd.google-apps.folder") {
      const sub = await collectAllImages(f.id, apiKey, albumName, depth + 1);
      photos.push(...sub);
    } else if (f.mimeType?.startsWith("image/")) {
      photos.push(toPhoto(f, albumName));
    }
  }
  return photos;
}

// Returns photos grouped into albums by top-level subfolder
export async function fetchDriveAlbums(
  folderId: string,
  apiKey: string
): Promise<{ albums: DriveAlbum[]; flat: DrivePhoto[] }> {
  const files = await listFolderContents(folderId, apiKey);

  const albums: DriveAlbum[] = [];
  const topLevelPhotos: DrivePhoto[] = [];

  for (const f of files) {
    if (f.mimeType === "application/vnd.google-apps.folder") {
      const photos = await collectAllImages(f.id, apiKey, f.name);
      if (photos.length > 0) {
        albums.push({ id: f.id, name: f.name, photos });
      }
    } else if (f.mimeType?.startsWith("image/")) {
      topLevelPhotos.push(toPhoto(f));
    }
  }

  if (topLevelPhotos.length > 0) {
    albums.unshift({ id: folderId, name: "All", photos: topLevelPhotos });
  }

  const flat = albums.flatMap((a) => a.photos);
  return { albums, flat };
}
