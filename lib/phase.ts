import { WEDDING_DATE } from "./constants";

export enum Phase {
  FIRST_VISIT = "FIRST_VISIT",
  INVITATION = "INVITATION",
  RETURN_VISIT = "RETURN_VISIT",
  WEDDING_DAY = "WEDDING_DAY",
  POST_WEDDING = "POST_WEDDING",
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isAfterDay(a: Date, b: Date): boolean {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return aDay > bDay;
}

export function getPhase(
  guestName: string | null,
  now: Date = new Date(),
  invitationSeen: boolean = false
): Phase {
  if (!guestName) return Phase.FIRST_VISIT;
  if (!invitationSeen) return Phase.INVITATION;
  if (isSameDay(now, WEDDING_DATE)) return Phase.WEDDING_DAY;
  if (isAfterDay(now, WEDDING_DATE)) return Phase.POST_WEDDING;
  return Phase.RETURN_VISIT;
}
