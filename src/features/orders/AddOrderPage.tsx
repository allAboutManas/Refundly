import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, Field, Input, Select, Stepper, useToast } from '@/components/ui'
import { usePlatforms, isOtherPlatform, platformName } from '@/api/platforms'
import { useAccounts } from '@/api/accounts'
import { useCreateOrder } from '@/api/orders'
import { AccountFormModal } from '@/features/accounts/AccountFormModal'
import { useToday } from '@/lib/useToday'
import { friendlyError } from '@/lib/errors'
import {
  detectPlatformSlug,
  formatINR,
  validateOrderId,
  validateProductName,
  validateRefundAmount,
} from '@/domain'

const TOTAL_STEPS = 3

export default function AddOrderPage() {
  const navigate = useNavigate()
  const today = useToday()
  const { toast } = useToast()
  const { data: platforms } = usePlatforms()
  const { data: accounts } = useAccounts()
  const createOrder = useCreateOrder()

  const [step, setStep] = useState(1)
  const [platformId, setPlatformId] = useState('')
  const [customPlatform, setCustomPlatform] = useState('')
  const [accountId, setAccountId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [productName, setProductName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)

  const isOther = isOtherPlatform(platforms, platformId)
  const platformAccounts = (accounts ?? []).filter((a) => a.platform_id === platformId)

  // Auto-detect the platform from the order ID's format.
  const detectedSlug = detectPlatformSlug(orderId)
  const detectedPlatform = detectedSlug
    ? platforms?.find((p) => p.slug === detectedSlug)
    : undefined

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
    if (step === 1) {
      const oid = validateOrderId(orderId)
      if (!oid.valid) return oid.error
      if (!platformId) return 'Choose where you bought it.'
      if (isOther && !customPlatform.trim()) return 'Enter the platform name.'
      if (!accountId) return 'Choose an account, or add one.'
    }
    if (step === 2) {
      const pn = validateProductName(productName)
      if (!pn.valid) return pn.error
      const amt = validateRefundAmount(Number(amount))
      if (!amt.valid) return amt.error
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) return setError(err)
    setError(null)
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
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
    try {
      await createOrder.mutateAsync({
        id,
        platform_id: platformId,
        account_id: accountId || null,
        custom_platform_name: isOther ? customPlatform.trim() : null,
        order_id: orderId.trim(),
        product_name: productName.trim(),
        refund_amount: Number(amount),
        order_date: today,
      })
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
      <Stepper total={TOTAL_STEPS} current={step} className="mb-6" />

      <Card className="min-h-70">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Where did you buy it?</h2>
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

        {step === 2 && (
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

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">You're all set 🎉</h2>
            <p className="text-[15px] text-text-2">
              Review the details, then we'll start tracking this order for you.
            </p>
            <dl className="divide-y divide-border rounded-md border border-border">
              <SummaryRow label="Platform" value={platformName(platforms, platformId, customPlatform)} />
              <SummaryRow
                label="Account"
                value={platformAccounts.find((a) => a.id === accountId)?.account_name ?? '—'}
              />
              <SummaryRow label="Order ID" value={orderId} />
              <SummaryRow label="Product" value={productName} />
              <SummaryRow label="Refund" value={formatINR(Number(amount) || 0)} />
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
          {step < TOTAL_STEPS ? (
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-sm text-text-3">{label}</dt>
      <dd className="truncate text-sm font-semibold text-text">{value}</dd>
    </div>
  )
}
