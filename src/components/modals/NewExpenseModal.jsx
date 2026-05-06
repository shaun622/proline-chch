import { useEffect, useState } from 'react'
import { Trash2, Wallet } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import IconBox from '../ui/IconBox'
import ConfirmModal from '../ui/ConfirmModal'
import { Input, TextArea } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import {
  EXPENSE_TYPES,
  EXPENSE_CATEGORY_SUGGESTIONS,
  INCOME_CATEGORY_SUGGESTIONS,
} from '../../lib/constants'
import { cn } from '../../lib/utils'

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY = {
  type: 'expense',
  category: '',
  amount: '',
  date: TODAY(),
  notes: '',
}

function fromRecord(row) {
  if (!row) return EMPTY
  return {
    type: row.type ?? 'expense',
    category: row.category ?? '',
    amount: row.amount != null ? String(row.amount) : '',
    date: row.date ?? TODAY(),
    notes: row.notes ?? '',
  }
}

export default function NewExpenseModal({ open, onClose, onSaved, editing = null, zLayer = 60 }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reset on open / when the edited row changes. We deliberately don't
  // reset on close — keeps the form intact if the operator backs out of
  // a confirmation modal.
  useEffect(() => {
    if (!open) return
    setErr('')
    setForm(editing ? fromRecord(editing) : EMPTY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const isEditing = !!editing
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Datalist suggestions are type-scoped — typing under "Expense" shows
  // tradie cost categories, "Income" shows revenue categories. Free
  // text is always allowed; the datalist is just shortcuts.
  const datalistId = 'expense-category-suggestions'
  const suggestions = form.type === 'income'
    ? INCOME_CATEGORY_SUGGESTIONS
    : EXPENSE_CATEGORY_SUGGESTIONS

  async function handleSave() {
    if (!form.category.trim()) return setErr('Pick a category')
    const amountNum = Number(form.amount)
    if (!Number.isFinite(amountNum) || amountNum < 0) return setErr('Enter a valid amount')
    setErr('')
    setSaving(true)
    try {
      const payload = {
        type: form.type,
        category: form.category.trim(),
        amount: amountNum,
        date: form.date || TODAY(),
        notes: form.notes.trim() || null,
        // updated_at is set client-side because the table's default
        // only fires on insert. Cheaper than a DB trigger for one app.
        updated_at: new Date().toISOString(),
      }
      const { data, error } = isEditing
        ? await supabase.from('expenses').update(payload).eq('id', editing.id).select().single()
        : await supabase.from('expenses').insert(payload).select().single()
      if (error) throw error
      onSaved?.(data)
      onClose?.()
    } catch (e) {
      setErr(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    const { error } = await supabase.from('expenses').delete().eq('id', editing.id)
    if (error) throw error
    onSaved?.(null)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      zLayer={zLayer}
      title={isEditing ? 'Edit entry' : 'New entry'}
      subtitle={isEditing ? 'Update or delete this entry' : 'Track a single expense or income line'}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconBox
            icon={Wallet}
            color={form.type === 'income' ? 'emerald' : 'red'}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {form.type === 'income' ? 'Money in' : 'Money out'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {form.type === 'income'
                ? 'Counted toward your running income total.'
                : 'Subtracted from your running profit.'}
            </p>
          </div>
        </div>

        {/* Type — segmented control. Two buttons, active gets a tinted
            background + ring matching the type's colour, inactive stays
            ghosted. Keyboard-accessible: each button is a real button. */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {EXPENSE_TYPES.map(t => {
              const active = form.type === t.value
              const isIncome = t.value === 'income'
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update('type', t.value)}
                  className={cn(
                    'min-h-tap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                    active && isIncome && 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300 ring-1 ring-emerald-300/40',
                    active && !isIncome && 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-300 ring-1 ring-red-300/40',
                    !active && 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
          <input
            list={datalistId}
            value={form.category}
            onChange={e => update('category', e.target.value)}
            placeholder={form.type === 'income' ? 'e.g. Job payment' : 'e.g. Materials, Fuel, Tools'}
            className="input"
          />
          {/* Datalist gives the operator a one-click pick from the
              curated list AND the freedom to type anything. The id+list
              link is enough — no JS work to wire up. */}
          <datalist id={datalistId}>
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                placeholder="0.00"
                className="input pl-7"
              />
            </div>
          </div>
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => update('date', e.target.value)}
          />
        </div>

        <TextArea
          label="Notes (optional)"
          rows={2}
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Receipt ref, vendor, anything worth remembering…"
        />

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

        <div className="flex gap-2 pt-2">
          {isEditing && (
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              leftIcon={Trash2}
              className="!text-red-600 dark:!text-red-400"
            >
              Delete
            </Button>
          )}
          <div className="flex gap-2 flex-1">
            <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.category.trim() || !form.amount} className="flex-1">
              {isEditing ? 'Save changes' : 'Add entry'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this entry?"
        description="This can't be undone. The running totals will update."
        confirmLabel="Delete"
        destructive
        zLayer={70}
      />
    </Modal>
  )
}
