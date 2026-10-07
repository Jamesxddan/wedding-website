import type { ReminderType } from "@/lib/rsvp-email";

const BY_DAYS_UNTIL: Record<number, ReminderType> = {
  2: "two_days_before",
  1: "day_before",
  0: "wedding_day",
};

/**
 * Which reminder a cron call should send.
 *  - plain call (the daily 03:00 UTC cron): chosen by how many days remain.
 *  - ?type=afternoon (one cron entry that fires at 09:30 UTC on Oct 7 and Oct 8 - the free Vercel plan allows
 *    only two cron entries and one run per day each): Oct 7 -> an apology/correction for the early email,
 *    wedding day -> the "about an hour" email.
 * Returns undefined when nothing should be sent.
 */
export function pickReminderType(typeParam: string | null, daysUntilWedding: number): ReminderType | undefined {
  if (typeParam === "afternoon") {
    if (daysUntilWedding === 1) return "correction";
    if (daysUntilWedding === 0) return "one_hour_before";
    return undefined;
  }
  return BY_DAYS_UNTIL[daysUntilWedding];
}
