"use client";

import { useState, useEffect, useRef } from "react";
import { getPhase, Phase } from "./phase";
import { safeGetItem, safeSetItem, safeRemoveItem } from "./storage";

export interface PhaseState {
  phase: Phase;
  guestName: string | null;
  guestCity: string | null;
  guestId: string | null;
  isOwner: boolean;
  isLoading: boolean;
  sessionRestored: boolean;
  relinkPending: boolean;
  relinkRequiredPreview: boolean;
  refresh: () => void;
  acknowledgeInvitation: () => void;
}

// Sub-owner-only, this-device-only preview — never touches the DB or other visitors.
export const OWNER_PREVIEW_PHASE_KEY = "owner_phase_preview";
export const OWNER_PREVIEW_RELINK_KEY = "owner_preview_relink";
export const OWNER_PREVIEW_ERROR_KEY = "owner_preview_error";

export function usePhase(): PhaseState {
  const [state, setState] = useState<Omit<PhaseState, "refresh" | "acknowledgeInvitation">>({
    phase: Phase.FIRST_VISIT,
    guestName: null,
    guestCity: null,
    guestId: null,
    isOwner: false,
    isLoading: true,
    sessionRestored: false,
    relinkPending: false,
    relinkRequiredPreview: false,
  });
  const [tick, setTick] = useState(0);
  const sessionChecked = useRef(false);
  const dbOverride = useRef<Phase | null>(null);
  const settingsFetched = useRef(false);
  const invitationAcknowledged = useRef(false);

  useEffect(() => {
    const name = safeGetItem("guest_name");
    const city = safeGetItem("guest_city");

    const devOverride = safeGetItem("dev_phase");
    const localOverride =
      devOverride && Object.values(Phase).includes(devOverride as Phase)
        ? (devOverride as Phase)
        : null;

    // Owner-only preview — set via the gear icon, lives in this browser's
    // localStorage only. Never written to the DB, never seen by other guests.
    const ownerPreview = safeGetItem(OWNER_PREVIEW_PHASE_KEY);
    const ownerPhaseOverride =
      ownerPreview && Object.values(Phase).includes(ownerPreview as Phase)
        ? (ownerPreview as Phase)
        : null;
    const ownerRelinkPreview = safeGetItem(OWNER_PREVIEW_RELINK_KEY) === "1";

    // Dev and staging: skip registration — default to RETURN_VISIT when no guest set
    // Production: default new (no-name) visitors to FIRST_VISIT so they see the
    // registration form. The async session check below will override to the
    // correct phase for returning or incognito users.
    // invitationAcknowledged starts false, so pre-wedding users always see
    // INVITATION first — even returning users. They advance to RETURN_VISIT
    // by clicking Explore on the invitation card.
    const isNonProd = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";
    const defaultPhase = isNonProd && !name
      ? Phase.RETURN_VISIT
      : name
        ? getPhase(name, new Date(), invitationAcknowledged.current)
        : Phase.FIRST_VISIT;

    // Unknown device in production (no guest_name in localStorage — e.g. incognito,
    // cleared storage, or a genuinely new visitor) — don't flash the registration
    // form yet. Stay on the loading screen until the fingerprint check below tells
    // us whether this is a relink candidate (matching device fingerprint) or truly
    // new. Otherwise a slow/racing fetch let people register duplicate accounts
    // on devices that should have been offered the relink screen instead.
    const waitingOnFingerprintCheck = !isNonProd && !name && !localOverride && !ownerPhaseOverride;

    setState((prev) => ({
      ...prev,
      phase: ownerPhaseOverride ?? localOverride ?? dbOverride.current ?? defaultPhase,
      // When localStorage is unavailable (Safari private browsing etc.),
      // keep the guestName/guestCity from the previous session-check result
      // rather than resetting to null.
      guestName: name ?? prev.guestName,
      guestCity: city ?? prev.guestCity,
      isLoading: waitingOnFingerprintCheck ? true : false,
      relinkRequiredPreview: ownerRelinkPreview,
    }));

    if (!localOverride && !ownerPhaseOverride && !settingsFetched.current) {
      settingsFetched.current = true;
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

    // Skip session check on dev/staging — no DB records exist and it would wipe
    // the phase back to FIRST_VISIT on every load.
    if (!sessionChecked.current && !localOverride && !isNonProd) {
      sessionChecked.current = true;
      _runSessionCheck(setState, dbOverride, invitationAcknowledged, ownerPhaseOverride, ownerRelinkPreview);
    }
  }, [tick]);

  return {
    ...state,
    refresh: () => {
      sessionChecked.current = false;
      setTick((t) => t + 1);
    },
    acknowledgeInvitation: () => {
      invitationAcknowledged.current = true;
    },
  };
}

async function _runSessionCheck(
  setState: React.Dispatch<React.SetStateAction<Omit<PhaseState, "refresh" | "acknowledgeInvitation">>>,
  dbOverride: React.MutableRefObject<Phase | null>,
  invitationAcknowledged: React.MutableRefObject<boolean>,
  ownerPhaseOverride: Phase | null,
  ownerRelinkPreview: boolean,
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

    if (!res.ok) {
      // Release the loading screen even on failure — otherwise a device that
      // was waiting on this check (unknown-name production visitor) hangs
      // on the loader forever instead of falling back to registration.
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    const data = (await res.json()) as {
      status: string;
      name?: string;
      city?: string;
      invitation_seen?: boolean;
      session_token?: string;
      guest_id?: string;
      is_owner?: boolean;
    };

    // Genuinely new user — no fingerprint and no browser-signal match anywhere.
    // Show the registration form (FIRST_VISIT) so they can sign up.
    if (data.status === "new") {
      safeRemoveItem("session_token");
      safeRemoveItem("guest_name");
      safeRemoveItem("guest_city");
      safeRemoveItem("invitation_seen");
      setState((prev) => ({
        ...prev,
        phase: Phase.FIRST_VISIT,
        guestName: null,
        guestCity: null,
        guestId: null,
        isOwner: false,
        isLoading: false,
        sessionRestored: false,
        relinkPending: false,
        relinkRequiredPreview: false,
      }));
      return;
    }

    // Known guest from a different device (incognito / new browser) —
    // same browser profile, but device UUID was cleared.
    // Show RETURN_VISIT with the relink form so they can verify their identity.
    if (data.status === "relink_required") {
      safeSetItem("guest_name", data.name!);
      if (data.city) safeSetItem("guest_city", data.city);
      setState((prev) => ({
        ...prev,
        phase: Phase.RETURN_VISIT,
        guestName: data.name ?? null,
        guestCity: data.city ?? null,
        guestId: data.guest_id ?? null,
        isOwner: false,
        isLoading: false,
        sessionRestored: false,
        relinkPending: true,
        relinkRequiredPreview: false,
      }));
      return;
    }

    if (data.status !== "known" || !data.name) return;

    safeSetItem("guest_name", data.name);
    if (data.city) safeSetItem("guest_city", data.city);
    if (data.invitation_seen) safeSetItem("invitation_seen", "true");
    if (data.session_token) safeSetItem("session_token", data.session_token);

    const devOverride = safeGetItem("dev_phase");
    const localOverride =
      devOverride && Object.values(Phase).includes(devOverride as Phase)
        ? (devOverride as Phase)
        : null;

    // Once the guest has a valid session, FIRST_VISIT override no longer applies —
    // use the natural computed phase so they aren't trapped after registering.
    const effectiveDbOverride =
      dbOverride.current === Phase.FIRST_VISIT ? null : dbOverride.current;

    // Don't auto-skip INVITATION on the initial session check.
    // Pre-wedding users must click Explore on the invitation card to advance
    // to RETURN_VISIT. Date-based phases (WEDDING_DAY / POST_WEDDING) are
    // always used directly.
    const computedPhase = localOverride ?? effectiveDbOverride ?? getPhase(data.name, new Date(), data.invitation_seen ?? false);
    const naturalPhase = computedPhase === Phase.RETURN_VISIT && !invitationAcknowledged.current
      ? Phase.INVITATION
      : computedPhase;
    // Owner preview always wins — set locally via the gear icon, this device only.
    const effectivePhase = ownerPhaseOverride ?? naturalPhase;

    setState({
      phase: effectivePhase,
      guestName: data.name,
      guestCity: data.city ?? null,
      guestId: data.guest_id ?? null,
      isOwner: data.is_owner ?? false,
      isLoading: false,
      sessionRestored: true,
      relinkPending: false,
      relinkRequiredPreview: ownerRelinkPreview,
    });
  } catch {
    // Network/fingerprinting failure — fall back to registration rather than
    // hanging on the loading screen forever for devices that were waiting.
    setState((prev) => ({ ...prev, isLoading: false }));
  }
}
