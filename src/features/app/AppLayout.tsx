import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Plus, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import { useProfile } from '@/api/profile'
import { useUnreadCount } from '@/api/notifications'
import { Button } from '@/components/ui'
import { NAV_ITEMS } from './nav'

function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name || email || '?').trim()
  const parts = source.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function Avatar({ name, email }: { name?: string | null; email?: string | null }) {
  return (
    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
      {initialsOf(name, email)}
    </div>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold transition-colors',
    isActive ? 'bg-primary-soft text-primary' : 'text-text-2 hover:bg-surface-2 hover:text-text',
  )

export function AppLayout() {
  const { theme, toggle } = useTheme()
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const unread = useUnreadCount()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg" />
          <span className="text-[17px] font-extrabold tracking-tight">Refundly</span>
        </div>

        <div className="px-3">
          <Button fullWidth leftIcon={<Plus className="size-4" />} onClick={() => navigate('/app/orders/new')}>
            Add order
          </Button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              <item.icon className="size-4.5" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/app/notifications' && unread > 0 && (
                <span className="grid min-w-5 place-items-center rounded-pill bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar name={profile?.full_name} email={user?.email} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">
                {profile?.full_name || 'Your account'}
              </p>
              <p className="truncate text-xs text-text-3">{user?.email}</p>
            </div>
          </div>
          <div className="mt-1 flex gap-1">
            <button
              onClick={toggle}
              className="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              onClick={handleSignOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-danger"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="size-7 rounded-lg" />
          <span className="text-[15px] font-extrabold tracking-tight">Refundly</span>
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="grid size-9 place-items-center rounded-md text-text-2 hover:bg-surface-2"
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </header>

      {/* ---------- Main content ---------- */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">
          <Outlet />
        </div>
      </main>

      {/* ---------- Mobile FAB ---------- */}
      <button
        onClick={() => navigate('/app/orders/new')}
        aria-label="Add order"
        className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-pop transition-transform active:scale-95 lg:hidden"
      >
        <Plus className="size-6" />
      </button>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {NAV_ITEMS.filter((i) => i.mobile).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-text-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <item.icon className={cn('size-5.5 transition-transform', isActive && '-translate-y-0.5')} />
                    {item.to === '/app/notifications' && unread > 0 && (
                      <span className="absolute -right-1.5 -top-1 grid min-w-4 place-items-center rounded-pill bg-danger px-1 text-[10px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </span>
                  {item.label === 'Dashboard' ? 'Home' : item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
