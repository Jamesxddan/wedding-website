"use client";

import { useState, useEffect, useRef } from "react";
import { getPhase, Phase } from "./phase";

export interface PhaseState {
  phase: Phase;
  guestName: string | null;
  guestCity: string | null;
  isLoading: boolean;
  sessionRestored: boolean;
  refresh: () => void;
}

export function usePhase(): PhaseState {
  const [state, setState] = useState<Omit<PhaseState, "refresh">>({
    phase: Phase.FIRST_VISIT,
    guestName: null,
    guestCity: null,
    isLoading: true,
    sessionRestored: false,
  });
  const [tick, setTick] = useState(0);
  const sessionChecked = useRef(false);
  const dbOverride = useRef<Phase | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("guest_name");
    const city = localStorage.getItem("guest_city");
    const invitationSeen = localStorage.getItem("invitation_seen") === "true";

    const devOverride = localStorage.getItem("dev_phase");
    const localOverride =
      devOverride && Object.values(Phase).includes(devOverride as Phase)
        ? (devOverride as Phase)
        : null;

    setState((prev) => ({
      ...prev,
      phase: localOverride ?? dbOverride.current ?? getPhase(name, new Date(), invitationSeen),
      guestName: name,
      guestCity: city,
      isLoading: false,
    }));

    if (!localOverride) {
      fetch("/api/settings")
        .then((r) => (r.ok ? r.json() : {}))
        .then((settings: Record<string, string>) => {
          const raw = settings.phase_override;
          if (raw && raw !== "auto" && Object.values(Phase).includes(raw as Phase)) {
            dbOverride.current = raw as Phase;
            setState((prev) => {
              // Never lock a guest who already has a valid session onto FIRST_VISIT —
              // that would trap them on the registration form forever after registering.
              if (raw === Phase.FIRST_VISIT && prev.guestName) return prev;
              return { ...prev, phase: raw as Phase };
            });
          } else {
            dbOverride.current = null;
          }
        })
        .catch(() => {});
    }

    if (!sessionChecked.current) {
      sessionChecked.current = true;
      _runSessionCheck(setState, dbOverride);
    }
  }, [tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}

async function _runSessionCheck(
  setState: React.Dispatch<React.SetStateAction<Omit<PhaseState, "refresh">>>,
  dbOverride: React.MutableRefObject<Phase | null>
): Promise<void> {
  try {
    const { getOrCreateDeviceUUID, getBrowserSignalsHash } = await import("./fingerprint");
    const device_uuid = await getOrCreateDeviceUUID();
    const browser_signals_hash = await getBrowserSignalsHash();

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_uuid, browser_signals_hash, user_agent: navigator.userAgent }),
    });

    if (!res.ok) return;
    const data = (await res.json()) as {
      status: string;
      name?: string;
      city?: string;
      invitation_seen?: boolean;
      session_token?: string;
    };

    // Session gone from DB — guest was deleted or factory reset.
    // Clear all cached data so they register fresh as a new device.
    if (data.status === "new") {
      localStorage.removeItem("session_token");
      localStorage.removeItem("guest_name");
      localStorage.removeItem("guest_city");
      localStorage.removeItem("invitation_seen");
      setState((prev) => ({
        ...prev,
        phase: Phase.FIRST_VISIT,
        guestName: null,
        guestCity: null,
        sessionRestored: false,
      }));
      return;
    }

    if (data.status !== "known" || !data.name) return;

    localStorage.setItem("guest_name", data.name);
    if (data.city) localStorage.setItem("guest_city", data.city);
    if (data.invitation_seen) localStorage.setItem("invitation_seen", "true");
    if (data.session_token) localStorage.setItem("session_token", data.session_token);

    const devOverride = localStorage.getItem("dev_phase");
    const localOverride =
      devOverride && Object.values(Phase).includes(devOverride as Phase)
        ? (devOverride as Phase)
        : null;

    // Once the guest has a valid session, FIRST_VISIT override no longer applies —
    // use the natural computed phase so they aren't trapped after registering.
    const effectiveDbOverride =
      dbOverride.current === Phase.FIRST_VISIT ? null : dbOverride.current;

    setState({
      phase: localOverride ?? effectiveDbOverride ?? getPhase(data.name, new Date(), data.invitation_seen ?? false),
      guestName: data.name,
      guestCity: data.city ?? null,
      isLoading: false,
      sessionRestored: true,
    });
  } catch {
    // Network failure or non-production env — silent
  }
}
