import { useEffect, useState } from 'react'
import { Button, Field, Input, Modal, Select, useToast } from '@/components/ui'
import { usePlatforms, isOtherPlatform } from '@/api/platforms'
import { useCreateAccount, useUpdateAccount } from '@/api/accounts'
import { friendlyError } from '@/lib/errors'
import type { AccountRow } from '@/lib/database.types'

export interface AccountFormModalProps {
  open: boolean
  onClose: () => void
  account?: AccountRow | null
  /** Preselect a platform when adding (ignored while editing). */
  presetPlatformId?: string
  /** Called with the new/updated account id after a successful save. */
  onSaved?: (id: string) => void
}

export function AccountFormModal({
  open,
  onClose,
  account,
  presetPlatformId,
  onSaved,
}: AccountFormModalProps) {
  const { data: platforms } = usePlatforms()
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const { toast } = useToast()

  const editing = Boolean(account)
  const [platformId, setPlatformId] = useState('')
  const [customName, setCustomName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [profileName, setProfileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset the form each time it opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    setPlatformId(account?.platform_id ?? presetPlatformId ?? '')
    setCustomName(account?.custom_platform_name ?? '')
    setAccountName(account?.account_name ?? '')
    setIdentifier(account?.account_identifier ?? '')
    setProfileName(account?.profile_name ?? '')
  }, [open, account])

  const showCustom = isOtherPlatform(platforms, platformId)
  const busy = create.isPending || update.isPending

  async function save() {
    setError(null)
    if (!platformId) return setError('Choose a platform.')
    if (showCustom && !customName.trim()) return setError('Enter the platform name.')
    if (!accountName.trim()) return setError('Give this account a name.')

    const input = {
      platform_id: platformId,
      custom_platform_name: showCustom ? customName.trim() : null,
      account_name: accountName.trim(),
      account_identifier: identifier.trim() || null,
      profile_name: profileName.trim() || null,
    }

    try {
      const saved = editing
        ? await update.mutateAsync({ id: account!.id, ...input })
        : await create.mutateAsync(input)
      toast({ tone: 'success', title: editing ? 'Account updated' : 'Account added' })
      onSaved?.(saved.id)
      onClose()
    } catch (e) {
      setError(friendlyError(e, "Couldn't save that account."))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit account' : 'Add account'}
      description="We'll never ask for your store password."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {editing ? 'Save changes' : 'Add account'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Platform" required>
          <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
            <option value="" disabled>
              Select a platform
            </option>
            {platforms?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        {showCustom && (
          <Field label="Platform name" required>
            <Input
              placeholder="e.g. Nykaa"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </Field>
        )}

        <Field label="Account name" required hint="A label to recognise it, e.g. Personal Amazon.">
          <Input
            placeholder="Personal Amazon"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </Field>

        <Field label="Account identifier" hint="The email or phone used on that platform.">
          <Input
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </Field>

        <Field label="Profile name">
          <Input
            placeholder="Manas"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
