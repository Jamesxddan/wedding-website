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
    setState({
      phase: getPhase(name),
      guestName: name,
      guestCity: city,
      isLoading: false,
    });
  }, []);

  return state;
}
