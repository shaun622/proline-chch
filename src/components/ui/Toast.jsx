import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const STYLES = {
  success: { bg: 'bg-emerald-600',  Icon: CheckCircle2 },
  error:   { bg: 'bg-red-600',      Icon: AlertCircle },
  warning: { bg: 'bg-amber-600',    Icon: AlertCircle },
  info:    { bg: 'bg-gray-900',     Icon: null },
}

export default function Toast({ message, kind = 'info', onClose, className }) {
  if (!message) return null
  const style = STYLES[kind] || STYLES.info
  const { bg, Icon } = style
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl shadow-elevated max-w-[90vw]',
        bg,
        className,
      )}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span className="truncate">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="ml-1 -mr-1 p-0.5 hover:bg-white/15 rounded-md"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
