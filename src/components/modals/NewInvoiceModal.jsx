import { useCallback, useEffect, useState } from 'react'
import { Receipt, UserPlus } from 'lucide-react'
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
  quote_id: '',
  title: '',
  notes: '',
  due_date: '',
  lines: [],
}

function fromRecord(row, lines) {
  if (!row) return EMPTY
  return {
    customer_id: row.customer_id ?? '',
    job_id: row.job_id ?? '',
    quote_id: row.quote_id ?? '',
    title: row.title ?? '',
    notes: row.notes ?? '',
    due_date: row.due_date ?? '',
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

function addDays(iso, days) {
  const d = iso ? new Date(iso) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function NewInvoiceModal({ open, onClose, onSaved, editing = null, editingLines = [], prefill = null, zLayer = 60 }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [customers, setCustomers] = useState([])
  const [jobs, setJobs] = useState([])
  const [quotes, setQuotes] = useState([])
  const [business, setBusiness] = useState(null)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)

  const loadRefs = useCallback(async () => {
    const [{ data: cs }, { data: js }, { data: qs }, { data: biz }] = await Promise.all([
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('jobs').select('id, title, customer_id').order('created_at', { ascending: false }).limit(100),
      supabase.from('quotes').select('id, number, title, customer_id, total').order('created_at', { ascending: false }).limit(100),
      supabase.from('businesses').select('*').limit(1).maybeSingle(),
    ])
    setCustomers(cs || [])
    setJobs(js || [])
    setQuotes(qs || [])
    setBusiness(biz || null)
    return biz || null
  }, [])

  useEffect(() => {
    if (!open) return
    setErr('')
    let cancelled = false
    ;(async () => {
      const biz = await loadRefs()
      if (cancelled) return
      if (editing) {
        setForm(fromRecord(editing, editingLines))
        return
      }
      const init = { ...EMPTY, ...(prefill || {}) }
      if (!init.due_date) {
        init.due_date = addDays(null, biz?.payment_terms_days || 14)
      }
      // Pre-fill notes / payment info with the business defaults from
      // Settings → Tax & Payment so the operator doesn't retype the
      // same payment instructions on every invoice. Only fires when
      // notes are empty — prefill or copyFromQuote can still
      // overwrite. If the operator clears the field, that's their
      // call: we re-fill only on a fresh-open of the modal.
      if (!init.notes) {
        const parts = []
        if (biz?.bank_account) parts.push(`Direct credit:\n${biz.bank_account}`)
        const days = biz?.payment_terms_days || 14
        parts.push(`Payment due within ${days} days. Please use the invoice number as the reference.`)
        // Only mention GST if the business actually charges it.
        if (biz?.gst_enabled !== false && biz?.gst_number) parts.push(`GST: ${biz.gst_number}`)
        init.notes = parts.join('\n\n')
      }
      setForm(init)
      // Auto-copy line items + customer when opened via "Convert to invoice"
      // (URL carries ?quote=<id>, parent passes prefill={ quote_id }).
      if (prefill?.quote_id) {
        await copyFromQuote(prefill.quote_id)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const isEditing = !!editing
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filteredJobs = form.customer_id ? jobs.filter(j => j.customer_id === form.customer_id) : jobs
  const filteredQuotes = form.customer_id ? quotes.filter(q => q.customer_id === form.customer_id) : quotes
  // Per-business GST rate (decimal). When the business has GST
  // disabled (unregistered), force rate=0 — the doc gets a 0%/$0
  // GST line that totals + display logic can hide entirely.
  // Falls back to the constant for legacy rows that predate
  // Settings → Tax & payment → GST rate. numeric(5,4) arrives as a
  // string from PostgREST so coerce.
  const gstRate = business?.gst_enabled === false
    ? 0
    : (business?.gst_rate != null ? Number(business.gst_rate) : GST_RATE)

  async function copyFromQuote(quoteId) {
    if (!quoteId) return
    const { data: quote } = await supabase.from('quotes').select('*').eq('id', quoteId).single()
    const { data: lines } = await supabase.from('quote_line_items').select('*').eq('quote_id', quoteId).order('sort')
    if (!quote) return
    setForm(f => ({
      ...f,
      quote_id: quote.id,
      customer_id: quote.customer_id,
      job_id: quote.job_id || '',
      title: quote.title || f.title,
      notes: quote.notes || f.notes,
      lines: (lines || []).map(l => ({ ...l, id: crypto.randomUUID() })),
    }))
  }

  async function handleSave() {
    if (!form.customer_id) return setErr('Pick a customer')
    if (form.lines.length === 0) return setErr('Add at least one line item')
    setErr(''); setSaving(true)
    try {
      const totals = computeTotals(form.lines, gstRate)
      let number = editing?.number
      if (!isEditing) {
        const prefix = business?.invoice_prefix || 'INV-'
        const { data: nData, error: nErr } = await supabase.rpc('next_number', { p_key: 'invoice', p_prefix: prefix })
        if (nErr) throw nErr
        number = nData
      }
      const header = {
        customer_id: form.customer_id,
        job_id: form.job_id || null,
        quote_id: form.quote_id || null,
        number,
        title: form.title.trim() || null,
        notes: form.notes.trim() || null,
        due_date: form.due_date || null,
        subtotal: totals.subtotal,
        gst_rate: gstRate,
        gst_amount: totals.gst_amount,
        total: totals.total,
      }
      let invoiceId
      if (isEditing) {
        const { data, error } = await supabase.from('invoices').update(header).eq('id', editing.id).select().single()
        if (error) throw error
        invoiceId = data.id
      } else {
        const { data, error } = await supabase.from('invoices').insert(header).select().single()
        if (error) throw error
        invoiceId = data.id
      }
      // Atomic line-item replace.
      const linesPayload = form.lines.map((l, i) => ({
        description: l.description || '',
        qty: Number(l.qty || 0),
        unit_price: Number(l.unit_price || 0),
        total: Number(l.qty || 0) * Number(l.unit_price || 0),
        sort: i,
      }))
      const { error: linesErr } = await supabase.rpc('replace_invoice_lines', { p_invoice_id: invoiceId, p_lines: linesPayload })
      if (linesErr) throw linesErr
      const { data: fresh } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
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
      title={isEditing ? `Edit ${editing?.number}` : 'New invoice'}
      subtitle={isEditing ? editing?.title : 'Line-item invoice for a customer'}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconBox icon={Receipt} color="emerald" size="lg" />
          <div className="min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300">{isEditing ? 'Update the invoice details' : 'Invoice number assigned on save'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{gstRate > 0 ? `GST ${+(gstRate * 100).toFixed(2)}% applied automatically.` : 'No GST charged.'}</p>
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

        {!isEditing && filteredQuotes.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Copy from quote (optional)</label>
            <select value={form.quote_id} onChange={e => copyFromQuote(e.target.value)} className="input">
              <option value="">— start blank —</option>
              {filteredQuotes.map(q => <option key={q.id} value={q.id}>{q.number} {q.title ? `· ${q.title}` : ''}</option>)}
            </select>
          </div>
        )}

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

        <Input label="Due date" type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Line items</label>
          <LineItemsEditor lines={form.lines} onChange={lines => update('lines', lines)} gstRate={gstRate} />
        </div>

        <TextArea label="Notes / payment info" rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Bank account for direct credit, thanks, etc." />

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.customer_id || form.lines.length === 0} className="flex-1">
            {isEditing ? 'Save changes' : 'Create invoice'}
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
