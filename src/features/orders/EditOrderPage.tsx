import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { Button, Card, EmptyState, Field, Input, Select, useToast } from '@/components/ui'
import { usePlatforms, isOtherPlatform } from '@/api/platforms'
import { useAccounts } from '@/api/accounts'
import { useOrder, useUpdateOrderFields } from '@/api/orders'
import { AccountFormModal } from '@/features/accounts/AccountFormModal'
import { friendlyError } from '@/lib/errors'
import { validateOrderId, validateProductName, validateRefundAmount } from '@/domain'

/**
 * Edit an existing order's core details. Available for any order that isn't yet
 * marked as refund received — a paid order is locked (undo the receipt to edit it
 * again). Delivery / return-window / refund dates are managed by the lifecycle
 * cards on the order screen, so they're intentionally not here.
 */
export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: order, isLoading } = useOrder(id)
  const { data: platforms } = usePlatforms()
  const { data: accounts } = useAccounts()
  const updateOrder = useUpdateOrderFields()

  const [platformId, setPlatformId] = useState('')
  const [customPlatform, setCustomPlatform] = useState('')
  const [accountId, setAccountId] = useState('')
  const [orderId, setOrderId] = useState('')
  const [productName, setProductName] = useState('')
  const [amount, setAmount] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [ready, setReady] = useState(false)

  // Prefill once the order loads.
  useEffect(() => {
    if (!order || ready) return
    setPlatformId(order.platform_id ?? '')
    setCustomPlatform(order.custom_platform_name ?? '')
    setAccountId(order.account_id ?? '')
    setOrderId(order.order_id)
    setProductName(order.product_name)
    setAmount(order.refund_amount != null ? String(order.refund_amount) : '')
    setOrderDate(order.order_date ?? '')
    setNotes(order.notes ?? '')
    setReady(true)
  }, [order, ready])

  const isOther = isOtherPlatform(platforms, platformId)
  const platformAccounts = (accounts ?? []).filter((a) => a.platform_id === platformId)

  if (isLoading || !order) return <FullScreenLoader />

  // Locked once the refund is received. Entry points hide the edit button, but
  // guard direct navigation too.
  if (order.refund?.refund_received) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="Edit order" back />
        <EmptyState
          icon="🔒"
          title="This order is locked"
          description="It's marked as refund received. Undo that on the order screen to edit it again."
          action={
            <Button variant="secondary" onClick={() => navigate(`/app/orders/${order.id}`)}>
              Back to order
            </Button>
          }
        />
      </div>
    )
  }

  function onPlatformChange(value: string) {
    setPlatformId(value)
    setAccountId('')
    setCustomPlatform('')
    setError(null)
  }

  function validate(): string | null {
    const pn = validateProductName(productName)
    if (!pn.valid) return pn.error
    const oid = validateOrderId(orderId)
    if (!oid.valid) return oid.error
    if (!platformId) return 'Choose where you bought it.'
    if (isOther && !customPlatform.trim()) return 'Enter the platform name.'
    const amt = validateRefundAmount(Number(amount))
    if (!amt.valid) return amt.error
    return null
  }

  async function submit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await updateOrder.mutateAsync({
        id: order!.id,
        patch: {
          platform_id: platformId,
          account_id: accountId || null,
          custom_platform_name: isOther ? customPlatform.trim() : null,
          order_id: orderId.trim(),
          product_name: productName.trim(),
          refund_amount: Number(amount),
          order_date: orderDate || null,
          notes: notes.trim() || null,
        },
      })
      toast({ tone: 'success', title: 'Order updated' })
      navigate(`/app/orders/${order!.id}`)
    } catch (e) {
      setError(friendlyError(e, "Couldn't save changes."))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit order" back />

      <Card>
        <div className="space-y-4">
          <Field label="Product name" required>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Noise Headphones"
            />
          </Field>
          <Field label="Order ID" required>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          </Field>
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
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                placeholder="e.g. Nykaa"
              />
            </Field>
          )}
          <Field label="Account">
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={!platformId}
            >
              <option value="">{platformId ? 'No account' : 'Choose a platform first'}</option>
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
          <Field label="Refund amount" required hint="What you expect to get back.">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              leading="₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1499"
            />
          </Field>
          <Field label="Order date">
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember"
            />
          </Field>
          {error && (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      </Card>

      {/* Sticky action bar */}
      <div className="sticky bottom-20 z-10 mt-5 lg:bottom-0 lg:pb-2">
        <div className="flex gap-3 rounded-xl border border-border bg-surface/95 p-3 shadow-md backdrop-blur">
          <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="size-4" />}>
            Cancel
          </Button>
          <Button fullWidth onClick={submit} loading={submitting}>
            Save changes
          </Button>
        </div>
      </div>

      <AccountFormModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        presetPlatformId={platformId}
        onSaved={(accId) => setAccountId(accId)}
      />
    </div>
  )
}
