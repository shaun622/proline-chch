import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

export default function FilterChips({ options = [], value, onChange, ariaLabel, className }) {
  const rowRef = useRef(null)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const active = row.querySelector('[data-active="true"]')
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [value])

  return (
    <div
      ref={rowRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn('-mx-4 px-4 flex items-center gap-2 overflow-x-auto scrollbar-none', className)}
    >
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onChange?.(o.value)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors min-h-[36px] whitespace-nowrap',
              active
                ? 'bg-gradient-brand text-white shadow-sm shadow-brand-500/30'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800',
            )}
          >
            <span>{o.label}</span>
            {typeof o.count === 'number' && (
              <span
                className={cn(
                  'text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums',
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
