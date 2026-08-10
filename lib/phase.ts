import { WEDDING_DATE } from "./constants";

export enum Phase {
  FIRST_VISIT = "FIRST_VISIT",
  INVITATION = "INVITATION",
  RETURN_VISIT = "RETURN_VISIT",
  WEDDING_DAY = "WEDDING_DAY",
  POST_WEDDING = "POST_WEDDING",
}

// Post-wedding begins at 10 PM IST on the wedding day itself — not at the
// next calendar midnight. Computed as an absolute instant (not local calendar
// date) so it's correct regardless of the server's or guest's timezone.
export const POST_WEDDING_CUTOFF = new Date(WEDDING_DATE.getTime() + 22 * 60 * 60 * 1000);

export function getPhase(
  guestName: string | null,
  now: Date = new Date(),
  invitationSeen: boolean = false
): Phase {
  // Unknown device (incognito, new browser, cleared cookies) → pre-wedding page only.
  // Registration is disabled for unrecognized devices to prevent impersonation.
  if (!guestName) return Phase.RETURN_VISIT;

  // Date-based phases take priority over the invitation gate — on the wedding
  // day or after, even a relinking user should see the correct live phase.
  // Absolute-instant comparisons (not calendar-day) so behavior is identical
  // no matter what timezone the server or guest's device is in.
  if (now.getTime() >= POST_WEDDING_CUTOFF.getTime()) return Phase.POST_WEDDING;
  if (now.getTime() >= WEDDING_DATE.getTime()) return Phase.WEDDING_DAY;

  // Pre-wedding: show invitation until the guest has opened it
  if (!invitationSeen) return Phase.INVITATION;
  return Phase.RETURN_VISIT;
}
