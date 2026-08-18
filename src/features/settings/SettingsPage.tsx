import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  HelpCircle,
  Info,
  LogOut,
  MoonStar,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, ConfirmDialog, Toggle, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useProfile } from '@/api/profile'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { SettingsRow } from './SettingsRow'
import { GetTheAppCard } from './GetTheAppCard'

function initials(name?: string | null, email?: string | null) {
  const s = (name || email || '?').trim()
  const parts = s.split(/\s+/)
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : s.slice(0, 2)).toUpperCase()
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { data: profile } = useProfile()
  const { toast } = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function deleteAllData() {
    try {
      // RLS scopes each delete to the current user. Orders cascade to
      // refund_details / order_events / notifications.
      await supabase.from('orders').delete().eq('user_id', user!.id)
      await supabase.from('user_platform_accounts').delete().eq('user_id', user!.id)
      await supabase.from('user_holidays').delete().eq('user_id', user!.id)
      toast({ tone: 'success', title: 'Your data was deleted' })
      await signOut()
      navigate('/login', { replace: true })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not delete', description: friendlyError(e) })
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Preferences, notifications and account." />

      {/* Profile summary */}
      <Card
        interactive
        padded={false}
        className="mb-5"
        onClick={() => navigate('/app/settings/profile')}
      >
        <div className="flex items-center gap-4 p-4">
          <div className="grid size-12 place-items-center rounded-full bg-primary-soft text-lg font-bold text-primary">
            {initials(profile?.full_name, user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-text">{profile?.full_name || 'Your account'}</p>
            <p className="truncate text-sm text-text-3">{user?.email}</p>
          </div>
        </div>
      </Card>

      <GetTheAppCard />

      <SettingsGroup title="Preferences">
        <SettingsRow icon={UserRound} label="Profile" description="Name, timezone, region" to="/app/settings/profile" />
        <SettingsRow icon={Bell} label="Notifications" description="Channels, reminders, frequency" to="/app/settings/notifications" />
        <SettingsRow icon={CalendarDays} label="Calendar & holidays" description="Working days and holidays" to="/app/settings/holidays" />
        <SettingsRow icon={Users} label="Accounts" description="Your e-commerce accounts" to="/app/accounts" />
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <SettingsRow
          icon={MoonStar}
          label="Dark mode"
          trailing={<Toggle checked={theme === 'dark'} onChange={toggle} aria-label="Dark mode" />}
        />
      </SettingsGroup>

      <SettingsGroup title="Help & information">
        <SettingsRow icon={HelpCircle} label="How it works" to="/app/settings/how-it-works" />
        <SettingsRow icon={ShieldCheck} label="Privacy" to="/app/settings/privacy" />
        <SettingsRow icon={Info} label="About" to="/app/settings/about" />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow icon={LogOut} label="Sign out" onClick={handleSignOut} />
        <SettingsRow icon={Trash2} label="Delete my data" danger onClick={() => setDeleteOpen(true)} />
      </SettingsGroup>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAllData}
        title="Delete all your data?"
        description="This permanently removes every order and account, then signs you out. This can't be undone."
        confirmLabel="Delete everything"
      />
    </>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-text-3">{title}</h2>
      <Card padded={false} className="divide-y divide-border overflow-hidden">
        {children}
      </Card>
    </section>
  )
}
