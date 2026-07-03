const WEDDING_DATE_STR = "20261008";
const WEDDING_DATE_END_STR = "20261009";
const LOCATION = "St Andrews Kirk, Chennai";

export function buildGoogleCalendarUrl(guestName: string): string {
  const title = encodeURIComponent("James & Sharon's Wedding 💐");
  const details = encodeURIComponent(
    `Dear ${guestName}, we joyfully invite you to celebrate the wedding of James Daniel & Sharon. Your presence is deeply cherished.`
  );
  const location = encodeURIComponent(LOCATION);
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${title}` +
    `&dates=${WEDDING_DATE_STR}/${WEDDING_DATE_END_STR}` +
    `&details=${details}` +
    `&location=${location}`
  );
}

export function buildIcsDataUrl(guestName: string): string {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//James & Sharon Wedding//EN",
    "BEGIN:VEVENT",
    `DTSTART:${WEDDING_DATE_STR}`,
    `DTEND:${WEDDING_DATE_END_STR}`,
    "SUMMARY:James & Sharon's Wedding 💐",
    `DESCRIPTION:Dear ${guestName}\\, we joyfully invite you to our wedding. Your presence is deeply cherished.`,
    `LOCATION:${LOCATION}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const b64 = btoa(unescape(encodeURIComponent(ics)));
  return `data:text/calendar;base64,${b64}`;
}
