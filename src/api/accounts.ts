import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { AccountRow } from '@/lib/database.types'

export const accountsKey = (userId?: string) => ['accounts', userId] as const

export interface AccountInput {
  platform_id: string | null
  custom_platform_name?: string | null
  account_name: string
  account_identifier?: string | null
  profile_name?: string | null
}

export function useAccounts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: accountsKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<AccountRow[]> => {
      const { data, error } = await supabase
        .from('user_platform_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AccountInput) => {
      const { data, error } = await supabase
        .from('user_platform_accounts')
        .insert({ ...input, user_id: user!.id })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsKey(user?.id) }),
  })
}

export function useUpdateAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: AccountInput & { id: string }) => {
      const { data, error } = await supabase
        .from('user_platform_accounts')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsKey(user?.id) }),
  })
}

export function useDeleteAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete so historical orders keep their account reference.
      const { error } = await supabase
        .from('user_platform_accounts')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: accountsKey(user?.id) }),
  })
}
