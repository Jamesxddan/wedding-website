"use client";

import { useEffect, useState } from "react";

// James's birthday takeover - active only on this date (India time). Everything birthday-related
// (BirthdayTakeover, BirthdayRibbon) switches itself off at midnight; no follow-up deploy needed.
export const BIRTHDAY_IST = "2026-10-16";
export const BIRTHDAY_AGE = 29; // born 16 Oct 1997

export function isBirthdayToday(now: Date = new Date()): boolean {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now) === BIRTHDAY_IST;
}

/** false on the server / first render, then re-checked every minute (so open pages switch back at midnight). */
export function useIsBirthday(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = () => setOn(isBirthdayToday());
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return on;
}
