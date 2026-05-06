import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import NewExpenseModal from '../components/modals/NewExpenseModal'
import { supabase } from '../lib/supabase'
import { badgeFor, EXPENSE_TYPES, labelFor } from '../lib/constants'
import { currency, formatDate } from '../lib/utils'

export default function Expenses() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState(null)

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

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return entries.filter(row => {
      if (filter !== 'all' && row.type !== filter) return false
      if (!term) return true
      return [row.category, row.notes].some(v => v?.toLowerCase().includes(term))
    })
  }, [entries, filter, q])

  // Counts drive the filter chip badges.
  const counts = useMemo(() => {
    const c = { all: entries.length, income: 0, expense: 0 }
    for (const row of entries) {
      if (row.type === 'income') c.income++
      else if (row.type === 'expense') c.expense++
    }
    return c
  }, [entries])

  // Totals are *all-time*, ignoring filter / search — the operator
  // wants a stable view of the bottom line. Filter narrows the list
  // only. If we later want filter-scoped totals, swap `entries` for
  // `visible` here.
  const totalIncome = useMemo(
    () => entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0),
    [entries],
  )
  const totalExpenses = useMemo(
    () => entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0),
    [entries],
  )
  const profit = totalIncome - totalExpenses

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
    a.download = `proline-expenses-${filter}-${today}.csv`
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
        subtitle={loading ? 'Loading…' : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
        action={
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <Button leftIcon={Download} variant="secondary" onClick={exportCsv}>Export</Button>
            )}
            <Button leftIcon={Plus} onClick={() => { setEditing(null); setCreateOpen(true) }}>New entry</Button>
          </div>
        }
      />

      {/* Stat strip — Income / Expenses / Profit. All-time totals,
          unaffected by the filter chip below. Profit card switches to
          red text when the operator's actually losing money this period
          so it stands out as a real signal rather than just a number. */}
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
            title={entries.length === 0 ? 'No entries yet' : 'No matches'}
            description={entries.length === 0 ? 'Log your first expense or income.' : 'Try a different search or filter.'}
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
