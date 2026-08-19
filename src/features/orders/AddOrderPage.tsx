import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, Field, Input, Select, Stepper, useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import { usePlatforms, isOtherPlatform, platformName } from '@/api/platforms'
import { useAccounts } from '@/api/accounts'
import { useCreateOrder } from '@/api/orders'
import { AccountFormModal } from '@/features/accounts/AccountFormModal'
import { useToday } from '@/lib/useToday'
import { friendlyError } from '@/lib/errors'
import {
  compareDates,
  detectPlatformSlug,
  formatINR,
  validateDeliveryDate,
  validateOrderId,
  validateProductName,
  validateRefundAmount,
  validateReturnWindowDate,
} from '@/domain'

type OrderMode = 'new' | 'existing'
type StepKey = 'where' | 'details' | 'dates' | 'review'

export default function AddOrderPage() {
  const navigate = useNavigate()
  const today = useToday()
  const { toast } = useToast()
  const { data: platforms } = usePlatforms()
  const { data: accounts } = useAccounts()
  const createOrder = useCreateOrder()

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<OrderMode>('new')
  const [platformId, setPlatformId] = useState('')
  const [customPlatform, setCustomPlatform] = useState('')
  const [accountId, setAccountId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [productName, setProductName] = useState('')
  const [amount, setAmount] = useState('')
  // Dates — only used in "existing" mode.
  const [orderDate, setOrderDate] = useState(today)
  const [delivered, setDelivered] = useState(true)
  const [deliveryDate, setDeliveryDate] = useState(today)
  const [returnDate, setReturnDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)

  const isOther = isOtherPlatform(platforms, platformId)
  const platformAccounts = (accounts ?? []).filter((a) => a.platform_id === platformId)

  // "Existing" orders get an extra step to capture the real dates.
  const stepKeys: StepKey[] =
    mode === 'existing' ? ['where', 'details', 'dates', 'review'] : ['where', 'details', 'review']
  const totalSteps = stepKeys.length
  const stepKey = stepKeys[Math.min(step, totalSteps) - 1]
  const isLast = step === totalSteps

  // Auto-detect the platform from the order ID's format.
  const detectedSlug = detectPlatformSlug(orderId)
  const detectedPlatform = detectedSlug ? platforms?.find((p) => p.slug === detectedSlug) : undefined

  function onPlatformChange(value: string) {
    setPlatformId(value)
    setAccountId('')
    setCustomPlatform('')
    setError(null)
  }

  function onOrderIdChange(value: string) {
    setOrderId(value)
    setError(null)
    const slug = detectPlatformSlug(value)
    if (!slug) return
    const match = platforms?.find((p) => p.slug === slug)
    // Only switch when it's a different platform — don't clobber an account the
    // user just picked for the already-correct platform.
    if (match && match.id !== platformId) {
      setPlatformId(match.id)
      setAccountId('')
      setCustomPlatform('')
    }
  }

  function validateStep(): string | null {
    if (stepKey === 'where') {
      const oid = validateOrderId(orderId)
      if (!oid.valid) return oid.error
      if (!platformId) return 'Choose where you bought it.'
      if (isOther && !customPlatform.trim()) return 'Enter the platform name.'
      if (!accountId) return 'Choose an account, or add one.'
    }
    if (stepKey === 'details') {
      const pn = validateProductName(productName)
      if (!pn.valid) return pn.error
      const amt = validateRefundAmount(Number(amount))
      if (!amt.valid) return amt.error
    }
    if (stepKey === 'dates') {
      if (!orderDate) return 'Enter the order date.'
      if (compareDates(orderDate, today) > 0) return 'Order date can’t be in the future.'
      if (delivered) {
        const d = validateDeliveryDate(deliveryDate, orderDate)
        if (!d.valid) return d.error
        if (compareDates(deliveryDate, today) > 0) return 'Delivery date can’t be in the future.'
        if (!returnDate) return 'Enter when the return window closes.'
        const r = validateReturnWindowDate(returnDate, deliveryDate)
        if (!r.valid) return r.error
      }
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) return setError(err)
    setError(null)
    setStep((s) => Math.min(totalSteps, s + 1))
  }

  function back() {
    setError(null)
    if (step === 1) navigate(-1)
    else setStep((s) => s - 1)
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    const id = crypto.randomUUID()
    const base = {
      id,
      platform_id: platformId,
      account_id: accountId || null,
      custom_platform_name: isOther ? customPlatform.trim() : null,
      order_id: orderId.trim(),
      product_name: productName.trim(),
      refund_amount: Number(amount),
    }
    const input =
      mode === 'new'
        ? { ...base, order_date: today }
        : {
            ...base,
            order_date: orderDate,
            ...(delivered
              ? {
                  is_delivered: true,
                  delivery_date: deliveryDate,
                  return_window_close_date: returnDate,
                  review_status: 'PENDING' as const,
                }
              : {}),
          }
    try {
      await createOrder.mutateAsync(input)
      toast({
        tone: 'success',
        title: 'Order added 🎉',
        description: "We'll remind you when it's time to take action.",
      })
      navigate(`/app/orders/${id}`, { replace: true })
    } catch (e) {
      setError(friendlyError(e, "Couldn't save the order."))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Add order" back />
      <Stepper total={totalSteps} current={step} className="mb-6" />

      <Card className="min-h-70">
        {stepKey === 'where' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Is this a new or existing order?</h2>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard
                active={mode === 'new'}
                onClick={() => {
                  setMode('new')
                  setError(null)
                }}
                title="New order"
                subtitle="I just ordered this today"
              />
              <ChoiceCard
                active={mode === 'existing'}
                onClick={() => {
                  setMode('existing')
                  setError(null)
                }}
                title="Existing order"
                subtitle="I ordered this earlier"
              />
            </div>

            <h2 className="pt-2 text-lg font-bold">Where did you buy it?</h2>
            <Field label="Order ID" required hint="Paste it and we'll auto-detect the platform.">
              <Input
                placeholder="e.g. 403-2345345-5105954"
                value={orderId}
                onChange={(e) => onOrderIdChange(e.target.value)}
              />
            </Field>
            {detectedPlatform && (
              <p className="-mt-2 flex items-center gap-1.5 text-sm font-medium text-success">
                <Sparkles className="size-3.5" />
                Looks like {detectedPlatform.name} — selected below.
              </p>
            )}
            <Field label="Platform" required>
              <Select value={platformId} onChange={(e) => onPlatformChange(e.target.value)}>
                <option value="" disabled>
                  Select a platform
                </option>
                {platforms?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            {isOther && (
              <Field label="Platform name" required>
                <Input
                  placeholder="e.g. Nykaa"
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                />
              </Field>
            )}

            <Field label="Account" required>
              <Select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={!platformId}
              >
                <option value="" disabled>
                  {platformId ? 'Select an account' : 'Choose a platform first'}
                </option>
                {platformAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}
                    {a.account_identifier ? ` · ${a.account_identifier}` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            {platformId && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setAccountModalOpen(true)}
              >
                Add account
              </Button>
            )}
          </div>
        )}

        {stepKey === 'details' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Tell us about the order</h2>
            <Field label="Product name" required>
              <Input
                placeholder="Noise Headphones"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </Field>
            <Field label="Refund amount" required hint="What you expect to get back.">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                leading="₹"
                placeholder="1499"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </div>
        )}

        {stepKey === 'dates' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">When was this order?</h2>
            <p className="text-[15px] text-text-2">
              Enter the real dates so reminders and emails fire at the right time.
            </p>
            <Field label="Order date" required>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </Field>
            <Field label="Has it been delivered?">
              <div className="grid grid-cols-2 gap-2">
                <ChoiceCard
                  active={delivered}
                  onClick={() => setDelivered(true)}
                  title="Yes, delivered"
                  subtitle="Set the delivery date"
                />
                <ChoiceCard
                  active={!delivered}
                  onClick={() => setDelivered(false)}
                  title="Not yet"
                  subtitle="Still on the way"
                />
              </div>
            </Field>
            {delivered && (
              <>
                <Field label="Delivery date" required>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </Field>
                <Field
                  label="When does the return window close?"
                  required
                  hint="Check the platform's return policy for this product."
                >
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {stepKey === 'review' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">You're all set 🎉</h2>
            <p className="text-[15px] text-text-2">
              Review the details, then we'll start tracking this order for you.
            </p>
            <dl className="divide-y divide-border rounded-md border border-border">
              <SummaryRow label="Type" value={mode === 'new' ? 'New order' : 'Existing order'} />
              <SummaryRow label="Platform" value={platformName(platforms, platformId, customPlatform)} />
              <SummaryRow
                label="Account"
                value={platformAccounts.find((a) => a.id === accountId)?.account_name ?? '—'}
              />
              <SummaryRow label="Order ID" value={orderId} />
              <SummaryRow label="Product" value={productName} />
              <SummaryRow label="Refund" value={formatINR(Number(amount) || 0)} />
              <SummaryRow label="Order date" value={mode === 'new' ? today : orderDate} />
              {mode === 'existing' && delivered && (
                <SummaryRow label="Delivered" value={deliveryDate} />
              )}
              {mode === 'existing' && delivered && (
                <SummaryRow label="Return window closes" value={returnDate} />
              )}
            </dl>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </Card>

      {/* Sticky action bar */}
      <div className="sticky bottom-20 z-10 mt-5 lg:bottom-0 lg:pb-2">
        <div className="flex gap-3 rounded-xl border border-border bg-surface/95 p-3 shadow-md backdrop-blur">
          <Button variant="secondary" onClick={back} leftIcon={<ArrowLeft className="size-4" />}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {!isLast ? (
            <Button fullWidth onClick={next} rightIcon={<ArrowRight className="size-4" />}>
              Continue
            </Button>
          ) : (
            <Button fullWidth onClick={submit} loading={submitting}>
              Add order
            </Button>
          )}
        </div>
      </div>

      <AccountFormModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        presetPlatformId={platformId}
        onSaved={(id) => setAccountId(id)}
      />
    </div>
  )
}

function ChoiceCard({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors',
        active
          ? 'border-primary bg-primary-soft'
          : 'border-border bg-surface hover:bg-surface-2',
      )}
    >
      <span className="flex w-full items-center justify-between">
        <span className={cn('text-sm font-bold', active ? 'text-primary' : 'text-text')}>{title}</span>
        {active && <Check className="size-4 text-primary" />}
      </span>
      <span className="text-xs text-text-2">{subtitle}</span>
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-sm text-text-3">{label}</dt>
      <dd className="truncate text-sm font-semibold text-text">{value}</dd>
    </div>
  )
}
