"use client";

import { useState, useEffect } from "react";
import { getPhase, Phase } from "./phase";

export interface PhaseState {
  phase: Phase;
  guestName: string | null;
  guestCity: string | null;
  isLoading: boolean;
  refresh: () => void;
}

export function usePhase(): PhaseState {
  const [state, setState] = useState<Omit<PhaseState, "refresh">>({
    phase: Phase.FIRST_VISIT,
    guestName: null,
    guestCity: null,
    isLoading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const name = localStorage.getItem("guest_name");
    const city = localStorage.getItem("guest_city");
    const invitationSeen = localStorage.getItem("invitation_seen") === "true";

    // Dev/preview phase override: set localStorage key "dev_phase" to one of:
    // FIRST_VISIT | INVITATION | RETURN_VISIT | WEDDING_DAY | POST_WEDDING
    // Always read it — DevPanel guards its own visibility so it's only settable in dev/preview.
    const devOverride = localStorage.getItem("dev_phase");
    const overridePhase = devOverride && Object.values(Phase).includes(devOverride as Phase)
      ? (devOverride as Phase)
      : null;

    setState({
      phase: overridePhase ?? getPhase(name, new Date(), invitationSeen),
      guestName: name,
      guestCity: city,
      isLoading: false,
    });
  }, [tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}
