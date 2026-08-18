import { CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, Skeleton } from '@/components/ui'
import { useProfile } from '@/api/profile'
import { useHolidays } from '@/api/holidays'
import { INDIAN_STATES } from '@/lib/constants'
import { formatDateLong } from '@/domain'
import type { HolidayRow } from '@/lib/database.types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Group holidays by calendar month, in chronological order. */
function groupByMonth(rows: HolidayRow[]): Array<[number, HolidayRow[]]> {
  const groups = new Map<number, HolidayRow[]>()
  for (const h of rows) {
    const month = Number(h.holiday_date.slice(5, 7)) - 1
    const bucket = groups.get(month) ?? []
    bucket.push(h)
    groups.set(month, bucket)
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0])
}

export default function HolidaySettingsPage() {
  const { data: profile } = useProfile()
  const { data: holidays, isLoading } = useHolidays()

  const stateName = INDIAN_STATES.find((s) => s.code === profile?.state_code)?.name
  const year = holidays?.[0]?.year ?? new Date().getFullYear()
  const byMonth = groupByMonth(holidays ?? [])

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Calendar & holidays"
        description="Indian public holidays are excluded automatically when calculating working-day refund timelines."
        back
      />

      <Card className="mb-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-3">Country</dt>
            <dd className="font-medium text-text">
              {profile?.country_code === 'IN' ? 'India' : profile?.country_code || 'India'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-3">Region</dt>
            <dd className="font-medium text-text">{stateName || 'All India'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-3">Working days</dt>
            <dd className="font-medium text-text">Monday – Friday</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-text-3">
          Holidays follow the Indian public-holiday calendar and update automatically each year.
          Change your region in Profile settings.
        </p>
      </Card>

      <section>
        <div className="mb-2 flex items-center gap-2 px-1">
          <CalendarDays className="size-4 text-text-3" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-3">
            Public holidays {year}
          </h2>
        </div>

        {isLoading ? (
          <Skeleton className="h-40" />
        ) : (holidays?.length ?? 0) === 0 ? (
          <Card>
            <p className="text-sm text-text-3">
              Holidays haven't loaded yet — they'll appear here shortly.
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {byMonth.map(([month, items]) => (
              <div key={month}>
                <h3 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-text-3">
                  {MONTHS[month]}
                </h3>
                <Card padded={false} className="divide-y divide-border">
                  {items.map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-[15px] font-medium text-text">{h.holiday_name}</span>
                      <span className="text-sm text-text-3">{formatDateLong(h.holiday_date)}</span>
                    </div>
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
