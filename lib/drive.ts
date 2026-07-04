export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailUrl: string;
  heroUrl: string;
  fullUrl: string;
  album?: string;
}

export interface DriveAlbum {
  id: string;
  name: string;
  photos: DrivePhoto[];
}

const DRIVE_API = "https://www.googleapis.com/drive/v3";

async function listFolderContents(
  folderId: string,
  apiKey: string
): Promise<{ id: string; name: string; mimeType: string }[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    pageSize: "200",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    key: apiKey,
  });
  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  const data = (await res.json()) as {
    files: { id: string; name: string; mimeType: string }[];
  };
  return data.files ?? [];
}

function toPhoto(f: { id: string; name: string; mimeType: string }, album?: string): DrivePhoto {
  return {
    id: f.id,
    name: f.name,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
    heroUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w1600`,
    fullUrl: `https://drive.google.com/uc?export=view&id=${f.id}`,
    album,
  };
}

// Returns flat list of all images (for hero slideshow)
export async function fetchDrivePhotos(
  folderId: string,
  apiKey: string
): Promise<DrivePhoto[]> {
  return collectAllImages(folderId, apiKey, "");
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
