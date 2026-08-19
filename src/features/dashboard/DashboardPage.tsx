import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Star, Lock, Wallet, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, EmptyState, OrderCardSkeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToday } from '@/lib/useToday'
import { useProfile } from '@/api/profile'
import { usePlatforms, platformName } from '@/api/platforms'
import { useOrders } from '@/api/orders'
import {
  actionItems,
  buildUpcoming,
  computeStats,
  withStates,
  type UpcomingType,
} from '@/lib/orderInsights'
import { statusVisual, urgencyTone } from '@/lib/statusStyles'
import { actionVisual } from '@/lib/statusStyles'
import { OrderCard } from '@/features/orders/OrderCard'
import { formatINR, formatDateShort, relativeDay, type PlainDate } from '@/domain'
import type { BadgeTone } from '@/components/ui'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const TONE_TEXT: Record<BadgeTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
  success: 'text-success',
  primary: 'text-primary',
  neutral: 'text-text-3',
}
const TONE_BORDER: Record<BadgeTone, string> = {
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-info',
  success: 'border-l-success',
  primary: 'border-l-primary',
  neutral: 'border-l-border-strong',
}

const UPCOMING_META: Record<UpcomingType, { icon: typeof Star; label: string }> = {
  REVIEW: { icon: Star, label: 'Review check' },
  RETURN: { icon: Lock, label: 'Return window closes' },
  REFUND: { icon: Wallet, label: 'Refund expected' },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const today = useToday()
  const { data: profile } = useProfile()
  const { data: orders, isLoading } = useOrders()
  const { data: platforms } = usePlatforms()

  const items = useMemo(() => withStates(orders ?? [], today), [orders, today])
  const actions = useMemo(() => actionItems(items), [items])
  const stats = useMemo(() => computeStats(items, today), [items, today])
  const upcoming = useMemo(() => buildUpcoming(items, today).slice(0, 5), [items, today])
  const recent = useMemo(() => items.slice(0, 4), [items])

  const firstName = profile?.full_name?.split(' ')[0]

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading…" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </>
    )
  }

  if ((orders?.length ?? 0) === 0) {
    return (
      <>
        <PageHeader title={`${greeting()}${firstName ? `, ${firstName}` : ''} 👋`} />
        <EmptyState
          icon="🛍️"
          title="Add your first order"
          description="Add an order once and we'll remind you about reviews, return windows and refunds."
          action={
            <Button leftIcon={<Plus className="size-4" />} onClick={() => navigate('/app/orders/new')}>
              Add your first order
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''} 👋`}
        description={
          actions.length
            ? "Here's what needs your attention today."
            : "You're all caught up — nothing needs action today."
        }
      />

      {/* Money headline — two hero cards. Both recompute automatically whenever
          an order is added, deleted or marked received. */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <HeroStat
          label="Pending Recovery"
          value={formatINR(stats.totalPendingAmount)}
          subtitle={`${stats.activeCount} order${stats.activeCount === 1 ? '' : 's'} in progress`}
          icon={Wallet}
          tone="primary"
        />
        <HeroStat
          label="Recovered"
          value={formatINR(stats.completedAmount)}
          subtitle={`${stats.completedCount} refund${stats.completedCount === 1 ? '' : 's'} received`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {/* Secondary stats */}
      <div className="no-scrollbar -mx-1 mb-6 flex gap-3 overflow-x-auto px-1 sm:grid sm:grid-cols-3">
        <StatCard label="Awaiting refund" value={formatINR(stats.pendingAmount)} />
        <StatCard label="Due this week" value={formatINR(stats.dueThisWeekAmount)} />
        <StatCard label="Active orders" value={String(stats.activeCount)} />
      </div>

      {/* Action required */}
      {actions.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-text-3">
            Action required
          </h2>
          <div className="space-y-2.5">
            {actions.map(({ order, state }) => {
              const tone = urgencyTone(state.urgency)
              const av = actionVisual(state.action)
              const visual = statusVisual(state.status)
              return (
                <Link key={order.id} to={`/app/orders/${order.id}`} className="block">
                  <Card interactive className={cn('flex items-center gap-4 border-l-4', TONE_BORDER[tone])}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">{order.product_name}</p>
                      <p className="truncate text-sm text-text-3">
                        {platformName(platforms, order.platform_id, order.custom_platform_name)} · #
                        {order.order_id}
                      </p>
                      <p className={cn('mt-1 text-sm font-semibold', TONE_TEXT[tone])}>
                        {visual.label}
                        {state.status === 'REFUND_OVERDUE' || state.status === 'REFUND_PENDING'
                          ? ` · ${formatINR(order.refund_amount)}`
                          : ''}
                      </p>
                    </div>
                    {av && (
                      <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">
                        {av.label}
                        <ArrowRight className="size-4" />
                      </span>
                    )}
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-text-3">Upcoming</h2>
          <Card padded={false} className="divide-y divide-border">
            {upcoming.map((u, idx) => {
              const meta = UPCOMING_META[u.type]
              const Icon = meta.icon
              return (
                <Link
                  key={`${u.order.id}-${u.type}-${idx}`}
                  to={`/app/orders/${u.order.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{meta.label}</p>
                    <p className="truncate text-sm text-text-3">{u.order.product_name}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-semibold',
                      u.overdue ? 'text-danger' : 'text-text-2',
                    )}
                  >
                    {labelForDate(u.date, today)}
                  </span>
                </Link>
              )
            })}
          </Card>
        </section>
      )}

      {/* Recent orders */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-3">Recent orders</h2>
          <Link to="/app/orders" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {recent.map((i) => (
            <OrderCard key={i.order.id} order={i.order} today={today} platforms={platforms} />
          ))}
        </div>
      </section>
    </>
  )
}

function labelForDate(date: PlainDate, today: PlainDate): string {
  const rel = relativeDay(date, today)
  return rel.includes('day') && !['Today', 'Tomorrow', 'Yesterday'].includes(rel)
    ? formatDateShort(date)
    : rel
}

function HeroStat({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  subtitle: string
  icon: typeof Wallet
  tone: 'primary' | 'success'
}) {
  return (
    <Card padded={false}>
      <div className="p-4">
        <div
          className={cn(
            'mb-2.5 grid size-9 place-items-center rounded-xl bg-surface-2',
            tone === 'success' ? 'text-success' : 'text-primary',
          )}
        >
          <Icon className="size-[18px]" />
        </div>
        <p className={cn('text-2xl font-extrabold', tone === 'success' ? 'text-success' : 'text-text')}>
          {value}
        </p>
        <p className="mt-1 text-sm font-bold text-text-2">{label}</p>
        <p className="mt-0.5 text-xs text-text-3">{subtitle}</p>
      </div>
    </Card>
  )
}

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'success'
}) {
  return (
    <Card className="min-w-40 shrink-0 sm:min-w-0" padded={false}>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-3">{label}</p>
        <p className={cn('mt-1 text-xl font-extrabold', tone === 'success' ? 'text-success' : 'text-text')}>
          {value}
        </p>
      </div>
    </Card>
  )
}
