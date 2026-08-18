import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isValidEmail } from '@/domain'
import { Button, Field, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    setSubmitting(true)
    const { error } = await resetPassword(email)
    setSubmitting(false)
    if (error) return setError(error)
    // Head straight to code entry, carrying the email along so the user
    // doesn't have to retype it.
    navigate('/reset-password', { state: { email: email.trim() } })
  }

  return (
    <AuthLayout>
      <Link
        to="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-text-2 hover:text-text"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-[15px] text-text-2">
        Enter your email and we'll send you a 6-digit code.
      </p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Send code
        </Button>
      </form>
    </AuthLayout>
  )
}
