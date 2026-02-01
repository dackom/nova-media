export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

/** Format a UTC Date for display in a specific timezone (time only) */
export function formatTimeInTimezone(
  utcDate: Date,
  timezone: string
): string {
  try {
    return utcDate.toLocaleTimeString(undefined, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Build UTC ISO string from local date parts (doctor's browser TZ) */
export function localToUTCString(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): string {
  const d = new Date(year, month, day, hour, minute);
  return d.toISOString();
}

/** Get time string (HH:mm) from a Date in a specific timezone */
export function getTimeStringInTimezone(date: Date, timezone: string): string {
  try {
    const str = date.toLocaleTimeString(undefined, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [h, m] = str.split(":");
    return `${h?.padStart(2, "0") ?? "00"}:${m?.padStart(2, "0") ?? "00"}`;
  } catch {
    return "09:00";
  }
}
