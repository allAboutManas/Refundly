import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button, type ButtonVariant } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  async function handle() {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={handle} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-[15px] text-text-2">{description}</p>}
    </Modal>
  )
}
