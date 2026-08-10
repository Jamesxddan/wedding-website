import { NextRequest, NextResponse } from "next/server";

const WEDDING_DATE_STR = "20261008";
const WEDDING_DATE_END_STR = "20261009";
const LOCATION = "St Andrews Kirk, Chennai";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "Friend";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//James & Sharon Wedding//EN",
    "BEGIN:VEVENT",
    `DTSTART:${WEDDING_DATE_STR}`,
    `DTEND:${WEDDING_DATE_END_STR}`,
    "SUMMARY:James & Sharon's Wedding 💐",
    `DESCRIPTION:Dear ${name.replace(/[,;\\]/g, "\\$&")}\\, we joyfully invite you to our wedding. Your presence is deeply cherished.`,
    `LOCATION:${LOCATION}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="james-sharon-wedding.ics"',
    },
  });
}
