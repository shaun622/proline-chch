import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function Header({ title, subtitle, backTo, right, className }) {
  const nav = useNavigate()
  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 md:top-[104px]',
        className,
      )}
    >
      <div className="max-w-5xl mx-auto px-4 md:px-8 flex items-center gap-3 min-h-[52px]">
        <button
          type="button"
          onClick={() => (backTo ? nav(backTo) : nav(-1))}
          className="min-h-tap min-w-tap -ml-2 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  )
}
