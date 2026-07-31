// Shared helpers for admin scripts: parse .env.local and talk to the Supabase REST API.

import { readFileSync } from "fs";

export function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=][^=]*)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    throw new Error("Could not read .env.local — run from the project root.");
  }
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local");
  return { url, key, env };
}

export function supabaseREST({ url, key }) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    // Avoid undici keep-alive handle tripping a libuv assertion on Windows exit
    Connection: "close",
  };
  // Supabase can return 204/empty bodies on write; swallow those.
  async function parseBody(res) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return {
    async get(path) {
      const res = await fetch(`${url}/rest/v1${path}`, { headers });
      if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`);
      return res.json();
    },
    async post(path, body) {
      const res = await fetch(`${url}/rest/v1${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`POST ${path} -> ${res.status}: ${await res.text()}`);
      return parseBody(res);
    },
    async patch(path, body) {
      const res = await fetch(`${url}/rest/v1${path}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status}: ${await res.text()}`);
      return parseBody(res);
    },
    async del(path) {
      const res = await fetch(`${url}/rest/v1${path}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`DELETE ${path} -> ${res.status}: ${await res.text()}`);
      return parseBody(res);
    },
    async close() {
      // Drain any remaining work so Node exits cleanly on Windows.
      await new Promise((r) => setTimeout(r, 50));
    },
  };
}
