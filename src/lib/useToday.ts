import { useProfile } from '@/api/profile'
import { DEFAULT_TIMEZONE, todayInTimeZone, type PlainDate } from '@/domain'

/** The user's configured timezone, falling back to India. */
export function useTimezone(): string {
  const { data } = useProfile()
  return data?.timezone || import.meta.env.VITE_DEFAULT_TIMEZONE || DEFAULT_TIMEZONE
}

/** Today's calendar date in the user's timezone. */
export function useToday(): PlainDate {
  return todayInTimeZone(useTimezone())
}
