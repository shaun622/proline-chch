import { cn } from '../../lib/utils'

export default function Card({ onClick, className, children, ...props }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'block w-full text-left bg-white rounded-2xl border border-gray-100 p-4 shadow-card transition-all duration-200 dark:bg-gray-900 dark:border-gray-800',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:border-gray-200 hover:-translate-y-0.5 active:translate-y-0 dark:hover:border-gray-700',
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
