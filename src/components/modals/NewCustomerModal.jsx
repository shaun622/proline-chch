import { useEffect, useState } from 'react'
import { UserPlus, UserCog, AlertTriangle } from 'lucide-react'
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
  // Holds an existing customer whose email or phone matches what's being
  // typed. We surface it as a warning so the operator picks the existing
  // record instead of accidentally creating a duplicate. Email and phone
  // are the unique keys — name alone is NOT a dup signal.
  const [duplicate, setDuplicate] = useState(null)

  useEffect(() => {
    if (!open) { setDuplicate(null); return }
    setErr('')
    setForm(editing ? fromRecord(editing) : { ...EMPTY, ...(prefill || {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id])

  const isEditing = !!editing

  // Live duplicate check — keyed on email + phone, NOT name. Email match
  // is case-insensitive trimmed; phone match strips all non-digits so
  // "027 123 4567" and "0271234567" collide. Skipped while editing an
  // existing record (we'd flag the row against itself). ProLine is
  // single-tenant so no business_id filter is needed.
  useEffect(() => {
    if (!open || isEditing) { setDuplicate(null); return }
    const email = (form.email || '').trim().toLowerCase()
    const phone = (form.phone || '').replace(/\D/g, '')
    if (!email && phone.length < 6) { setDuplicate(null); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const filters = []
      if (email) filters.push(`email.ilike.${email}`)
      if (phone.length >= 6) filters.push(`phone.ilike.%${phone.slice(-8)}%`)
      if (filters.length === 0) return
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, phone, address, suburb')
        .or(filters.join(','))
        .limit(10)
      if (cancelled) return
      // Tighten match in JS — DB filter on phone uses a substring; could
      // match shorter dial-out prefixes. Compare strictly here.
      const match = (data || []).find(c => {
        if (email && (c.email || '').trim().toLowerCase() === email) return true
        if (phone.length >= 6) {
          const cp = (c.phone || '').replace(/\D/g, '')
          if (cp && (cp === phone || cp.endsWith(phone) || phone.endsWith(cp))) return true
        }
        return false
      })
      setDuplicate(match || null)
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, isEditing, form.email, form.phone])

  function useExisting() {
    if (!duplicate) return
    onSaved?.(duplicate)
    onClose?.()
  }

  async function handleSave() {
    if (!form.name.trim()) return setErr('Name is required')
    setErr(''); setSaving(true)
    try {
      // Belt-and-braces dup check on submit — only when creating, by
      // email or phone. The live useEffect already guards against this
      // but a 250ms debounce window means a fast operator could submit
      // before the live check catches a freshly-typed match.
      if (!isEditing) {
        const trimmedEmail = form.email.trim().toLowerCase()
        const trimmedPhone = form.phone.replace(/\D/g, '')
        if (trimmedEmail || trimmedPhone.length >= 6) {
          const filters = []
          if (trimmedEmail) filters.push(`email.ilike.${trimmedEmail}`)
          if (trimmedPhone.length >= 6) filters.push(`phone.ilike.%${trimmedPhone.slice(-8)}%`)
          const { data: existing } = await supabase
            .from('customers')
            .select('id, name, email, phone, address, suburb')
            .or(filters.join(','))
            .limit(10)
          const match = (existing || []).find(c => {
            if (trimmedEmail && (c.email || '').trim().toLowerCase() === trimmedEmail) return true
            if (trimmedPhone.length >= 6) {
              const cp = (c.phone || '').replace(/\D/g, '')
              if (cp && (cp === trimmedPhone || cp.endsWith(trimmedPhone) || trimmedPhone.endsWith(cp))) return true
            }
            return false
          })
          if (match) {
            setDuplicate(match)
            setSaving(false)
            return
          }
        }
      }

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

        {/* Duplicate warning — fires while typing email or phone. Email
            and phone are the unique keys; two customers sharing either
            is the strong signal that they're the same person and someone
            fat-fingered a new record. The operator can pick the existing
            customer or change contact info to something distinct. */}
        {duplicate && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={2.25} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  A customer with this email or phone already exists: "{duplicate.name}"
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 truncate">
                  {[duplicate.email, duplicate.phone].filter(Boolean).join(' · ') || [duplicate.address, duplicate.suburb].filter(Boolean).join(', ') || 'No contact info'}
                </p>
                <button
                  type="button"
                  onClick={useExisting}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 text-[11px] font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                >
                  Use existing customer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Input wrapperClassName="col-span-2" label="Street address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="12 Main St" />
          <Input label="Suburb" value={form.suburb} onChange={e => update('suburb', e.target.value)} placeholder="Riccarton" />
        </div>

        <TextArea label="Notes" rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Gate code, pets, preferred times…" />

        {err && <p className="text-sm text-red-500 font-medium">{err}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.name.trim() || (!isEditing && !!duplicate)} className="flex-1">
            {isEditing ? 'Save changes' : duplicate ? 'Email or phone already used' : 'Create customer'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
