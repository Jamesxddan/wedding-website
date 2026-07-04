export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailUrl: string;
  heroUrl: string;
  fullUrl: string;
}

const DRIVE_API = "https://www.googleapis.com/drive/v3";

async function listFolder(
  folderId: string,
  apiKey: string,
  depth = 0
): Promise<DrivePhoto[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    pageSize: "100",
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

  const files = data.files ?? [];
  const photos: DrivePhoto[] = [];

  for (const f of files) {
    if (f.mimeType === "application/vnd.google-apps.folder" && depth < 2) {
      // Recurse into subfolder
      const sub = await listFolder(f.id, apiKey, depth + 1);
      photos.push(...sub);
    } else if (f.mimeType?.startsWith("image/")) {
      photos.push({
        id: f.id,
        name: f.name,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
        heroUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w1600`,
        fullUrl: `https://drive.google.com/uc?export=view&id=${f.id}`,
      });
    }
  }

  return photos;
}

export async function fetchDrivePhotos(
  folderId: string,
  apiKey: string
): Promise<DrivePhoto[]> {
  return listFolder(folderId, apiKey);
}
