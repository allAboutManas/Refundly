import { cn } from '@/lib/cn'
import { Input, SegmentedControl } from '@/components/ui'
import {
  TIMELINE_PRESETS,
  calculateExpectedDate,
  countExclusions,
  formatDateLong,
  formatDateShort,
  type PlainDate,
  type TimelineUnit,
} from '@/domain'

export interface WorkingDaysCalculatorProps {
  value: number
  unit: TimelineUnit
  startDate: PlainDate
  holidays: ReadonlySet<PlainDate>
  onValueChange: (v: number) => void
  onUnitChange: (u: TimelineUnit) => void
}

export function WorkingDaysCalculator({
  value,
  unit,
  startDate,
  holidays,
  onValueChange,
  onUnitChange,
}: WorkingDaysCalculatorProps) {
  const expected = calculateExpectedDate({
    startDate,
    duration: value > 0 ? value : 0,
    type: unit,
    holidays,
  })
  const excluded = unit === 'WORKING_DAYS' ? countExclusions(startDate, expected, holidays) : null

  return (
    <div className="space-y-4">
      <SegmentedControl
        value={unit}
        onChange={onUnitChange}
        segments={[
          { value: 'CALENDAR_DAYS', label: 'Calendar days' },
          { value: 'WORKING_DAYS', label: 'Working days' },
        ]}
      />

      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          {TIMELINE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onValueChange(p)}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-sm font-semibold transition-colors',
                value === p
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border bg-surface text-text-2 hover:bg-surface-2',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={Number.isFinite(value) && value > 0 ? value : ''}
          onChange={(e) => onValueChange(Math.floor(Number(e.target.value)))}
          trailing={unit === 'WORKING_DAYS' ? 'working days' : 'calendar days'}
        />
      </div>

      <div className="rounded-lg bg-surface-2 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-3">Starts</span>
          <span className="font-medium text-text">{formatDateShort(startDate, { withYear: true })}</span>
        </div>
        {excluded && (
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-text-3">Excluded</span>
            <span className="font-medium text-text">
              {excluded.weekendDays} weekend days
              {excluded.holidayDays > 0 ? `, ${excluded.holidayDays} holidays` : ''}
            </span>
          </div>
        )}
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm text-text-3">Expected refund date</p>
          <p className="mt-0.5 text-xl font-extrabold text-primary transition-all">
            {value > 0 ? formatDateLong(expected) : '—'}
          </p>
        </div>
      </div>

      {unit === 'WORKING_DAYS' && (
        <p className="text-sm text-text-3">
          Working days exclude Saturdays, Sundays and configured holidays.
        </p>
      )}
    </div>
  )
}
