import { useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  zLayer = 55,
}) {
  const [busy, setBusy] = useState(false)
  const Icon = destructive ? AlertTriangle : ShieldAlert

  async function handle() {
    setBusy(true)
    try {
      await onConfirm?.()
      onClose?.()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" zLayer={zLayer} hideHeader>
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <div
          className={
            'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ' +
            (destructive
              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
              : 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400')
          }
        >
          <Icon className="w-7 h-7" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      <div className="flex gap-2 mt-5">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          className="flex-1"
          onClick={handle}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
