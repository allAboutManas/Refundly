import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { isValidEmail, validatePassword } from '@/domain'
import { Button, Field, Input, OtpInput, PasswordInput, useToast } from '@/components/ui'
import { AuthLayout } from './AuthLayout'

const CODE_LENGTH = 6

export default function ResetPasswordPage() {
  const { verifyRecoveryCode, updatePassword, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const emailFromState = (location.state as { email?: string } | null)?.email ?? ''

  const [email, setEmail] = useState(emailFromState)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) return setError('Enter a valid email address.')
    const trimmedCode = code.trim()
    if (trimmedCode.length !== CODE_LENGTH) {
      return setError(`Enter the ${CODE_LENGTH}-digit code from your email.`)
    }
    const pw = validatePassword(password)
    if (!pw.valid) return setError(pw.error)
    if (password !== confirm) return setError('Passwords do not match.')

    setSubmitting(true)
    // Verifying the code establishes a short-lived recovery session, which
    // then authorises the password update below.
    const verified = await verifyRecoveryCode(email, trimmedCode)
    if (verified.error) {
      setSubmitting(false)
      return setError(verified.error)
    }
    const updated = await updatePassword(password)
    setSubmitting(false)
    if (updated.error) return setError(updated.error)

    toast({ tone: 'success', title: 'Password updated', description: "You're now signed in." })
    navigate('/app', { replace: true })
  }

  async function onResend() {
    setError(null)
    if (!isValidEmail(email)) return setError('Enter your email above, then resend the code.')
    setResending(true)
    const { error } = await resetPassword(email)
    setResending(false)
    if (error) return setError(error)
    toast({ tone: 'success', title: 'Code sent', description: `We emailed a new code to ${email}.` })
  }

  return (
    <AuthLayout>
      <Link
        to="/forgot-password"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-text-2 hover:text-text"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight">Enter your reset code</h1>
      <p className="mt-1.5 text-[15px] text-text-2">
        We emailed a 6-digit code to{' '}
        <span className="font-semibold text-text">{email || 'your inbox'}</span>. Enter it below with
        your new password.
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
        <Field label="6-digit code" hint="Enter the code we emailed you.">
          <OtpInput
            length={CODE_LENGTH}
            value={code}
            onChange={setCode}
            error={Boolean(error)}
            autoFocus={Boolean(emailFromState)}
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm password">
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Update password
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-text-2">
        Didn't get a code?{' '}
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </p>
    </AuthLayout>
  )
}
