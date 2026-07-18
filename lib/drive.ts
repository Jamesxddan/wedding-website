import { createHmac } from "crypto";

// Encode Drive file ID as an opaque HMAC-signed token so raw IDs are never
// sent to the browser. The drive-image route verifies the signature before fetching.
function signFileId(fileId: string): string {
  const secret = process.env.DRIVE_TOKEN_SECRET;
  if (!secret) return fileId; // dev fallback: no secret set
  const sig = createHmac("sha256", secret).update(fileId).digest("hex").slice(0, 24);
  return Buffer.from(`${fileId}.${sig}`).toString("base64url");
}

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

// In-memory cache for Drive API responses — avoids hammering the quota when
// multiple components (hero + gallery) fetch simultaneously on the same server process.
const driveCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = driveCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  const data = await fn();
  driveCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

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
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const url = `${DRIVE_API}/files?${params}`;
  const headers = { Referer: `${origin}/` };

  // Retry up to 3 times with exponential backoff — Drive API occasionally returns
  // transient 500s when cache is cold (e.g. after a server restart).
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1)));
    const res = await fetch(url, { headers, cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { files: DriveFile[] };
      return data.files ?? [];
    }
    if (attempt === 2 || res.status !== 500) {
      const body = await res.text();
      throw new Error(`Drive API error: ${res.status} — ${body}`);
    }
  }
  throw new Error("Drive API: max retries exceeded");
}

function toPhoto(f: DriveFile, album?: string): DrivePhoto {
  const w = f.imageMediaMetadata?.width ?? 0;
  const h = f.imageMediaMetadata?.height ?? 0;
  const token = signFileId(f.id);
  return {
    id: token,
    name: f.name,
    thumbnailUrl: `/api/drive-image?id=${token}&sz=600`,
    heroUrl: `/api/drive-image?id=${token}&sz=1600`,
    fullUrl: `/api/drive-image?id=${token}&sz=2400`,
    album,
    landscape: w > 0 && h > 0 ? w >= h : undefined,
  };
}

// Returns flat list of all images for hero slideshow — landscape photos first
export async function fetchDrivePhotos(
  folderId: string,
  apiKey: string
): Promise<DrivePhoto[]> {
  return withCache(`photos:${folderId}`, async () => {
    const photos = await collectAllImages(folderId, apiKey, "");
    return [
      ...photos.filter((p) => p.landscape === true),
      ...photos.filter((p) => p.landscape === false),
      ...photos.filter((p) => p.landscape === undefined),
    ];
  });
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
  return withCache(`albums:${folderId}`, async () => {
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
  });
}
