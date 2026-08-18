/**
 * Timezone-safe calendar-date engine.
 *
 * Pure dates (delivery date, return-window close, expected refund date) are
 * treated as calendar dates — never timestamps — to avoid timezone conversion
 * bugs (PRD §26). All arithmetic runs in UTC, which has no DST, so results are
 * deterministic regardless of the host machine's local timezone.
 *
 * This is the centralized date logic required by PRD §45: the same input must
 * produce the same result on PWA, Android and backend.
 */
import type { PlainDate, TimelineUnit } from './types'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

/** True if `value` is a real `YYYY-MM-DD` calendar date. */
export function isValidPlainDate(value: string): value is PlainDate {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  )
}

function toUTCms(date: PlainDate): number {
  const m = DATE_RE.exec(date)
  if (!m) throw new RangeError(`Invalid PlainDate: "${date}"`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function fromUTCms(ms: number): PlainDate {
  const dt = new Date(ms)
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

/** Split a PlainDate into numeric parts. */
export function partsOf(date: PlainDate): { year: number; month: number; day: number } {
  const m = DATE_RE.exec(date)
  if (!m) throw new RangeError(`Invalid PlainDate: "${date}"`)
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/** Add (or subtract, with a negative `days`) calendar days. */
export function addCalendarDays(date: PlainDate, days: number): PlainDate {
  return fromUTCms(toUTCms(date) + days * DAY_MS)
}

/** Day of week: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: PlainDate): number {
  return new Date(toUTCms(date)).getUTCDay()
}

/** Saturday or Sunday. */
export function isWeekend(date: PlainDate): boolean {
  const d = dayOfWeek(date)
  return d === 0 || d === 6
}

/** -1 if a < b, 0 if equal, 1 if a > b. */
export function compareDates(a: PlainDate, b: PlainDate): number {
  const am = toUTCms(a)
  const bm = toUTCms(b)
  return am < bm ? -1 : am > bm ? 1 : 0
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function diffCalendarDays(from: PlainDate, to: PlainDate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / DAY_MS)
}

/**
 * Add N working days, excluding Saturdays, Sundays and any date in `holidays`.
 * Implements the algorithm from PRD §45 exactly: step forward one day at a time,
 * skipping non-working days, until N working days have elapsed.
 */
export function addWorkingDays(
  start: PlainDate,
  days: number,
  holidays: ReadonlySet<PlainDate> = new Set(),
): PlainDate {
  if (days <= 0) return start
  let remaining = days
  let cursor = start
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, 1)
    const dow = dayOfWeek(cursor)
    if (dow === 0 || dow === 6) continue
    if (holidays.has(cursor)) continue
    remaining--
  }
  return cursor
}

export interface ExpectedDateInput {
  startDate: PlainDate
  duration: number
  type: TimelineUnit
  holidays?: ReadonlySet<PlainDate>
}

/**
 * Centralized expected-date calculation (PRD §45).
 * CALENDAR_DAYS counts every day; WORKING_DAYS excludes weekends + holidays.
 */
export function calculateExpectedDate({
  startDate,
  duration,
  type,
  holidays,
}: ExpectedDateInput): PlainDate {
  return type === 'CALENDAR_DAYS'
    ? addCalendarDays(startDate, duration)
    : addWorkingDays(startDate, duration, holidays ?? new Set())
}

/**
 * Count how many weekend days and holidays fall strictly between `start`
 * (exclusive) and `end` (inclusive). Powers the "Excluded: N weekend days,
 * M holidays" helper in the working-days calculator UI.
 */
export function countExclusions(
  start: PlainDate,
  end: PlainDate,
  holidays: ReadonlySet<PlainDate> = new Set(),
): { weekendDays: number; holidayDays: number } {
  let weekendDays = 0
  let holidayDays = 0
  if (compareDates(end, start) <= 0) return { weekendDays, holidayDays }
  let cursor = addCalendarDays(start, 1)
  while (compareDates(cursor, end) <= 0) {
    const dow = dayOfWeek(cursor)
    if (dow === 0 || dow === 6) weekendDays++
    else if (holidays.has(cursor)) holidayDays++
    cursor = addCalendarDays(cursor, 1)
  }
  return { weekendDays, holidayDays }
}

/**
 * Today's calendar date in a given IANA timezone. `now` is injectable for
 * deterministic testing. For India this yields the correct local date even when
 * the host clock is in another zone.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): PlainDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  const year = get('year')
  const month = get('month')
  const day = get('day')
  if (!year || !month || !day) {
    throw new Error(`Could not resolve date for timezone "${timeZone}"`)
  }
  return `${year}-${month}-${day}`
}

/** Min of two dates. */
export function minDate(a: PlainDate, b: PlainDate): PlainDate {
  return compareDates(a, b) <= 0 ? a : b
}

/** Max of two dates. */
export function maxDate(a: PlainDate, b: PlainDate): PlainDate {
  return compareDates(a, b) >= 0 ? a : b
}
