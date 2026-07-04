"use client";

import { useState, useEffect } from "react";
import { getPhase, Phase } from "./phase";

export interface PhaseState {
  phase: Phase;
  guestName: string | null;
  guestCity: string | null;
  isLoading: boolean;
}

export function usePhase(): PhaseState {
  const [state, setState] = useState<PhaseState>({
    phase: Phase.FIRST_VISIT,
    guestName: null,
    guestCity: null,
    isLoading: true,
  });

  useEffect(() => {
    const name = localStorage.getItem("guest_name");
    const city = localStorage.getItem("guest_city");
    const invitationSeen = localStorage.getItem("invitation_seen") === "true";

    // Dev-only phase override: set localStorage key "dev_phase" to one of:
    // FIRST_VISIT | INVITATION | RETURN_VISIT | WEDDING_DAY | POST_WEDDING
    const devOverride = process.env.NODE_ENV !== "production"
      ? localStorage.getItem("dev_phase")
      : null;
    const overridePhase = devOverride && Object.values(Phase).includes(devOverride as Phase)
      ? (devOverride as Phase)
      : null;

    setState({
      phase: overridePhase ?? getPhase(name, new Date(), invitationSeen),
      guestName: name,
      guestCity: city,
      isLoading: false,
    });
  }, []);

  return state;
}
