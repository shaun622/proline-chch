import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useScrollLock } from '../../hooks/useScrollLock'
import { cn } from '../../lib/utils'

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 sm:border-b-0 sm:pb-2">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="min-h-tap min-w-tap -mr-2 -mt-2 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  zLayer = 50,
  children,
  hideHeader,
  className,
}) {
  useScrollLock(open)
  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center animate-fade-in"
      style={{ zIndex: zLayer }}
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-h-[92vh] flex flex-col shadow-elevated animate-slide-up sm:animate-scale-in',
          SIZES[size],
          className,
        )}
      >
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        {!hideHeader && title && <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />}
        <div className="overflow-y-auto overscroll-contain px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
