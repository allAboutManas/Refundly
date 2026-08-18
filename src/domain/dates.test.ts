import { describe, it, expect } from 'vitest'
import {
  addCalendarDays,
  addWorkingDays,
  calculateExpectedDate,
  compareDates,
  countExclusions,
  dayOfWeek,
  diffCalendarDays,
  isValidPlainDate,
  isWeekend,
  todayInTimeZone,
} from './dates'

describe('isValidPlainDate', () => {
  it('accepts real dates', () => {
    expect(isValidPlainDate('2026-08-16')).toBe(true)
    expect(isValidPlainDate('2000-02-29')).toBe(true) // leap year
  })
  it('rejects impossible or malformed dates', () => {
    expect(isValidPlainDate('2026-13-01')).toBe(false)
    expect(isValidPlainDate('2026-02-30')).toBe(false)
    expect(isValidPlainDate('2026-2-3')).toBe(false)
    expect(isValidPlainDate('nope')).toBe(false)
    expect(isValidPlainDate('2021-02-29')).toBe(false) // not a leap year
  })
})

describe('addCalendarDays', () => {
  it('adds within a month', () => {
    expect(addCalendarDays('2026-08-16', 3)).toBe('2026-08-19')
  })
  it('rolls across month and year boundaries', () => {
    expect(addCalendarDays('2026-08-30', 5)).toBe('2026-09-04')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('subtracts with a negative count', () => {
    expect(addCalendarDays('2026-09-04', -5)).toBe('2026-08-30')
  })
})

describe('dayOfWeek / isWeekend', () => {
  it('anchors to 1 Jan 2000 (a Saturday)', () => {
    expect(dayOfWeek('2000-01-01')).toBe(6)
    expect(isWeekend('2000-01-01')).toBe(true)
    expect(dayOfWeek('2000-01-02')).toBe(0) // Sunday
    expect(isWeekend('2000-01-03')).toBe(false) // Monday
  })
})

describe('addWorkingDays', () => {
  it('skips weekends', () => {
    // Fri 7 Jan 2000 + 1 working day → Mon 10 Jan
    expect(addWorkingDays('2000-01-07', 1)).toBe('2000-01-10')
    // Mon 3 Jan + 5 working days → Mon 10 Jan (Tue..Fri then skip weekend)
    expect(addWorkingDays('2000-01-03', 5)).toBe('2000-01-10')
  })
  it('skips holidays as well as weekends', () => {
    const holidays = new Set(['2000-01-05']) // Wednesday
    // Mon 3 Jan + 3 working: Tue(1), Wed holiday, Thu(2), Fri(3) → Fri 7 Jan
    expect(addWorkingDays('2000-01-03', 3, holidays)).toBe('2000-01-07')
  })
  it('returns the start for non-positive durations', () => {
    expect(addWorkingDays('2000-01-03', 0)).toBe('2000-01-03')
  })
})

describe('calculateExpectedDate', () => {
  it('handles calendar days', () => {
    expect(
      calculateExpectedDate({ startDate: '2026-08-16', duration: 30, type: 'CALENDAR_DAYS' }),
    ).toBe('2026-09-15')
  })
  it('handles working days with holidays', () => {
    const holidays = new Set(['2000-01-05'])
    expect(
      calculateExpectedDate({
        startDate: '2000-01-03',
        duration: 3,
        type: 'WORKING_DAYS',
        holidays,
      }),
    ).toBe('2000-01-07')
  })
})

describe('countExclusions', () => {
  it('counts weekend days and holidays in the span', () => {
    expect(countExclusions('2000-01-03', '2000-01-10')).toEqual({
      weekendDays: 2,
      holidayDays: 0,
    })
    expect(
      countExclusions('2000-01-03', '2000-01-10', new Set(['2000-01-05'])),
    ).toEqual({ weekendDays: 2, holidayDays: 1 })
  })
})

describe('compareDates / diffCalendarDays', () => {
  it('compares', () => {
    expect(compareDates('2026-08-16', '2026-08-17')).toBe(-1)
    expect(compareDates('2026-08-17', '2026-08-16')).toBe(1)
    expect(compareDates('2026-08-16', '2026-08-16')).toBe(0)
  })
  it('diffs', () => {
    expect(diffCalendarDays('2026-08-16', '2026-08-19')).toBe(3)
    expect(diffCalendarDays('2026-08-19', '2026-08-16')).toBe(-3)
  })
})

describe('todayInTimeZone', () => {
  it('resolves the local calendar date for the given zone', () => {
    const now = new Date('2026-08-16T20:00:00Z') // 01:30 next day in IST
    expect(todayInTimeZone('Asia/Kolkata', now)).toBe('2026-08-17')
    expect(todayInTimeZone('UTC', now)).toBe('2026-08-16')
  })
})
