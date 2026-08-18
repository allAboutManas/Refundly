import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useTimezone } from '@/lib/useToday'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/api/notifications'
import { todayInTimeZone, formatDateShort, type PlainDate } from '@/domain'
import type { NotificationRow } from '@/lib/database.types'
import type { NotificationType } from '@/domain'

const META: Record<NotificationType, { emoji: string; title: string }> = {
  DELIVERY_CONFIRM: { emoji: '📦', title: 'Was your order delivered?' },
  REVIEW_REMINDER: { emoji: '⭐', title: 'Check your review' },
  RETURN_WINDOW_CLOSED: { emoji: '🔒', title: 'Return window closed' },
  REFUND_DUE: { emoji: '💰', title: 'Your refund is due' },
  REFUND_OVERDUE: { emoji: '🚨', title: 'Your refund is overdue' },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const tz = useTimezone()
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const today = todayInTimeZone(tz)
  const unread = (notifications ?? []).filter((n) => !n.read_at).length

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: NotificationRow[] }>()
    for (const n of notifications ?? []) {
      const date = todayInTimeZone(tz, new Date(n.created_at))
      const label = groupLabel(date, today)
      if (!map.has(label)) map.set(label, { label, items: [] })
      map.get(label)!.items.push(n)
    }
    return [...map.values()]
  }, [notifications, tz, today])

  function open(n: NotificationRow) {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.order_id) navigate(`/app/orders/${n.order_id}`)
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Reminders and updates."
        action={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCheck className="size-4" />}
              onClick={() => markAll.mutate()}
              loading={markAll.isPending}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (notifications?.length ?? 0) === 0 ? (
        <EmptyState icon="🔔" title="You're all caught up." description="New reminders will show up here." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-text-3">
                {group.label}
              </h2>
              <Card padded={false} className="divide-y divide-border">
                {group.items.map((n) => {
                  const meta = META[n.type]
                  const unreadItem = !n.read_at
                  return (
                    <button
                      key={n.id}
                      onClick={() => open(n)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2',
                        unreadItem && 'bg-primary-soft/30',
                      )}
                    >
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-lg">
                        {meta.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text">{n.title || meta.title}</p>
                        {n.body && <p className="mt-0.5 text-sm text-text-2">{n.body}</p>}
                        <p className="mt-1 text-xs text-text-3">{localTime(n.created_at, tz)}</p>
                      </div>
                      {unreadItem && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    </button>
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

function groupLabel(date: PlainDate, today: PlainDate): string {
  if (date === today) return 'Today'
  const yesterday = todayInTimeZone('UTC', new Date(new Date(`${today}T00:00:00Z`).getTime() - 86400000))
  if (date === yesterday) return 'Yesterday'
  return formatDateShort(date, { withYear: true })
}

function localTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}
