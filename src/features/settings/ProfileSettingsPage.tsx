import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, Field, Input, Select, Skeleton, useToast } from '@/components/ui'
import { useProfile, useUpdateProfile } from '@/api/profile'
import { useAuth } from '@/lib/auth'
import { INDIAN_STATES, TIMEZONES } from '@/lib/constants'
import { friendlyError } from '@/lib/errors'

export default function ProfileSettingsPage() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const update = useUpdateProfile()
  const { toast } = useToast()

  const [fullName, setFullName] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [stateCode, setStateCode] = useState('')

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setTimezone(profile.timezone || 'Asia/Kolkata')
    setStateCode(profile.state_code ?? '')
  }, [profile])

  async function save() {
    try {
      await update.mutateAsync({
        full_name: fullName.trim() || null,
        timezone,
        state_code: stateCode || null,
      })
      toast({ tone: 'success', title: 'Profile saved' })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not save', description: friendlyError(e) })
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Profile" back />
        <Skeleton className="h-64" />
      </>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" description="Your name and region." back />
      <Card className="space-y-4">
        <Field label="Email" hint="Sign-in email — contact support to change.">
          <Input value={user?.email ?? ''} disabled />
        </Field>
        <Field label="Full name">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tony Stark" />
        </Field>
        <Field label="Timezone" hint="Used to schedule reminders at the right local time.">
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Region" hint="Used for state-specific public holidays.">
          <Select value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
            <option value="">All India</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="pt-1">
          <Button onClick={save} loading={update.isPending}>
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  )
}
