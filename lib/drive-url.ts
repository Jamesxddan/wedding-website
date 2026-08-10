// Accepts a pasted Google Drive folder share link (or a bare folder ID) and
// returns just the folder ID, or null if nothing recognizable was found.
export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // https://drive.google.com/drive/folders/<ID>?usp=sharing
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (folderMatch) return folderMatch[1];

  // https://drive.google.com/drive/u/0/folders/<ID>
  const uMatch = trimmed.match(/\/u\/\d+\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (uMatch) return uMatch[1];

  // ?id=<ID> query param form
  try {
    const url = new URL(trimmed);
    const idParam = url.searchParams.get("id");
    if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) return idParam;
  } catch {
    // not a URL — fall through to bare-ID check
  }

  // Bare folder ID pasted directly
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  return null;
}
