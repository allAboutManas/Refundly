import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  useToast,
} from '@/components/ui'
import { usePlatforms, platformName } from '@/api/platforms'
import { useAccounts, useDeleteAccount } from '@/api/accounts'
import { friendlyError } from '@/lib/errors'
import type { AccountRow } from '@/lib/database.types'
import { AccountFormModal } from './AccountFormModal'

export default function AccountsPage() {
  const { data: accounts, isLoading, isError, refetch } = useAccounts()
  const { data: platforms } = usePlatforms()
  const del = useDeleteAccount()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AccountRow | null>(null)
  const [deleting, setDeleting] = useState<AccountRow | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; sort: number; items: AccountRow[] }>()
    for (const a of accounts ?? []) {
      const name = platformName(platforms, a.platform_id, a.custom_platform_name)
      const sort = platforms?.find((p) => p.id === a.platform_id)?.sort_order ?? 500
      const key = `${sort}:${name}`
      if (!map.has(key)) map.set(key, { name, sort, items: [] })
      map.get(key)!.items.push(a)
    }
    return [...map.values()].sort((a, b) => a.sort - b.sort)
  }, [accounts, platforms])

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(a: AccountRow) {
    setEditing(a)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast({ tone: 'success', title: 'Account removed' })
    } catch (e) {
      toast({ tone: 'error', title: 'Could not remove', description: friendlyError(e) })
    }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Your reusable e-commerce accounts."
        action={
          <Button leftIcon={<Plus className="size-4" />} onClick={openAdd}>
            Add account
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title="Couldn't load accounts"
          description="Something went wrong. Please try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Try again</Button>}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="👤"
          title="No accounts yet"
          description="Add the accounts you shop with so you can attach them to orders. We never ask for your store password."
          action={
            <Button leftIcon={<Plus className="size-4" />} onClick={openAdd}>
              Add your first account
            </Button>
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-text-3">
                {group.name}
              </h2>
              <div className="space-y-2.5">
                {group.items.map((a) => (
                  <Card key={a.id} className="flex items-center gap-4 py-4">
                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-2">
                      <UserRound className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">{a.account_name}</p>
                      <p className="truncate text-sm text-text-3">
                        {[a.account_identifier, a.profile_name].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        aria-label="Edit account"
                        className="grid size-9 place-items-center rounded-md text-text-3 hover:bg-surface-2 hover:text-text"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(a)}
                        aria-label="Remove account"
                        className="grid size-9 place-items-center rounded-md text-text-3 hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AccountFormModal open={formOpen} onClose={() => setFormOpen(false)} account={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Remove this account?"
        description={
          deleting
            ? `"${deleting.account_name}" will be removed. Orders already using it keep their history.`
            : undefined
        }
        confirmLabel="Remove"
      />
    </>
  )
}
