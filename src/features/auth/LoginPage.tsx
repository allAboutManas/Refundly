import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isValidEmail } from '@/domain'
import { Button, Field, Input, PasswordInput, useToast } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export default function LoginPage() {
  const { signInWithPassword, signInWithMagicLink } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')
    setSubmitting(true)
    const { error } = await signInWithPassword(email, password)
    setSubmitting(false)
    if (error) return setError(error)
    navigate(from, { replace: true })
  }

  async function onMagicLink() {
    setError(null)
    if (!isValidEmail(email)) return setError('Enter your email to get a magic link.')
    setSubmitting(true)
    const { error } = await signInWithMagicLink(email)
    setSubmitting(false)
    if (error) return setError(error)
    setMagicSent(true)
    toast({ tone: 'success', title: 'Magic link sent', description: `Check ${email} to sign in.` })
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-[15px] text-text-2">
        Sign in to see what needs your attention today.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leading={<Mail className="size-4" />}
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-medium text-text-3">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="secondary" fullWidth size="lg" onClick={onMagicLink} disabled={submitting || magicSent}>
        {magicSent ? 'Magic link sent ✓' : 'Email me a magic link'}
      </Button>

      <p className="mt-7 text-center text-sm text-text-2">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create account
        </Link>
      </p>
    </AuthLayout>
  )
}
