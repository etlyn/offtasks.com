// Calendar days are plain "YYYY-MM-DD" strings in the reader's own time zone,
// the same form the mobile app and the tasks table use.

const pad = (value: number) => String(value).padStart(2, "0");

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const today = () => dayKey(new Date());

/** The local calendar day of a timestamp such as a note's "updatedAt". */
export const dayOf = (timestamp: string) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? today() : dayKey(date);
};

// Local noon keeps day arithmetic stable across daylight-saving changes.
export const dateFor = (day: string) => new Date(`${day}T12:00:00`);

export const isDay = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(dateFor(value).getTime());

export const shiftDay = (day: string, offset: number) => {
  const date = dateFor(day);
  date.setDate(date.getDate() + offset);
  return dayKey(date);
};

/** The same day of the month `offset` months away, clamped to that month's length. */
export const shiftMonth = (day: string, offset: number) => {
  const date = dateFor(day);
  const target = new Date(date.getFullYear(), date.getMonth() + offset, 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(date.getDate(), last));
  return dayKey(target);
};

// The interface is written in English, so dates stay in English too; a reader
// whose browser is set to another kind of English keeps its day/month order.
const locale =
  typeof navigator !== "undefined" && /^en\b/i.test(navigator.language)
    ? navigator.language
    : "en-US";

const format = (options: Intl.DateTimeFormatOptions) => {
  const formatter = new Intl.DateTimeFormat(locale, options);
  return (day: string) => formatter.format(dateFor(day));
};

/** "Oct 7" */
export const shortDate = format({ month: "short", day: "numeric" });
/** "Tue, Oct 7" */
export const weekdayDate = format({ weekday: "short", month: "short", day: "numeric" });
/** "October 2026" */
export const monthTitle = format({ month: "long", year: "numeric" });
/** "October 10, 2026" */
export const longDate = format({ month: "long", day: "numeric", year: "numeric" });
/** "Tuesday, October 7" for screen readers */
export const spokenDate = format({ weekday: "long", month: "long", day: "numeric" });

export const headingForDay = (day: string) => (day === today() ? "Today" : weekdayDate(day));

/** Monday-first weekday initials: M T W T F S S */
export const weekdayInitials = (() => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const names = new Intl.DateTimeFormat(locale, { weekday: "long" });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index, 12);
    return { short: formatter.format(date), long: names.format(date) };
  });
})();

export interface MonthGrid {
  /** First day shown (a Monday, possibly in the previous month). */
  start: string;
  weeks: number;
  month: number;
  year: number;
}

/** The Monday-first grid that holds the month `day` falls in. */
export function monthGrid(day: string): MonthGrid {
  const date = dateFor(day);
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  return {
    start: shiftDay(dayKey(first), -offset),
    weeks: Math.ceil((offset + lastOfMonth.getDate()) / 7),
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

/** Which row of the month grid a day sits in. */
export function weekIndex(day: string) {
  const date = dateFor(day);
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  return Math.floor(((first.getDay() + 6) % 7 + date.getDate() - 1) / 7);
}
