import { cn } from '../../lib/utils'

const COLORS = {
  brand:   'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  red:     'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber:   'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  violet:  'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  blue:    'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  cyan:    'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400',
  pink:    'bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400',
  indigo:  'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  teal:    'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400',
  gray:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}

const SIZES = {
  sm: { box: 'w-8 h-8 rounded-lg',  icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  lg: { box: 'w-12 h-12 rounded-xl', icon: 'w-6 h-6' },
  xl: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8' },
}

export default function IconBox({ icon: Icon, color = 'brand', size = 'md', glow, className, children }) {
  const { box, icon } = SIZES[size]
  return (
    <div
      className={cn(
        'flex items-center justify-center shrink-0',
        box,
        COLORS[color],
        glow && 'shadow-glow',
        className,
      )}
    >
      {Icon ? <Icon className={icon} strokeWidth={2} /> : children}
    </div>
  )
}
