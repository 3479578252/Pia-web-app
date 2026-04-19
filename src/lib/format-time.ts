// Pure time-formatting helpers. No DOM, no framework coupling.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function relativeTime(
  input: string | Date,
  now: Date = new Date()
): string {
  const then = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);

  if (!Number.isFinite(seconds)) return "";

  const future = seconds < 0;
  const abs = Math.abs(seconds);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const sign = future ? 1 : -1;

  if (abs < 30) return "just now";
  if (abs < MINUTE) return rtf.format(sign * Math.round(abs), "second");
  if (abs < HOUR) return rtf.format(sign * Math.round(abs / MINUTE), "minute");
  if (abs < DAY) return rtf.format(sign * Math.round(abs / HOUR), "hour");
  if (abs < WEEK) return rtf.format(sign * Math.round(abs / DAY), "day");
  if (abs < MONTH) return rtf.format(sign * Math.round(abs / WEEK), "week");
  if (abs < YEAR) return rtf.format(sign * Math.round(abs / MONTH), "month");
  return rtf.format(sign * Math.round(abs / YEAR), "year");
}

export function absoluteTime(input: string | Date): string {
  const then = typeof input === "string" ? new Date(input) : input;
  return then.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function initialsFrom(name: string | null | undefined, fallback = "?"): string {
  if (!name || name.trim().length === 0) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
