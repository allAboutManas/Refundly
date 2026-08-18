import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PlatformRow } from '@/lib/database.types'

export const platformsKey = ['platforms'] as const

/** Active platforms (reference data). Cached aggressively — rarely changes. */
export function usePlatforms() {
  return useQuery({
    queryKey: platformsKey,
    staleTime: Infinity,
    queryFn: async (): Promise<PlatformRow[]> => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })
}

/** Look up a platform display name, honoring the custom "Other" name. */
export function platformName(
  platforms: PlatformRow[] | undefined,
  platformId: string | null,
  customName?: string | null,
): string {
  const p = platforms?.find((x) => x.id === platformId)
  if (p && p.slug === 'other') return customName?.trim() || 'Other'
  return p?.name ?? customName?.trim() ?? 'Other'
}

export function isOtherPlatform(
  platforms: PlatformRow[] | undefined,
  platformId: string | null,
): boolean {
  return platforms?.find((x) => x.id === platformId)?.slug === 'other'
}
