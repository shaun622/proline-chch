import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, Download, Plus, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import NewExpenseModal from '../components/modals/NewExpenseModal'
import { supabase } from '../lib/supabase'
import { badgeFor, EXPENSE_TYPES, labelFor } from '../lib/constants'
import { currency, formatDate } from '../lib/utils'

// Local date helpers — keeps the period dropdown self-contained
// (no extra deps, no library tax for what's basically arithmetic).
function isoDate(d) {
  // Build YYYY-MM-DD using local components, NOT UTC. toISOString()
  // would shift the date back a day in NZ for anything past noon UTC.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfWeekMonday(d) {
  const out = new Date(d)
  // JS getDay: Sun=0, Mon=1, …, Sat=6. Operator's mental model is
  // Mon-start (NZ tradies don't think of Sunday as the start of the
  // working week). For Sunday we go back 6 days; otherwise day-1.
  const day = out.getDay()
  const diff = day === 0 ? -6 : 1 - day
  out.setDate(out.getDate() + diff)
  return out
}

const PERIOD_OPTIONS = [
  { value: 'this_week',  label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_30',    label: 'Last 30 days' },
  { value: 'ytd',        label: 'Year to date' },
  { value: 'last_year',  label: 'Last year' },
  { value: 'custom',     label: 'Custom range' },
]

export default function Expenses() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  // Period filter — defaults to "This month" since that's the usual
  // accounting cadence for a tradie and keeps the totals snappy.
  const [period, setPeriod] = useState('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    // Sort by date desc with created_at as a tiebreaker so two entries
    // logged on the same day stay in entry order.
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Resolve the active period to a [start, end] window of YYYY-MM-DD
  // strings — both inclusive. The list, the chip counts and the stat
  // totals all key off this. For custom range, an empty start means
  // "from forever"; an empty end means "up to today".
  const range = useMemo(() => {
    const today = new Date()
    const todayIso = isoDate(today)
    switch (period) {
      case 'this_week': {
        return [isoDate(startOfWeekMonday(today)), todayIso]
      }
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        return [isoDate(start), todayIso]
      }
      case 'last_30': {
        const start = new Date(today)
        start.setDate(start.getDate() - 29) // 30 days inclusive of today
        return [isoDate(start), todayIso]
      }
      case 'ytd': {
        const start = new Date(today.getFullYear(), 0, 1)
        return [isoDate(start), todayIso]
      }
      case 'last_year': {
        const start = new Date(today.getFullYear() - 1, 0, 1)
        const end   = new Date(today.getFullYear() - 1, 11, 31)
        return [isoDate(start), isoDate(end)]
      }
      case 'custom':
        return [customStart || '0000-01-01', customEnd || todayIso]
      default:
        return ['0000-01-01', todayIso]
    }
  }, [period, customStart, customEnd])

  // Entries that fall inside the current period — basis for stat totals
  // AND chip counts. The list narrows further by type filter + search.
  const inRange = useMemo(() => {
    const [start, end] = range
    return entries.filter(row => {
      if (!row.date) return false
      return row.date >= start && row.date <= end
    })
  }, [entries, range])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return inRange.filter(row => {
      if (filter !== 'all' && row.type !== filter) return false
      if (!term) return true
      return [row.category, row.notes].some(v => v?.toLowerCase().includes(term))
    })
  }, [inRange, filter, q])

  // Chip counts reflect the period — "Income (3)" means 3 in this
  // period, not 3 ever. Mirrors what the operator sees on screen.
  const counts = useMemo(() => {
    const c = { all: inRange.length, income: 0, expense: 0 }
    for (const row of inRange) {
      if (row.type === 'income') c.income++
      else if (row.type === 'expense') c.expense++
    }
    return c
  }, [inRange])

  // Totals follow the period too — that's the whole point of the
  // selector. Type filter / search narrow the LIST only; the stat
  // strip stays anchored to the period so the operator can scope to
  // e.g. "expenses" without losing sight of total income/profit.
  const totalIncome = useMemo(
    () => inRange.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0),
    [inRange],
  )
  const totalExpenses = useMemo(
    () => inRange.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0),
    [inRange],
  )
  const profit = totalIncome - totalExpenses

  // Human-readable range label. For finite presets we render the start
  // and end dates; for the open-ended fallback (no period match) we
  // hide it. formatDate gives "5 May 2026" style.
  const rangeLabel = useMemo(() => {
    const [start, end] = range
    if (start === '0000-01-01' && period !== 'custom') return ''
    if (period === 'custom' && !customStart && !customEnd) return ''
    return `${formatDate(start)} – ${formatDate(end)}`
  }, [range, period, customStart, customEnd])

  // CSV export of the *filtered* visible list — accountant flow.
  const csvCell = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  function exportCsv() {
    const header = ['Date', 'Type', 'Category', 'Amount', 'Notes']
    const rows = visible.map(row => [
      row.date || '',
      labelFor(EXPENSE_TYPES, row.type),
      row.category || '',
      Number(row.amount || 0).toFixed(2),
      row.notes || '',
    ])
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
    // UTF-8 BOM so Excel opens it cleanly with macrons / non-ASCII names.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date().toISOString().slice(0, 10)
    a.download = `proline-expenses-${period}-${filter}-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function openEdit(row) {
    setEditing(row)
    setCreateOpen(true)
  }
  function closeModal() {
    setCreateOpen(false)
    setEditing(null)
  }

  return (
    <PageWrapper width="wide">
      <PageHero
        title="Expenses"
        subtitle={
          loading
            ? 'Loading…'
            : `${inRange.length} ${inRange.length === 1 ? 'entry' : 'entries'}${rangeLabel ? ` · ${rangeLabel}` : ''}`
        }
        action={
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <Button leftIcon={Download} variant="secondary" onClick={exportCsv}>Export</Button>
            )}
            <Button leftIcon={Plus} onClick={() => { setEditing(null); setCreateOpen(true) }}>New entry</Button>
          </div>
        }
      />

      {/* Period selector — drives the stat totals + chip counts + list.
          The dropdown sits in its own row above the stats so the
          operator picks the time scope first, then sees the bottom
          line for that scope. Custom mode reveals two date inputs
          inline; switching back to a preset preserves whatever the
          operator typed so they don't have to re-enter it. */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="space-y-1.5 shrink-0">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5" strokeWidth={2} />
              Period
            </span>
          </label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="input"
          >
            {PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {period === 'custom' && (
          <>
            <Input
              label="From"
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              wrapperClassName="shrink-0"
            />
            <Input
              label="To"
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              wrapperClassName="shrink-0"
            />
          </>
        )}
      </div>

      {/* Stat strip — Income / Expenses / Profit, scoped to the
          selected period. Type filter / search below narrow the list
          only; the stats stay anchored to the period so the operator
          can scope to "expenses" without losing their bottom line.
          Profit card flips to red when the period ran at a loss. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Income"
          value={totalIncome}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Expenses"
          value={totalExpenses}
          icon={TrendingDown}
          tone="red"
        />
        <StatCard
          label="Profit"
          value={profit}
          icon={Wallet}
          tone={profit < 0 ? 'red' : 'brand'}
        />
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by category or notes…"
          className="input pl-10"
        />
      </div>

      <FilterChips
        className="mb-4"
        options={[
          { value: 'all',     label: 'All',      count: counts.all },
          { value: 'income',  label: 'Income',   count: counts.income },
          { value: 'expense', label: 'Expenses', count: counts.expense },
        ]}
        value={filter}
        onChange={setFilter}
        ariaLabel="Entry type"
      />

      {loading ? null : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title={
              entries.length === 0
                ? 'No entries yet'
                : inRange.length === 0
                  ? 'Nothing in this period'
                  : 'No matches'
            }
            description={
              entries.length === 0
                ? 'Log your first expense or income.'
                : inRange.length === 0
                  ? 'Try a wider date range or pick "Custom" to see everything.'
                  : 'Try a different search or filter.'
            }
            action={entries.length === 0 && <Button leftIcon={Plus} onClick={() => { setEditing(null); setCreateOpen(true) }}>New entry</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(row => (
            <Card key={row.id} onClick={() => openEdit(row)}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={badgeFor(EXPENSE_TYPES, row.type)} dot>{labelFor(EXPENSE_TYPES, row.type)}</Badge>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(row.date)}</p>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{row.category || '—'}</p>
                  {row.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{row.notes}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={
                    'font-semibold tabular-nums ' +
                    (row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100')
                  }>
                    {row.type === 'income' ? '+' : '−'}{currency(Math.abs(Number(row.amount || 0)))}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewExpenseModal
        open={createOpen}
        onClose={closeModal}
        editing={editing}
        onSaved={() => { load(); closeModal() }}
      />
    </PageWrapper>
  )
}

// Small stat card — eyebrow label + big tabular value + tinted icon.
// Mirrors the visual language of the existing Card-based widgets across
// the app (see Home.jsx) but is local to this page so we don't have to
// generalise it for one consumer.
function StatCard({ label, value, icon: Icon, tone }) {
  const TONE_RING = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    red:     'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    brand:   'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400',
  }
  const TONE_VALUE = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red:     'text-red-600 dark:text-red-400',
    brand:   'text-gray-900 dark:text-gray-100',
  }
  return (
    <Card className="!p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className={'mt-1.5 text-2xl font-bold tabular-nums leading-none ' + (TONE_VALUE[tone] || TONE_VALUE.brand)}>
            {currency(value)}
          </p>
        </div>
        <div className={'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ' + (TONE_RING[tone] || TONE_RING.brand)}>
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
      </div>
    </Card>
  )
}
