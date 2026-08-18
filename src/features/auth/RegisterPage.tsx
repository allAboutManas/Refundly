import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, MailCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isValidEmail, validatePassword } from '@/domain'
import { Button, Field, Input, PasswordInput } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

export default function RegisterPage() {
  const { signUpWithPassword } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSent, setConfirmSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    const pw = validatePassword(password)
    if (!pw.valid) return setError(pw.error)

    setSubmitting(true)
    const { error, needsConfirmation } = await signUpWithPassword(email, password, fullName)
    setSubmitting(false)
    if (error) return setError(error)
    if (needsConfirmation) return setConfirmSent(true)
    navigate('/app', { replace: true })
  }

  if (confirmSent) {
    return (
      <AuthLayout>
        <div className="grid size-12 place-items-center rounded-xl bg-success-soft text-success">
          <MailCheck className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Confirm your email</h1>
        <p className="mt-2 text-[15px] text-text-2">
          We sent a confirmation link to <span className="font-semibold text-text">{email}</span>.
          Click it to activate your account, then sign in.
        </p>
        <Button className="mt-6" variant="secondary" fullWidth onClick={() => navigate('/login')}>
          Back to sign in
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-[15px] text-text-2">
        Add it once. Get reminded at the right time. Never forget your refund.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Full name">
          <Input
            autoComplete="name"
            placeholder="Manas"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>
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
        <Field label="Password" hint="At least 8 characters.">
          <PasswordInput
            autoComplete="new-password"
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

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-text-2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
