import { useEffect, useState } from 'react'
import { UserPlus, UserCog } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import IconBox from '../ui/IconBox'
import { Input, TextArea, Select } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import { PROPERTY_TYPES } from '../../lib/constants'

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  property_type: 'residential',
  address: '',
  suburb: '',
  notes: '',
}

function fromRecord(row) {
  if (!row) return EMPTY
  return {
    name: row.name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    property_type: row.property_type ?? 'residential',
    address: row.address ?? '',
    suburb: row.suburb ?? '',
    notes: row.notes ?? '',
  }
}

export default function NewCustomerModal({
  open,
  onClose,
  onSaved,
  editing = null,
  prefill = null,
  zLayer = 60,
}) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    setErr('')
    setForm(editing ? fromRecord(editing) : { ...EMPTY, ...(prefill || {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const isEditing = !!editing

  async function handleSave() {
    if (!form.name.trim()) return setErr('Name is required')
    setErr(''); setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        property_type: form.property_type || 'residential',
        address: form.address.trim() || null,
        suburb: form.suburb.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (isEditing) {
        const { data, error } = await supabase.from('customers').update(payload).eq('id', editing.id).select().single()
        if (error) throw error
        onSaved?.(data)
      } else {
        const { data, error } = await supabase.from('customers').insert(payload).select().single()
        if (error) throw error
        onSaved?.(data)
      }
      onClose?.()
    } catch (e) {
      setErr(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      zLayer={zLayer}
      title={isEditing ? 'Edit customer' : 'New customer'}
      subtitle={isEditing ? editing?.name : 'Quick-add a new customer'}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconBox icon={isEditing ? UserCog : UserPlus} color="brand" size="lg" />
          <div className="min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300">{isEditing ? 'Update the details below' : 'Name is required, everything else is optional'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">You can add more details later.</p>
          </div>
        </div>

        <Input label="Name" autoFocus required value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Smith" />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="027 123 4567" inputMode="tel" />
          <Select label="Property" options={PROPERTY_TYPES} value={form.property_type} onChange={e => update('property_type', e.target.value)} />
        </div>

        <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@example.com" />

        <div className="grid grid-cols-3 gap-3">
          <Input wrapperClassName="col-span-2" label="Street address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="12 Main St" />
          <Input label="Suburb" value={form.suburb} onChange={e => update('suburb', e.target.value)} placeholder="Riccarton" />
        </div>

        <TextArea label="Notes" rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Gate code, pets, preferred times…" />

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.name.trim()} className="flex-1">
            {isEditing ? 'Save changes' : 'Create customer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
