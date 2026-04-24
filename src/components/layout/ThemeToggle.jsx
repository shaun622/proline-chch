import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { cn } from '../../lib/utils'

export function ThemeToggleCompact({ className }) {
  const { setMode, isDark } = useTheme()
  const Icon = isDark ? Moon : Sun
  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      className={cn(
        'min-h-tap min-w-tap rounded-xl p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors',
        className,
      )}
      aria-label="Toggle theme"
    >
      <Icon className="w-5 h-5" strokeWidth={2} />
    </button>
  )
}

export function ThemeToggleFull({ className }) {
  const { mode, setMode } = useTheme()
  const options = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'system', label: 'System', Icon: Monitor },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ]
  return (
    <div
      className={cn(
        'inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1',
        className,
      )}
      role="radiogroup"
    >
      {options.map(({ value, label, Icon }) => {
        const active = mode === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors min-h-[34px]',
              active
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
