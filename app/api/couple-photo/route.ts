import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const FILE_ID = "1z7-BU48PH0aNzODD6mG4CkSFK_EaSJog";

function signFileId(fileId: string): string {
  const secret = process.env.DRIVE_TOKEN_SECRET;
  if (!secret) return fileId;
  const sig = createHmac("sha256", secret).update(fileId).digest("hex").slice(0, 24);
  return Buffer.from(`${fileId}.${sig}`).toString("base64url");
}

export async function GET(req: NextRequest) {
  const sz = req.nextUrl.searchParams.get("sz") ?? "1600";
  const token = signFileId(FILE_ID);
  return NextResponse.redirect(new URL(`/api/drive-image?id=${token}&sz=${sz}`, req.url));
}
