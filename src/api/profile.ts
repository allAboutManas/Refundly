import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { ProfileRow } from '@/lib/database.types'

export const profileKey = (userId?: string) => ['profile', userId] as const

/** The current user's profile row. */
export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<ProfileRow>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user!.id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(profileKey(user?.id), data)
    },
  })
}

export function useCompleteOnboarding() {
  const update = useUpdateProfile()
  return () => update.mutateAsync({ onboarding_completed: true })
}
