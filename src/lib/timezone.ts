/**
 * Timezone utilities for Institute of Mutoon portal.
 * Standard operating timezone: West Africa Time (WAT) - Africa/Lagos (UTC+1, no DST).
 */

export const APP_TIMEZONE = "Africa/Lagos";
export const APP_TIMEZONE_LABEL = "WAT";

/**
 * Formats a Date or ISO string into `YYYY-MM-DDTHH:mm` in West Africa Time (Africa/Lagos).
 * Suitable for HTML5 `<input type="datetime-local">`.
 */
export function formatDateToLagosInput(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Converts a `datetime-local` string (assumed to be in West Africa Time) into a UTC ISO string.
 * e.g., "2026-11-04T08:30" -> "2026-11-04T07:30:00.000Z"
 */
export function lagosInputToIso(datetimeLocalStr: string | null | undefined): string {
  if (!datetimeLocalStr) return "";
  const trimmed = datetimeLocalStr.trim();
  if (trimmed.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }
  const clean = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  // Explicitly anchor to WAT (+01:00)
  return new Date(`${clean}+01:00`).toISOString();
}

/**
 * Returns today's date in Lagos with the specified hour and minute as `YYYY-MM-DDTHH:mm`.
 */
export function getTodayLagosTimeString(hours: number, minutes: number = 0): string {
  const now = new Date();
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = f.format(now); // "YYYY-MM-DD"
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dateStr}T${pad(hours)}:${pad(minutes)}`;
}

/**
 * Formats a Date or ISO string into a human-readable date & time string in WAT.
 * e.g. "Nov 4, 08:30 AM WAT"
 */
export function formatExamDateTime(
  dateInput: Date | string | null | undefined,
  showTimezone = true
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const dateFormatted = d.toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  });

  const timeFormatted = d.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateFormatted}, ${timeFormatted}${showTimezone ? ` ${APP_TIMEZONE_LABEL}` : ""}`;
}

/**
 * Formats an exam start & end window into a clean range string.
 * e.g. "Nov 4, 08:30 AM — 08:00 PM WAT" or "Nov 4, 08:30 AM — Nov 5, 08:00 PM WAT"
 */
export function formatExamDateRange(
  startsAt: Date | string | null | undefined,
  endsAt: Date | string | null | undefined
): string {
  if (!startsAt || !endsAt) return "";
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";

  const startDateStr = start.toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  });
  const startTimeStr = start.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const endDateStr = end.toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  });
  const endTimeStr = end.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (startDateStr === endDateStr) {
    return `${startDateStr}, ${startTimeStr} — ${endTimeStr} ${APP_TIMEZONE_LABEL}`;
  }
  return `${startDateStr}, ${startTimeStr} — ${endDateStr}, ${endTimeStr} ${APP_TIMEZONE_LABEL}`;
}

/**
 * Formats just the time in WAT.
 * e.g. "08:30 AM WAT"
 */
export function formatExamTime(
  dateInput: Date | string | null | undefined,
  showTimezone = true
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const timeStr = d.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${timeStr}${showTimezone ? ` ${APP_TIMEZONE_LABEL}` : ""}`;
}

/**
 * Formats just the date in WAT.
 * e.g. "Nov 4, 2026"
 */
export function formatExamDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Server-side date parser.
 * Converts incoming date inputs to a proper Date object, anchoring naive datetime strings to WAT (+01:00).
 */
export function parseExamDateOnServer(input: string | Date | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  if (typeof input !== "string") return new Date(input);

  const trimmed = input.trim();
  if (trimmed.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  const clean = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  return new Date(`${clean}+01:00`);
}
