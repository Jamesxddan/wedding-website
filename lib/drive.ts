export interface DrivePhoto {
  id: string;
  name: string;
  thumbnailUrl: string;
  fullUrl: string;
}

const DRIVE_API = "https://www.googleapis.com/drive/v3";

export async function fetchDrivePhotos(folderId: string, apiKey: string): Promise<DrivePhoto[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: "files(id,name)",
    pageSize: "100",
    key: apiKey,
  });

  const res = await fetch(`${DRIVE_API}/files?${params}`, { next: { revalidate: 300 } });

  if (!res.ok) {
    throw new Error(`Drive API error: ${res.status}`);
  }

  const data = (await res.json()) as { files: { id: string; name: string }[] };

  return (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
    fullUrl: `https://drive.google.com/uc?export=view&id=${f.id}`,
  }));
}
