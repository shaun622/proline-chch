import IconBox from './IconBox'
import { cn } from '../../lib/utils'

export default function DetailRow({ icon, color = 'gray', label, value, action, href, className }) {
  const content = (
    <div className={cn('flex items-center gap-3 px-4 py-3', className)}>
      {icon && <IconBox icon={icon} color={color} size="sm" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{value || '—'}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
  if (href) {
    return (
      <a href={href} className="block hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
        {content}
      </a>
    )
  }
  return content
}
