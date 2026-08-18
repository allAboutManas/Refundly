import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Package, Star, Trash2, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Confetti,
  EmptyState,
  useToast,
} from '@/components/ui'
import { statusVisual } from '@/lib/statusStyles'
import { toOrderView } from '@/lib/orderView'
import { useToday } from '@/lib/useToday'
import { friendlyError } from '@/lib/errors'
import { usePlatforms, platformName } from '@/api/platforms'
import { useAccounts } from '@/api/accounts'
import { useHolidaySet } from '@/api/holidays'
import {
  useDeleteOrder,
  useMarkRefundRequested,
  useOrder,
  useUpdateReviewStatus,
  type OrderWithRefund,
} from '@/api/orders'
import {
  deriveState,
  dueLabel,
  formatDateLong,
  formatINR,
  statusLabel,
  type DerivedState,
  type PlainDate,
} from '@/domain'
import { OrderTimeline } from './OrderTimeline'
import { DeliveryModal, MarkReceivedModal, RefundFormModal } from './LifecycleModals'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const today = useToday()

  const { data: order, isLoading, isError, refetch } = useOrder(id)
  const { data: platforms } = usePlatforms()
  const { data: accounts } = useAccounts()
  const holidays = useHolidaySet()

  const reviewMut = useUpdateReviewStatus()
  const requestedMut = useMarkRefundRequested()
  const deleteMut = useDeleteOrder()

  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [receivedOpen, setReceivedOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  if (isLoading) return <FullScreenLoader />
  if (isError) {
    return (
      <EmptyState
        icon="⚠️"
        title="Couldn't load this order"
        description="Something went wrong."
        action={<Button variant="secondary" onClick={() => refetch()}>Try again</Button>}
      />
    )
  }
  if (!order) {
    return (
      <EmptyState
        icon="🔍"
        title="Order not found"
        description="It may have been deleted."
        action={<Button onClick={() => navigate('/app/orders')}>Back to orders</Button>}
      />
    )
  }

  const state = deriveState(toOrderView(order), { today })
  const visual = statusVisual(state.status)
  const platform = platformName(platforms, order.platform_id, order.custom_platform_name)
  const account = accounts?.find((a) => a.id === order.account_id)?.account_name

  async function setReview(status: 'SUBMITTED' | 'NOT_REQUIRED') {
    try {
      await reviewMut.mutateAsync({ id: order!.id, status, eventDate: today })
      toast({ tone: 'success', title: status === 'SUBMITTED' ? 'Marked as reviewed' : 'Review skipped' })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not update', description: friendlyError(e) })
    }
  }

  async function markRequested() {
    try {
      await requestedMut.mutateAsync({ id: order!.id, requestedDate: today })
      toast({ tone: 'success', title: 'Follow-up noted' })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not update', description: friendlyError(e) })
    }
  }

  async function confirmDelete() {
    try {
      await deleteMut.mutateAsync(order!.id)
      toast({ tone: 'success', title: 'Order deleted' })
      navigate('/app/orders', { replace: true })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not delete', description: friendlyError(e) })
    }
  }

  const showReviewCard = order.is_delivered && order.review_status === 'PENDING'
  const refund = order.refund

  return (
    <div className="mx-auto max-w-2xl">
      {celebrate && <Confetti />}
      <PageHeader title="Order" back />

      {/* Header summary */}
      <Card className="flex gap-4">
        <HeaderIcon />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-extrabold leading-tight text-text">{order.product_name}</h1>
            <Badge tone={visual.tone} dot>
              {statusLabel(state.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-text-3">
            {platform}
            {account ? ` · ${account}` : ''} · #{order.order_id}
          </p>
          <p className="mt-2 text-xl font-extrabold text-text">{formatINR(order.refund_amount)}</p>
        </div>
      </Card>

      {/* Next action hero */}
      <div className="mt-4">
        <NextActionCard
          order={order}
          state={state}
          today={today}
          onDelivery={() => setDeliveryOpen(true)}
          onRefundForm={() => setRefundOpen(true)}
          onReceived={() => setReceivedOpen(true)}
          onFollowUp={markRequested}
          followUpBusy={requestedMut.isPending}
        />
      </div>

      {/* Review reminder (orthogonal) */}
      {showReviewCard && (
        <Card className="mt-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-warning-soft text-warning">
              <Star className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text">Have you reviewed this product?</p>
              <p className="mt-0.5 text-sm text-text-2">
                {state.reviewReminderDate
                  ? `Review check ${dueLabel(state.reviewReminderDate, today)}.`
                  : 'Check whether it needs a review or rating.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setReview('SUBMITTED')} loading={reviewMut.isPending}>
                  Mark reviewed
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setReview('NOT_REQUIRED')}>
                  Not needed
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Refund details (once the form is filled) */}
      {refund?.refund_form_filled && !refund.refund_received && (
        <Card className="mt-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-3">Refund</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Amount" value={formatINR(order.refund_amount)} />
            {refund.refund_form_filled_date && (
              <Row label="Requested" value={formatDateLong(refund.refund_form_filled_date)} />
            )}
            {refund.expected_refund_date && (
              <Row label="Expected" value={formatDateLong(refund.expected_refund_date)} strong />
            )}
            {refund.timeline_value && refund.timeline_unit && (
              <Row
                label="Timeline"
                value={`${refund.timeline_value} ${refund.timeline_unit === 'WORKING_DAYS' ? 'working' : 'calendar'} days`}
              />
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {!refund.refund_requested && (
              <Button size="sm" variant="secondary" onClick={markRequested} loading={requestedMut.isPending}>
                Mark follow-up done
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setRefundOpen(true)}>
              Edit refund details
            </Button>
          </div>
        </Card>
      )}

      {/* Lifecycle timeline */}
      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-3">Lifecycle</h2>
        <OrderTimeline order={order} today={today} />
      </Card>

      {/* Meta + danger zone */}
      <Card className="mt-4">
        <dl className="space-y-2 text-sm">
          {order.order_date && <Row label="Order date" value={formatDateLong(order.order_date)} />}
          {order.delivery_date && <Row label="Delivered" value={formatDateLong(order.delivery_date)} />}
          {order.notes && <Row label="Notes" value={order.notes} />}
        </dl>
        <div className="mt-4 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            leftIcon={<Trash2 className="size-4" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete order
          </Button>
        </div>
      </Card>

      {/* Modals */}
      <DeliveryModal open={deliveryOpen} onClose={() => setDeliveryOpen(false)} order={order} today={today} />
      <RefundFormModal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        order={order}
        today={today}
        holidays={holidays}
      />
      <MarkReceivedModal
        open={receivedOpen}
        onClose={() => setReceivedOpen(false)}
        order={order}
        today={today}
        onCelebrate={() => setCelebrate(true)}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete this order?"
        description="This permanently removes the order and its refund history."
        confirmLabel="Delete"
      />
    </div>
  )
}

function HeaderIcon() {
  return (
    <div className="grid size-20 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-text-3">
      <Package className="size-7" />
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-text-3">{label}</dt>
      <dd className={strong ? 'text-right font-bold text-text' : 'text-right font-medium text-text'}>
        {value}
      </dd>
    </div>
  )
}

interface HeroProps {
  order: OrderWithRefund
  state: DerivedState
  today: PlainDate
  onDelivery: () => void
  onRefundForm: () => void
  onReceived: () => void
  onFollowUp: () => void
  followUpBusy: boolean
}

function NextActionCard({
  order,
  state,
  today,
  onDelivery,
  onRefundForm,
  onReceived,
  onFollowUp,
  followUpBusy,
}: HeroProps) {
  const base = 'rounded-lg border p-5'

  switch (state.status) {
    case 'ORDERED':
      return (
        <div className={`${base} border-border bg-surface`}>
          <p className="text-lg font-bold text-text">📦 Has your order arrived?</p>
          <p className="mt-1 text-[15px] text-text-2">
            Mark it delivered and tell us when the return window closes.
          </p>
          <Button className="mt-4" onClick={onDelivery}>
            Yes, it's delivered
          </Button>
        </div>
      )
    case 'DELIVERED':
    case 'RETURN_WINDOW_OPEN':
      return (
        <div className={`${base} border-border bg-surface`}>
          <p className="text-lg font-bold text-text">Tracking your return window</p>
          <p className="mt-1 text-[15px] text-text-2">
            {order.return_window_close_date
              ? `The return window closes ${formatDateLong(order.return_window_close_date)}. We'll let you know when you can fill the refund form.`
              : 'Add a return-window date so we can time your refund reminders.'}
          </p>
          {!order.return_window_close_date && (
            <Button className="mt-4" variant="secondary" onClick={onDelivery}>
              Add delivery details
            </Button>
          )}
        </div>
      )
    case 'RETURN_WINDOW_CLOSED':
      return (
        <div className={`${base} border-warning/30 bg-warning-soft`}>
          <p className="text-lg font-bold text-text">🔒 Return window closed</p>
          <p className="mt-1 text-[15px] text-text-2">You can now fill the refund form.</p>
          <Button className="mt-4" onClick={onRefundForm} leftIcon={<Wallet className="size-4" />}>
            Fill refund form
          </Button>
        </div>
      )
    case 'REFUND_PENDING':
      return (
        <div className={`${base} border-primary/25 bg-primary-soft`}>
          <p className="text-lg font-bold text-text">💰 Refund pending</p>
          <p className="mt-1 text-[15px] text-text-2">
            {state.focusDate
              ? `Expected ${formatDateLong(state.focusDate)}. We'll remind you when it's due.`
              : "We'll remind you when it's due."}
          </p>
          <Button className="mt-4" variant="secondary" onClick={onReceived}>
            Mark as received
          </Button>
        </div>
      )
    case 'REFUND_OVERDUE':
      return (
        <div className={`${base} border-danger/30 bg-danger-soft`}>
          <p className="text-lg font-bold text-text">🚨 Refund overdue</p>
          <p className="mt-1 text-[15px] text-text-2">
            {state.focusDate
              ? `Expected ${formatDateLong(state.focusDate)} — ${dueLabel(state.focusDate, today)}. Time to follow up.`
              : 'Time to follow up on your refund.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onReceived}>Mark as received</Button>
            <Button variant="secondary" onClick={onFollowUp} loading={followUpBusy}>
              I followed up
            </Button>
          </div>
        </div>
      )
    case 'COMPLETED':
      return (
        <div className={`${base} border-success/30 bg-success-soft`}>
          <p className="text-lg font-bold text-text">✅ Refund received</p>
          <p className="mt-1 text-[15px] text-text-2">
            {order.refund?.refund_received_date
              ? `Completed on ${formatDateLong(order.refund.refund_received_date)}. Reminders stopped.`
              : 'This order is complete. Reminders stopped.'}
          </p>
        </div>
      )
  }
}
