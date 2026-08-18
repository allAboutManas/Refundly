/**
 * Maps domain lifecycle vocabulary to design-system visuals (tone, label, icon).
 * Keeps status→color logic in one place so every screen renders consistently.
 */
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  PackageCheck,
  Star,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ActionType, OrderStatus, Urgency } from '@/domain'
import type { BadgeTone } from '@/components/ui/Badge'

export interface StatusVisual {
  tone: BadgeTone
  label: string
  Icon: LucideIcon
}

const STATUS_VISUALS: Record<OrderStatus, StatusVisual> = {
  ORDERED: { tone: 'neutral', label: 'Ordered', Icon: Package },
  DELIVERED: { tone: 'info', label: 'Delivered', Icon: PackageCheck },
  RETURN_WINDOW_OPEN: { tone: 'info', label: 'Return window open', Icon: Clock },
  RETURN_WINDOW_CLOSED: { tone: 'warning', label: 'Refund form ready', Icon: FileText },
  REFUND_PENDING: { tone: 'primary', label: 'Refund pending', Icon: Wallet },
  REFUND_OVERDUE: { tone: 'danger', label: 'Refund overdue', Icon: AlertTriangle },
  COMPLETED: { tone: 'success', label: 'Completed', Icon: CheckCircle2 },
}

export function statusVisual(status: OrderStatus): StatusVisual {
  return STATUS_VISUALS[status]
}

/** Priority color per PRD §62 (red overdue / amber today / upcoming / done). */
export function urgencyTone(urgency: Urgency): BadgeTone {
  switch (urgency) {
    case 'overdue':
      return 'danger'
    case 'today':
      return 'warning'
    case 'upcoming':
      return 'info'
    case 'done':
      return 'success'
    case 'none':
      return 'neutral'
  }
}

export interface ActionVisual {
  label: string
  Icon: LucideIcon
}

const ACTION_VISUALS: Record<Exclude<ActionType, 'NONE'>, ActionVisual> = {
  CONFIRM_DELIVERY: { label: 'Confirm delivery', Icon: PackageCheck },
  CHECK_REVIEW: { label: 'Check review', Icon: Star },
  FILL_REFUND_FORM: { label: 'Fill refund form', Icon: FileText },
  FOLLOW_UP_REFUND: { label: 'Follow up', Icon: Wallet },
  MARK_RECEIVED: { label: 'Mark received', Icon: CheckCircle2 },
}

export function actionVisual(action: ActionType): ActionVisual | null {
  return action === 'NONE' ? null : ACTION_VISUALS[action]
}
