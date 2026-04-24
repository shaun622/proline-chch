import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...args) => twMerge(clsx(...args))

export function currency(n) {
  const v = Number(n || 0)
  return v.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
}

export function formatDate(s) {
  if (!s) return ''
  const d = typeof s === 'string' ? new Date(s) : s
  return d.toLocaleDateString('en-NZ', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(s) {
  if (!s) return ''
  const d = typeof s === 'string' ? new Date(s) : s
  return d.toLocaleString('en-NZ', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatRelative(s) {
  if (!s) return ''
  const d = new Date(s)
  const now = Date.now()
  const diff = d.getTime() - now
  const abs = Math.abs(diff)
  const day = 24 * 60 * 60 * 1000
  if (abs < day) {
    const hrs = Math.round(diff / (60 * 60 * 1000))
    if (hrs === 0) return 'now'
    return hrs > 0 ? `in ${hrs}h` : `${-hrs}h ago`
  }
  const days = Math.round(diff / day)
  if (Math.abs(days) < 7) return days > 0 ? `in ${days}d` : `${-days}d ago`
  return formatDate(s)
}

export function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

export function debounce(fn, ms) {
  let t
  return (...a) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...a), ms)
  }
}
