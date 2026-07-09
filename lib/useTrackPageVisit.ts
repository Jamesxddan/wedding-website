import { useEffect } from "react";
import { getOrCreateDeviceUUID, getBrowserSignalsHash } from "./fingerprint";

/**
 * Custom hook to track user page and phase visits.
 * It sends the page key to the server to update the activity/access logs.
 *
 * @param strPageKey The unique identifier/key of the page or phase being visited.
 */
export function useTrackPageVisit(strPageKey: string | null) {
  useEffect(() => {
    if (!strPageKey) return;

    async function logVisit() {
      try {
        const device_uuid = await getOrCreateDeviceUUID();
        const browser_signals_hash = await getBrowserSignalsHash();

        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_uuid, browser_signals_hash, page: strPageKey }),
        });
      } catch {
        // Silent catch for network issues or non-production environment
      }
    }

    logVisit();
  }, [strPageKey]);
}
