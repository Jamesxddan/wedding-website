import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = scryptSync(password, salt, 64);
    return timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}

export interface AdminSession {
  adminId: string;
  email: string;
  isSuper: boolean;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get("admin_session")?.value;
  if (!token) return null;

  const { data } = await supabase
    .from("admin_sessions")
    .select("admin_id, admins(email, is_super)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return null;
  const admin = (data.admins as unknown) as { email: string; is_super: boolean } | null;
  if (!admin) return null;

  return { adminId: data.admin_id as string, email: admin.email, isSuper: admin.is_super };
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function isSuperAdmin(): Promise<boolean> {
  return (await getAdminSession())?.isSuper === true;
}
