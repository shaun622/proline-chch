import { useCallback, useEffect, useState } from 'react'
import { Wrench, Hammer, UserPlus } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import IconBox from '../ui/IconBox'
import { Input, TextArea, Select } from '../ui/Input'
import NewCustomerModal from './NewCustomerModal'
import { supabase } from '../../lib/supabase'
import { JOB_KINDS, JOB_STATUSES, JOB_TYPES } from '../../lib/constants'
import { cn } from '../../lib/utils'

const EMPTY = {
  customer_id: '',
  title: '',
  description: '',
  job_kind: 'repair',
  job_type: 'maintenance',
  status: 'scheduled',
  scheduled_date: '',
  address: '',
  notes: '',
}

function fromRecord(row) {
  if (!row) return EMPTY
  return {
    customer_id: row.customer_id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    job_kind: row.job_kind ?? 'repair',
    job_type: row.job_type ?? 'maintenance',
    status: row.status ?? 'scheduled',
    scheduled_date: row.scheduled_date ? new Date(row.scheduled_date).toISOString().slice(0, 10) : '',
    address: row.address ?? '',
    notes: row.notes ?? '',
  }
}

export default function NewJobModal({ open, onClose, onSaved, editing = null, prefill = null, zLayer = 60 }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [customers, setCustomers] = useState([])
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)

  const loadCustomers = useCallback(async () => {
    const { data } = await supabase.from('customers').select('id, name, property_type').order('name')
    setCustomers(data || [])
  }, [])

  useEffect(() => {
    if (!open) return
    setErr('')
    setForm(editing ? fromRecord(editing) : { ...EMPTY, ...(prefill || {}) })
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const isEditing = !!editing
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.customer_id) return setErr('Pick a customer')
    if (!form.title.trim()) return setErr('Title is required')
    setErr(''); setSaving(true)
    try {
      const payload = {
        customer_id: form.customer_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        job_kind: form.job_kind,
        job_type: form.job_type,
        status: form.status,
        scheduled_date: form.scheduled_date ? new Date(form.scheduled_date + 'T09:00').toISOString() : null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      }
      const q = isEditing
        ? supabase.from('jobs').update(payload).eq('id', editing.id).select().single()
        : supabase.from('jobs').insert(payload).select().single()
      const { data, error } = await q
      if (error) throw error
      onSaved?.(data)
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
      size="md"
      zLayer={zLayer}
      title={isEditing ? 'Edit job' : 'New job'}
      subtitle={isEditing ? editing?.title : 'Repair, install, or site visit'}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconBox icon={isEditing ? Hammer : Wrench} color="brand" size="lg" />
          <div className="min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300">{isEditing ? 'Update the job details' : 'Schedule a new job'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">You can add photos after saving.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Customer</label>
          <div className="flex gap-2">
            <select
              value={form.customer_id}
              onChange={e => update('customer_id', e.target.value)}
              className="input flex-1 appearance-none pr-10"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
            >
              <option value="">Select a customer…</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.property_type === 'commercial' ? ' (Commercial)' : ''}</option>
              ))}
            </select>
            <Button variant="secondary" size="md" onClick={() => setNewCustomerOpen(true)} leftIcon={UserPlus}>New</Button>
          </div>
        </div>

        <Input
          label="Title"
          autoFocus
          required
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. Replace cracked kitchen window"
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Kind</label>
          <div className="flex gap-2">
            {JOB_KINDS.map(k => (
              <button
                key={k.value}
                type="button"
                onClick={() => update('job_kind', k.value)}
                className={cn(
                  'flex-1 min-h-tap px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                  form.job_kind === k.value
                    ? 'bg-gradient-brand text-white border-transparent shadow-sm shadow-brand-500/30'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" options={JOB_TYPES} value={form.job_type} onChange={e => update('job_type', e.target.value)} />
          <Select label="Status" options={JOB_STATUSES} value={form.status} onChange={e => update('status', e.target.value)} />
        </div>

        <Input
          label="Scheduled date"
          type="date"
          value={form.scheduled_date}
          onChange={e => update('scheduled_date', e.target.value)}
        />

        <Input
          label="Address override"
          value={form.address}
          onChange={e => update('address', e.target.value)}
          placeholder="Leave blank to use customer's address"
          hint="Only needed if the work site differs from the customer's registered address."
        />

        <TextArea label="Description" rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="What needs doing, measurements, parts, access notes…" />

        <TextArea label="Notes" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Internal notes (not shown to customer)" />

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.customer_id || !form.title.trim()} className="flex-1">
            {isEditing ? 'Save changes' : 'Create job'}
          </Button>
        </div>
      </div>

      <NewCustomerModal
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        onSaved={async (row) => {
          await loadCustomers()
          update('customer_id', row.id)
        }}
        zLayer={70}
      />
    </Modal>
  )
}
