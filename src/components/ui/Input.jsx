import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export function Field({ label, hint, error, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>}
      {children}
      {error ? (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500 dark:text-gray-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, hint, error, className, wrapperClassName, ...props }, ref) {
  const input = (
    <input ref={ref} className={cn('input', error && 'border-red-300 focus:border-red-400 focus:ring-red-300/30', className)} {...props} />
  )
  if (!label && !hint && !error) return input
  return <Field label={label} hint={hint} error={error} className={wrapperClassName}>{input}</Field>
})

export const TextArea = forwardRef(function TextArea({ label, hint, error, rows = 3, className, wrapperClassName, ...props }, ref) {
  const ta = (
    <textarea
      ref={ref}
      rows={rows}
      className={cn('input resize-y min-h-[96px]', error && 'border-red-300 focus:border-red-400 focus:ring-red-300/30', className)}
      {...props}
    />
  )
  if (!label && !hint && !error) return ta
  return <Field label={label} hint={hint} error={error} className={wrapperClassName}>{ta}</Field>
})

export const Select = forwardRef(function Select({ label, hint, error, options = [], placeholder, className, wrapperClassName, children, ...props }, ref) {
  const sel = (
    <select
      ref={ref}
      className={cn('input appearance-none pr-10 bg-no-repeat bg-[right_0.75rem_center]', error && 'border-red-300 focus:border-red-400 focus:ring-red-300/30', className)}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {children}
    </select>
  )
  if (!label && !hint && !error) return sel
  return <Field label={label} hint={hint} error={error} className={wrapperClassName}>{sel}</Field>
})
