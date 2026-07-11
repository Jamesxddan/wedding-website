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

  useEffect(() => {
    const name = localStorage.getItem("guest_name");
    const city = localStorage.getItem("guest_city");
    const invitationSeen = localStorage.getItem("invitation_seen") === "true";

    const devOverride = localStorage.getItem("dev_phase");
    const overridePhase =
      devOverride && Object.values(Phase).includes(devOverride as Phase)
        ? (devOverride as Phase)
        : null;

    setState((prev) => ({
      ...prev,
      phase: overridePhase ?? getPhase(name, new Date(), invitationSeen),
      guestName: name,
      guestCity: city,
      isLoading: false,
    }));

    // Fire session check once per mount to validate the session_token is still
    // live in the DB. If the admin reset sessions, the fingerprint is gone and
    // the check auto-re-registers the guest using stored name/city.
    if (!sessionChecked.current) {
      sessionChecked.current = true;
      _runSessionCheck(setState);
    }
  }, [tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}

async function _runSessionCheck(
  setState: React.Dispatch<React.SetStateAction<Omit<PhaseState, "refresh">>>
): Promise<void> {
  try {
    const { getOrCreateDeviceUUID, getBrowserSignalsHash } = await import("./fingerprint");
    const device_uuid = await getOrCreateDeviceUUID();
    const browser_signals_hash = await getBrowserSignalsHash();

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_uuid, browser_signals_hash }),
    });

    if (!res.ok) return;
    const data = (await res.json()) as {
      status: string;
      name?: string;
      city?: string;
      invitation_seen?: boolean;
      session_token?: string;
    };

    // Device not in Supabase yet — auto-register using stored name/city
    // so pre-Supabase visitors silently get a session_token
    if (data.status === "new") {
      const existingName = localStorage.getItem("guest_name");
      const existingCity = localStorage.getItem("guest_city");
      if (existingName && existingCity) {
        const regRes = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: existingName, city: existingCity, device_uuid, browser_signals_hash }),
        });
        if (regRes.ok) {
          const regData = (await regRes.json()) as { session_token?: string };
          if (regData.session_token) localStorage.setItem("session_token", regData.session_token);
        }
      }
      return;
    }

    if (data.status !== "known" || !data.name) return;

    localStorage.setItem("guest_name", data.name);
    if (data.city) localStorage.setItem("guest_city", data.city);
    if (data.invitation_seen) localStorage.setItem("invitation_seen", "true");
    if (data.session_token) localStorage.setItem("session_token", data.session_token);

    const devOverride = localStorage.getItem("dev_phase");
    const overridePhase =
      devOverride && Object.values(Phase).includes(devOverride as Phase)
        ? (devOverride as Phase)
        : null;

    setState({
      phase: overridePhase ?? getPhase(data.name, new Date(), data.invitation_seen ?? false),
      guestName: data.name,
      guestCity: data.city ?? null,
      isLoading: false,
      sessionRestored: true,
    });
  } catch {
    // Network failure or non-production env — silent
  }
}
