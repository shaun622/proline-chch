import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const VARIANTS = {
  primary:   'bg-gradient-brand text-white shadow-md shadow-brand-500/20 hover:shadow-lg hover:brightness-110',
  secondary: 'bg-white text-gray-700 border border-gray-200 shadow-card hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800',
  danger:    'bg-gradient-danger text-white shadow-md shadow-red-500/20 hover:brightness-110',
  ghost:     'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
}

const SIZES = {
  sm: 'px-3 py-2 text-xs min-h-[36px]',
  md: 'px-5 py-3 text-sm min-h-tap min-w-tap',
  lg: 'px-6 py-4 text-base min-h-tap',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  leftIcon: L,
  rightIcon: R,
  loading,
  disabled,
  children,
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-wide transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-950 disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : L && <L className="w-4 h-4" />}
      {children}
      {!loading && R && <R className="w-4 h-4" />}
    </button>
  )
}
