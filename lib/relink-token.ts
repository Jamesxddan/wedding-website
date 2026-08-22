import { SignJWT, jwtVerify } from "jose";

const RELINK_TOKEN_SECRET = new TextEncoder().encode(
  process.env.RELINK_TOKEN_SECRET ?? "dev-secret-change-in-production"
);

export interface RelinkTokenPayload {
  device_uuid: string;
  guest_id: string;
  nonce: string;
  exp: number;
  iat: number;
}

export async function generateRelinkToken(payload: {
  device_uuid: string;
  guest_id: string;
}): Promise<string> {
  const nonce = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15 * 60; // 15 minutes

  const token = await new SignJWT({
    device_uuid: payload.device_uuid,
    guest_id: payload.guest_id,
    nonce,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(RELINK_TOKEN_SECRET);

  return token;
}

export async function verifyRelinkToken(token: string): Promise<{
  valid: boolean;
  payload?: RelinkTokenPayload;
}> {
  try {
    const { payload } = await jwtVerify(token, RELINK_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });
    return { valid: true, payload: payload as unknown as RelinkTokenPayload };
  } catch {
    return { valid: false };
  }
}