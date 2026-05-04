import { useCallback, useEffect, useState } from 'react'
import { FileText, UserPlus } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import IconBox from '../ui/IconBox'
import { Input, TextArea } from '../ui/Input'
import LineItemsEditor, { computeTotals } from '../ui/LineItemsEditor'
import NewCustomerModal from './NewCustomerModal'
import { supabase } from '../../lib/supabase'
import { GST_RATE } from '../../lib/constants'

const EMPTY = {
  customer_id: '',
  job_id: '',
  title: '',
  notes: '',
  valid_until: '',
  lines: [],
}

function fromRecord(row, lines) {
  if (!row) return EMPTY
  return {
    customer_id: row.customer_id ?? '',
    job_id: row.job_id ?? '',
    title: row.title ?? '',
    notes: row.notes ?? '',
    valid_until: row.valid_until ?? '',
    lines: (lines || []).map(l => ({
      id: l.id,
      description: l.description,
      qty: l.qty,
      unit_price: l.unit_price,
      total: l.total,
      sort: l.sort,
    })),
  }
}

export default function NewQuoteModal({ open, onClose, onSaved, editing = null, editingLines = [], prefill = null, zLayer = 60 }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [customers, setCustomers] = useState([])
  const [jobs, setJobs] = useState([])
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [business, setBusiness] = useState(null)

  const loadRefs = useCallback(async () => {
    const [{ data: cs }, { data: js }, { data: biz }] = await Promise.all([
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('jobs').select('id, title, customer_id').order('created_at', { ascending: false }).limit(100),
      supabase.from('businesses').select('*').limit(1).maybeSingle(),
    ])
    setCustomers(cs || [])
    setJobs(js || [])
    setBusiness(biz || null)
  }, [])

  useEffect(() => {
    if (!open) return
    setErr('')
    setForm(editing ? fromRecord(editing, editingLines) : { ...EMPTY, ...(prefill || {}) })
    loadRefs()
    // Only reset when the modal opens or the edited record changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const isEditing = !!editing
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filteredJobs = form.customer_id ? jobs.filter(j => j.customer_id === form.customer_id) : jobs
  // Per-business GST rate (decimal). Falls back to the constant for
  // legacy rows that predate Settings → Tax & payment → GST rate.
  // numeric(5,4) arrives as a string from PostgREST so coerce.
  const gstRate = business?.gst_rate != null ? Number(business.gst_rate) : GST_RATE

  async function handleSave() {
    if (!form.customer_id) return setErr('Pick a customer')
    if (form.lines.length === 0) return setErr('Add at least one line item')
    setErr(''); setSaving(true)
    try {
      const totals = computeTotals(form.lines, gstRate)
      let number = editing?.number
      if (!isEditing) {
        const prefix = business?.quote_prefix || 'Q-'
        const { data: nData, error: nErr } = await supabase.rpc('next_number', { p_key: 'quote', p_prefix: prefix })
        if (nErr) throw nErr
        number = nData
      }
      const header = {
        customer_id: form.customer_id,
        job_id: form.job_id || null,
        number,
        title: form.title.trim() || null,
        notes: form.notes.trim() || null,
        valid_until: form.valid_until || null,
        subtotal: totals.subtotal,
        gst_rate: gstRate,
        gst_amount: totals.gst_amount,
        total: totals.total,
      }
      let quoteId
      if (isEditing) {
        const { data, error } = await supabase.from('quotes').update(header).eq('id', editing.id).select().single()
        if (error) throw error
        quoteId = data.id
      } else {
        const { data, error } = await supabase.from('quotes').insert(header).select().single()
        if (error) throw error
        quoteId = data.id
      }
      // Atomic line-item replace — runs delete + insert inside a single RPC body
      // so an insert failure can't leave the quote with no lines.
      const linesPayload = form.lines.map((l, i) => ({
        description: l.description || '',
        qty: Number(l.qty || 0),
        unit_price: Number(l.unit_price || 0),
        total: Number(l.qty || 0) * Number(l.unit_price || 0),
        sort: i,
      }))
      const { error: linesErr } = await supabase.rpc('replace_quote_lines', { p_quote_id: quoteId, p_lines: linesPayload })
      if (linesErr) throw linesErr
      const { data: fresh } = await supabase.from('quotes').select('*').eq('id', quoteId).single()
      onSaved?.(fresh)
      onClose?.()
    } catch (e) {
      setErr(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      zLayer={zLayer}
      title={isEditing ? `Edit ${editing?.number}` : 'New quote'}
      subtitle={isEditing ? editing?.title : 'Line-item estimate for a customer'}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconBox icon={FileText} color="indigo" size="lg" />
          <div className="min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {isEditing ? 'Update the quote details' : 'Quote number assigned on save'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">GST {+(gstRate * 100).toFixed(2)}% applied automatically.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Customer</label>
          <div className="flex gap-2">
            <select value={form.customer_id} onChange={e => update('customer_id', e.target.value)} className="input flex-1">
              <option value="">Select a customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button variant="secondary" size="md" onClick={() => setNewCustomerOpen(true)} leftIcon={UserPlus}>New</Button>
          </div>
        </div>

        {filteredJobs.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Link to job (optional)</label>
            <select value={form.job_id} onChange={e => update('job_id', e.target.value)} className="input">
              <option value="">— no linked job —</option>
              {filteredJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        )}

        <Input label="Title" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Kitchen window replacement" />

        <Input label="Valid until" type="date" value={form.valid_until} onChange={e => update('valid_until', e.target.value)} />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Line items</label>
          <LineItemsEditor lines={form.lines} onChange={lines => update('lines', lines)} gstRate={gstRate} />
        </div>

        <TextArea label="Notes / terms" rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Payment terms, exclusions, assumptions…" />

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.customer_id || form.lines.length === 0} className="flex-1">
            {isEditing ? 'Save changes' : 'Create quote'}
          </Button>
        </div>
      </div>

      <NewCustomerModal
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        onSaved={async (row) => { await loadRefs(); update('customer_id', row.id) }}
        zLayer={70}
      />
    </Modal>
  )
}
