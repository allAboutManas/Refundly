/**
 * Presentation-safe formatting helpers.
 *
 * Date formatting parses the PlainDate string directly (never constructs a
 * zoned Date) so "18 Sep 2026" always renders the intended calendar day.
 */
import { diffCalendarDays, partsOf } from './dates'
import type { PlainDate } from './types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const inrDecimal = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "₹1,499" (whole) or "₹1,499.50" (with decimals), Indian digit grouping. */
export function formatINR(amount: number, opts: { decimals?: boolean } = {}): string {
  return (opts.decimals ? inrDecimal : inrWhole).format(amount)
}

/** "18 September 2026" */
export function formatDateLong(date: PlainDate): string {
  const { year, month, day } = partsOf(date)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

/** "September 2026" */
export function formatMonthYear(date: PlainDate): string {
  const { year, month } = partsOf(date)
  return `${MONTHS[month - 1]} ${year}`
}

/** "18 Sep" or "18 Sep 2026" when `withYear`. */
export function formatDateShort(
  date: PlainDate,
  opts: { withYear?: boolean } = {},
): string {
  const { year, month, day } = partsOf(date)
  const base = `${day} ${MONTHS_SHORT[month - 1]}`
  return opts.withYear ? `${base} ${year}` : base
}

/** "Today" / "Tomorrow" / "Yesterday" / "In 3 days" / "2 days ago". */
export function relativeDay(date: PlainDate, today: PlainDate): string {
  const diff = diffCalendarDays(today, date)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1) return `In ${diff} days`
  return `${Math.abs(diff)} days ago`
}

/** Compact overdue/remaining label, e.g. "2 days overdue" / "Due in 5 days". */
export function dueLabel(date: PlainDate, today: PlainDate): string {
  const diff = diffCalendarDays(today, date)
  if (diff === 0) return 'Due today'
  if (diff > 0) return diff === 1 ? 'Due tomorrow' : `Due in ${diff} days`
  const overdue = Math.abs(diff)
  return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`
}
