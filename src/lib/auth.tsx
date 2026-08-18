import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { friendlyError } from './errors'

export interface AuthResult {
  error?: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** True until the initial session check resolves. */
  initializing: boolean
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<AuthResult & { needsConfirmation?: boolean }>
  signInWithMagicLink: (email: string) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  /** Verify the 6-digit recovery code from the reset email; on success a recovery session is set. */
  verifyRecoveryCode: (email: string, token: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const redirectTo = (path = '') =>
  typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
      })
      .finally(() => {
        if (active) setInitializing(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user: session?.user ?? null,
      initializing,

      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        return error ? { error: friendlyError(error) } : {}
      },

      async signUpWithPassword(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: fullName ? { full_name: fullName.trim() } : undefined,
            emailRedirectTo: redirectTo('/'),
          },
        })
        if (error) return { error: friendlyError(error) }
        // When email confirmation is required, no session is returned yet.
        const needsConfirmation = !data.session
        return { needsConfirmation }
      },

      async signInWithMagicLink(email) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: redirectTo('/') },
        })
        return error ? { error: friendlyError(error) } : {}
      },

      async resetPassword(email) {
        // Sends the recovery email. With the code-based email template
        // ({{ .Token }}), the user enters the 6-digit code on /reset-password,
        // so we intentionally omit redirectTo (no magic link).
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
        return error ? { error: friendlyError(error) } : {}
      },

      async verifyRecoveryCode(email, token) {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'recovery',
        })
        return error ? { error: friendlyError(error) } : {}
      },

      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        return error ? { error: friendlyError(error) } : {}
      },

      async signOut() {
        await supabase.auth.signOut()
      },
    }
  }, [session, initializing])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
