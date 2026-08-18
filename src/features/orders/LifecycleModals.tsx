import { useEffect, useState } from 'react'
import { Button, Field, Input, Modal, useToast } from '@/components/ui'
import { friendlyError } from '@/lib/errors'
import {
  useMarkDelivered,
  useMarkRefundReceived,
  useSaveRefundForm,
  type OrderWithRefund,
} from '@/api/orders'
import {
  calculateExpectedDate,
  validateDeliveryDate,
  validateRefundAmount,
  validateRefundReceivedDate,
  validateReturnWindowDate,
  validateTimelineValue,
  type PlainDate,
  type TimelineUnit,
} from '@/domain'
import { WorkingDaysCalculator } from './WorkingDaysCalculator'

interface BaseProps {
  open: boolean
  onClose: () => void
  order: OrderWithRefund
  today: PlainDate
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
      {error}
    </p>
  )
}

export function DeliveryModal({ open, onClose, order, today }: BaseProps) {
  const markDelivered = useMarkDelivered()
  const { toast } = useToast()
  const [deliveryDate, setDeliveryDate] = useState<PlainDate>(order.delivery_date ?? today)
  const [returnDate, setReturnDate] = useState<string>(order.return_window_close_date ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDeliveryDate(order.delivery_date ?? today)
    setReturnDate(order.return_window_close_date ?? '')
  }, [open, order, today])

  async function save() {
    setError(null)
    const d = validateDeliveryDate(deliveryDate, order.order_date)
    if (!d.valid) return setError(d.error)
    if (!returnDate) return setError('Enter when the return window closes.')
    const r = validateReturnWindowDate(returnDate, deliveryDate)
    if (!r.valid) return setError(r.error)
    try {
      await markDelivered.mutateAsync({ id: order.id, deliveryDate, returnWindowDate: returnDate })
      toast({ tone: 'success', title: 'Marked as delivered' })
      onClose()
    } catch (e) {
      setError(friendlyError(e))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Product delivered 🎉"
      description="We'll remind you to check your review and when the return window closes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={markDelivered.isPending}>
            Continue
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Delivery date" required>
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </Field>
        <Field label="When does the return window close?" required>
          <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
        </Field>
        <ErrorLine error={error} />
      </div>
    </Modal>
  )
}

export function RefundFormModal({
  open,
  onClose,
  order,
  today,
  holidays,
}: BaseProps & { holidays: ReadonlySet<PlainDate> }) {
  const save = useSaveRefundForm()
  const { toast } = useToast()
  const refund = order.refund

  const [amount, setAmount] = useState(String(order.refund_amount))
  const [unit, setUnit] = useState<TimelineUnit>(refund?.timeline_unit ?? 'WORKING_DAYS')
  const [value, setValue] = useState<number>(refund?.timeline_value ?? 30)
  const [filledDate, setFilledDate] = useState<PlainDate>(refund?.refund_form_filled_date ?? today)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setAmount(String(order.refund_amount))
    setUnit(refund?.timeline_unit ?? 'WORKING_DAYS')
    setValue(refund?.timeline_value ?? 30)
    setFilledDate(refund?.refund_form_filled_date ?? today)
  }, [open, order, refund, today])

  async function submit() {
    setError(null)
    const amt = validateRefundAmount(Number(amount))
    if (!amt.valid) return setError(amt.error)
    const tv = validateTimelineValue(value)
    if (!tv.valid) return setError(tv.error)
    if (!filledDate) return setError('Enter the date you filled the refund form.')

    const expectedDate = calculateExpectedDate({
      startDate: filledDate,
      duration: value,
      type: unit,
      holidays,
    })

    try {
      await save.mutateAsync({
        id: order.id,
        filledDate,
        timelineValue: value,
        timelineUnit: unit,
        expectedDate,
        refundAmount: Number(amount),
      })
      toast({ tone: 'success', title: 'Refund details saved', description: 'We’ll remind you when it’s due.' })
      onClose()
    } catch (e) {
      setError(friendlyError(e))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Refund details"
      description={`${order.product_name}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            Save refund details
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Refund amount" required>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            leading="₹"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="When did you fill the refund form?" required>
          <Input type="date" value={filledDate} onChange={(e) => setFilledDate(e.target.value)} />
        </Field>
        <Field label="How long should the refund take?">
          <WorkingDaysCalculator
            value={value}
            unit={unit}
            startDate={filledDate || today}
            holidays={holidays}
            onValueChange={setValue}
            onUnitChange={setUnit}
          />
        </Field>
        <ErrorLine error={error} />
      </div>
    </Modal>
  )
}

export function MarkReceivedModal({
  open,
  onClose,
  order,
  today,
  onCelebrate,
}: BaseProps & { onCelebrate?: () => void }) {
  const markReceived = useMarkRefundReceived()
  const { toast } = useToast()
  const refund = order.refund

  const [amount, setAmount] = useState(String(refund?.actual_refund_amount ?? order.refund_amount))
  const [receivedDate, setReceivedDate] = useState<PlainDate>(refund?.refund_received_date ?? today)
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setAmount(String(refund?.actual_refund_amount ?? order.refund_amount))
    setReceivedDate(refund?.refund_received_date ?? today)
    setReference('')
  }, [open, order, refund, today])

  async function submit() {
    setError(null)
    const amt = validateRefundAmount(Number(amount))
    if (!amt.valid) return setError(amt.error)
    const rd = validateRefundReceivedDate(receivedDate, refund?.refund_form_filled_date ?? null)
    if (!rd.valid) return setError(rd.error)
    try {
      await markReceived.mutateAsync({
        id: order.id,
        amount: Number(amount),
        receivedDate,
        reference: reference.trim() || null,
      })
      onClose()
      onCelebrate?.()
      toast({ tone: 'success', title: 'Refund received!', description: 'Order completed — reminders stopped.' })
    } catch (e) {
      setError(friendlyError(e))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Refund received! 🎉"
      description="Nice — let's close this one out."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={markReceived.isPending}>
            Mark as paid
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="How much did you receive?" required>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            leading="₹"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Received on" required>
          <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
        </Field>
        <Field label="Payment reference" hint="Optional — UTR / transaction id.">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UTR123456" />
        </Field>
        <ErrorLine error={error} />
      </div>
    </Modal>
  )
}
