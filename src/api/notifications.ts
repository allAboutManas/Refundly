import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { NotificationRow } from '@/lib/database.types'

export const notificationsKey = (userId?: string) => ['notifications', userId] as const

/** In-app notification feed (channel = IN_APP), newest first. */
export function useNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationsKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('channel', 'IN_APP')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUnreadCount(): number {
  const { data } = useNotifications()
  return (data ?? []).filter((n) => !n.read_at).length
}

export function useMarkNotificationRead() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationsKey(user?.id) }),
  })
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('channel', 'IN_APP')
        .is('read_at', null)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationsKey(user?.id) }),
  })
}
