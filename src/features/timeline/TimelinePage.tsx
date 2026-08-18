import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Star, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, EmptyState, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToday } from '@/lib/useToday'
import { useOrders } from '@/api/orders'
import { buildUpcoming, withStates, type UpcomingItem, type UpcomingType } from '@/lib/orderInsights'
import { formatDateShort, formatMonthYear, relativeDay } from '@/domain'

const META: Record<UpcomingType, { icon: typeof Star; label: string; tone: string }> = {
  REVIEW: { icon: Star, label: 'Review check', tone: 'bg-warning-soft text-warning' },
  RETURN: { icon: Lock, label: 'Return window closes', tone: 'bg-info-soft text-info' },
  REFUND: { icon: Wallet, label: 'Refund expected', tone: 'bg-primary-soft text-primary' },
}

export default function TimelinePage() {
  const today = useToday()
  const { data: orders, isLoading } = useOrders()

  const groups = useMemo(() => {
    const items = buildUpcoming(withStates(orders ?? [], today), today)
    const map = new Map<string, UpcomingItem[]>()
    for (const item of items) {
      const key = formatMonthYear(item.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return [...map.entries()]
  }, [orders, today])

  return (
    <>
      <PageHeader title="Timeline" description="Upcoming reminders and key dates." />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Nothing scheduled"
          description="As you add orders and refund timelines, your reviews, return windows and refund dates appear here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([month, items]) => (
            <section key={month}>
              <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-text-3">{month}</h2>
              <Card padded={false} className="divide-y divide-border">
                {items.map((u, idx) => {
                  const meta = META[u.type]
                  const Icon = meta.icon
                  return (
                    <Link
                      key={`${u.order.id}-${u.type}-${idx}`}
                      to={`/app/orders/${u.order.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                    >
                      <div className="flex w-12 shrink-0 flex-col items-center">
                        <span className="text-lg font-extrabold leading-none text-text">
                          {formatDateShort(u.date).split(' ')[0]}
                        </span>
                        <span className="text-xs uppercase text-text-3">
                          {formatDateShort(u.date).split(' ')[1]}
                        </span>
                      </div>
                      <div className={cn('grid size-9 shrink-0 place-items-center rounded-full', meta.tone)}>
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
                        {relativeDay(u.date, today)}
                      </span>
                    </Link>
                  )
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
