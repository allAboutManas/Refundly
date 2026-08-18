import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { NotificationPrefsRow } from '@/lib/database.types'

export const preferencesKey = (userId?: string) => ['notification-prefs', userId] as const

export function useNotificationPreferences() {
  const { user } = useAuth()
  return useQuery({
    queryKey: preferencesKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<NotificationPrefsRow | null> => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdatePreferences() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPrefsRow>) => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user!.id, ...patch }, { onConflict: 'user_id' })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => qc.setQueryData(preferencesKey(user?.id), data),
  })
}
