import {
  Bell,
  CalendarClock,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Match only the exact path (used for the index/dashboard route). */
  end?: boolean
  /** Show in the mobile bottom navigation. */
  mobile?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/app', icon: LayoutDashboard, end: true, mobile: true },
  { label: 'Orders', to: '/app/orders', icon: Package, mobile: true },
  { label: 'Timeline', to: '/app/timeline', icon: CalendarClock, mobile: true },
  { label: 'Notifications', to: '/app/notifications', icon: Bell, mobile: true },
  { label: 'Accounts', to: '/app/accounts', icon: Users },
  { label: 'Settings', to: '/app/settings', icon: Settings, mobile: true },
]
