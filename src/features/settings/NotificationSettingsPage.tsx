import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, Field, Input, RadioGroup, Skeleton, Toggle, useToast } from '@/components/ui'
import { useNotificationPreferences, useUpdatePreferences } from '@/api/preferences'
import { useAuth } from '@/lib/auth'
import {
  isPushEnabled,
  pushConfigured,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push'
import type { NotificationPrefsRow } from '@/lib/database.types'
import type { RefundReminderFrequency } from '@/domain'

type Form = {
  push_enabled: boolean
  email_enabled: boolean
  review_reminders_enabled: boolean
  return_window_reminders_enabled: boolean
  refund_reminders_enabled: boolean
  refund_reminder_frequency: RefundReminderFrequency
  review_reminder_days: number
  preferred_reminder_time: string
}

const DEFAULTS: Form = {
  push_enabled: true,
  email_enabled: true,
  review_reminders_enabled: true,
  return_window_reminders_enabled: true,
  refund_reminders_enabled: true,
  refund_reminder_frequency: 'DAILY',
  review_reminder_days: 3,
  preferred_reminder_time: '09:00',
}

function fromRow(row: NotificationPrefsRow | null | undefined): Form {
  if (!row) return DEFAULTS
  return {
    push_enabled: row.push_enabled,
    email_enabled: row.email_enabled,
    review_reminders_enabled: row.review_reminders_enabled,
    return_window_reminders_enabled: row.return_window_reminders_enabled,
    refund_reminders_enabled: row.refund_reminders_enabled,
    refund_reminder_frequency: row.refund_reminder_frequency,
    review_reminder_days: row.review_reminder_days,
    preferred_reminder_time: row.preferred_reminder_time.slice(0, 5),
  }
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-text">{label}</p>
        {description && <p className="text-sm text-text-3">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </div>
  )
}

export default function NotificationSettingsPage() {
  const { data: prefs, isLoading } = useNotificationPreferences()
  const update = useUpdatePreferences()
  const { user } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState<Form>(DEFAULTS)
  const [deviceOn, setDeviceOn] = useState(false)
  const [deviceBusy, setDeviceBusy] = useState(false)

  useEffect(() => {
    if (prefs !== undefined) setForm(fromRow(prefs))
  }, [prefs])

  useEffect(() => {
    if (pushSupported()) isPushEnabled().then(setDeviceOn)
  }, [])

  async function toggleDevicePush(next: boolean) {
    setDeviceBusy(true)
    try {
      if (next) {
        const ok = await subscribeToPush(user!.id)
        setDeviceOn(ok)
        toast(
          ok
            ? { tone: 'success', title: 'Push enabled on this device' }
            : { tone: 'error', title: 'Permission denied', description: 'Allow notifications to enable push.' },
        )
      } else {
        await unsubscribeFromPush()
        setDeviceOn(false)
        toast({ tone: 'success', title: 'Push disabled on this device' })
      }
    } finally {
      setDeviceBusy(false)
    }
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    update.mutate({ [key]: value } as Partial<NotificationPrefsRow>)
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Notifications" back />
        <Skeleton className="h-64" />
      </>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Notifications" description="How and when we remind you." back />

      <section className="mb-5">
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-text-3">Channels</h2>
        <Card padded={false} className="divide-y divide-border">
          <ToggleRow
            label="Push notifications"
            description="On this device and supported browsers"
            checked={form.push_enabled}
            onChange={(v) => set('push_enabled', v)}
          />
          <ToggleRow
            label="Email notifications"
            description="Refund reminders by email"
            checked={form.email_enabled}
            onChange={(v) => set('email_enabled', v)}
          />
          {pushSupported() && (
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-text">Push on this device</p>
                <p className="text-sm text-text-3">
                  {pushConfigured()
                    ? 'Allow notifications in this browser'
                    : 'Not configured for this build'}
                </p>
              </div>
              <Toggle
                checked={deviceOn}
                onChange={toggleDevicePush}
                disabled={!pushConfigured() || deviceBusy}
                aria-label="Push on this device"
              />
            </div>
          )}
        </Card>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-text-3">Reminders</h2>
        <Card padded={false} className="divide-y divide-border">
          <ToggleRow
            label="Review reminders"
            checked={form.review_reminders_enabled}
            onChange={(v) => set('review_reminders_enabled', v)}
          />
          <ToggleRow
            label="Return window reminders"
            checked={form.return_window_reminders_enabled}
            onChange={(v) => set('return_window_reminders_enabled', v)}
          />
          <ToggleRow
            label="Refund reminders"
            checked={form.refund_reminders_enabled}
            onChange={(v) => set('refund_reminders_enabled', v)}
          />
        </Card>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-text-3">Timing</h2>
        <Card className="space-y-4">
          <Field label="Preferred reminder time" hint="When daily reminders are sent.">
            <Input
              type="time"
              value={form.preferred_reminder_time}
              onChange={(e) => set('preferred_reminder_time', e.target.value)}
              className="max-w-40"
            />
          </Field>
          <Field label="Review reminder" hint="Days after delivery to check your review.">
            <Input
              type="number"
              min={0}
              max={60}
              value={form.review_reminder_days}
              onChange={(e) => set('review_reminder_days', Math.max(0, Math.floor(Number(e.target.value))))}
              className="max-w-40"
              trailing="days"
            />
          </Field>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-text-3">
          Refund reminder frequency
        </h2>
        <Card>
          <RadioGroup
            value={form.refund_reminder_frequency}
            onChange={(v) => set('refund_reminder_frequency', v as RefundReminderFrequency)}
            options={[
              { value: 'DAILY', label: 'Daily' },
              { value: 'EVERY_2_DAYS', label: 'Every 2 days' },
              { value: 'EVERY_3_DAYS', label: 'Every 3 days' },
              { value: 'WEEKLY', label: 'Weekly' },
            ]}
          />
        </Card>
      </section>
    </div>
  )
}
