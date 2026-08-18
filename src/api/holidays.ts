import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProfile } from './profile'
import type { HolidayRow } from '@/lib/database.types'
import type { PlainDate } from '@/domain'

export const holidaysKey = (country: string) => ['holidays', country] as const

/**
 * Public holidays for the user's country (national + their state).
 * The table is populated from the Indian public-holiday calendar and refreshed
 * per year — there are no user-defined holidays.
 */
export function useHolidays() {
  const { data: profile } = useProfile()
  const country = profile?.country_code || 'IN'
  const state = profile?.state_code ?? null
  // Only ever surface the current year — the table may still hold other years.
  const year = new Date().getFullYear()
  return useQuery({
    queryKey: [...holidaysKey(country), state, year],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<HolidayRow[]> => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('country_code', country)
        .eq('year', year)
        .order('holiday_date')
      if (error) throw error
      // National (no state) always apply; state-specific only if it matches.
      return (data ?? []).filter((h) => !h.state_code || h.state_code === state)
    },
  })
}

/** Set of public-holiday dates used by the working-day calculator. */
export function useHolidaySet(): ReadonlySet<PlainDate> {
  const { data: pub } = useHolidays()
  return useMemo(() => {
    const set = new Set<PlainDate>()
    pub?.forEach((h) => set.add(h.holiday_date))
    return set
  }, [pub])
}
