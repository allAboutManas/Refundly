import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, EmptyState, Input, OrderCardSkeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useToday } from '@/lib/useToday'
import { withStates, type OrderWithState } from '@/lib/orderInsights'
import { usePlatforms, platformName } from '@/api/platforms'
import { useOrders } from '@/api/orders'
import { OrderCard } from './OrderCard'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Action needed' },
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

function matchesFilter(i: OrderWithState, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'action':
      return (i.state.urgency === 'overdue' || i.state.urgency === 'today') && i.state.action !== 'NONE'
    case 'pending':
      return i.state.status === 'REFUND_PENDING'
    case 'overdue':
      return i.state.status === 'REFUND_OVERDUE'
    case 'completed':
      return i.state.status === 'COMPLETED'
  }
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const today = useToday()
  const { data: orders, isLoading, isError, refetch } = useOrders()
  const { data: platforms } = usePlatforms()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  const items = useMemo(() => withStates(orders ?? [], today), [orders, today])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (!matchesFilter(i, filter)) return false
      if (!q) return true
      const platform = platformName(platforms, i.order.platform_id, i.order.custom_platform_name)
      return (
        i.order.product_name.toLowerCase().includes(q) ||
        i.order.order_id.toLowerCase().includes(q) ||
        platform.toLowerCase().includes(q)
      )
    })
  }, [items, filter, search, platforms])

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every product you're tracking."
        action={
          <Button
            className="hidden sm:inline-flex"
            leftIcon={<Plus className="size-4" />}
            onClick={() => navigate('/app/orders/new')}
          >
            Add order
          </Button>
        }
      />

      {(orders?.length ?? 0) > 0 && (
        <div className="mb-5 space-y-3">
          <Input
            placeholder="Search product, order ID or platform…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leading={<Search className="size-4" />}
          />
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  filter === f.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface text-text-2 hover:bg-surface-2',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Couldn't load orders"
          description="Something went wrong."
          action={<Button variant="secondary" onClick={() => refetch()}>Try again</Button>}
        />
      ) : (orders?.length ?? 0) === 0 ? (
        <EmptyState
          icon="🛍️"
          title="No orders yet"
          description="Add your first order and we'll take care of the reminders."
          action={
            <Button leftIcon={<Plus className="size-4" />} onClick={() => navigate('/app/orders/new')}>
              Add your first order
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No matching orders" description="Try a different search or filter." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((i) => (
            <OrderCard key={i.order.id} order={i.order} today={today} platforms={platforms} />
          ))}
        </div>
      )}
    </>
  )
}
