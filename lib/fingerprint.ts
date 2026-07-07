"use client";

const IDB_NAME = "wedding_fp";
const IDB_STORE = "kv";
const IDB_KEY = "device_uuid";
const COOKIE_NAME = "device_uuid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getOrCreateDeviceUUID(): Promise<string> {
  let uuid = localStorage.getItem("device_uuid");
  if (uuid) { _syncAll(uuid); return uuid; }

  uuid = _getCookie(COOKIE_NAME);
  if (uuid) { _syncAll(uuid); return uuid; }

  uuid = await _getFromIDB();
  if (uuid) { _syncAll(uuid); return uuid; }

  uuid = crypto.randomUUID();
  _syncAll(uuid);
  return uuid;
}

export async function getBrowserSignalsHash(): Promise<string> {
  const signals = [
    navigator.userAgent,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(screen.width),
    String(screen.height),
  ].join("|");
  const data = new TextEncoder().encode(signals);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function _syncAll(uuid: string): void {
  try { localStorage.setItem("device_uuid", uuid); } catch {}
  try {
    document.cookie = `${COOKIE_NAME}=${uuid}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {}
  _saveToIDB(uuid);
}

function _getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function _openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function _getFromIDB(): Promise<string | null> {
  try {
    const db = await _openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

function _saveToIDB(uuid: string): void {
  _openIDB().then((db) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(uuid, IDB_KEY);
  }).catch(() => {});
}
