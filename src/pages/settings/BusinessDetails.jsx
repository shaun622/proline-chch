import { useEffect, useState } from 'react'
import { Building2, CheckCircle2 } from 'lucide-react'
import Header from '../../components/layout/Header'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import IconBox from '../../components/ui/IconBox'
import Toast from '../../components/ui/Toast'
import { Input, TextArea } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../hooks/useBusiness'

const EMPTY = {
  name: '',
  legal_name: '',
  email: '',
  phone: '',
  address: '',
  // gst_enabled is the master switch: false means we're not GST-
  // registered, so new docs save with rate=0 and the GST line is
  // hidden in totals / PDFs / emails. Toggling this off keeps the
  // entered rate around so flipping back on is one click.
  gst_enabled: true,
  gst_number: '',
  // GST rate stored as a decimal (0.15 = 15%) but edited in the form
  // as a percentage so the operator types "15" instead of "0.15".
  // The save handler converts back to decimal before writing.
  gst_rate_percent: 15,
  bank_account: '',
  quote_prefix: 'Q-',
  invoice_prefix: 'INV-',
  quote_footer: '',
  invoice_footer: '',
  payment_terms_days: 14,
}

export default function BusinessDetails() {
  const { business, loading, refresh } = useBusiness()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ msg: '', kind: 'info' })

  useEffect(() => {
    if (!business) return
    setForm({
      name: business.name || '',
      legal_name: business.legal_name || '',
      email: business.email || '',
      phone: business.phone || '',
      address: business.address || '',
      // gst_enabled may not be present on legacy rows that predate
      // migration 010 — treat absence as "registered" (current
      // behaviour) so we don't silently strip GST off active accounts.
      gst_enabled: business.gst_enabled !== false,
      gst_number: business.gst_number || '',
      // Decimal → percent for editing. business.gst_rate may arrive as
      // a string ("0.1500") from PostgREST numeric, so coerce.
      gst_rate_percent: business.gst_rate != null ? Number(business.gst_rate) * 100 : 15,
      bank_account: business.bank_account || '',
      quote_prefix: business.quote_prefix || 'Q-',
      invoice_prefix: business.invoice_prefix || 'INV-',
      quote_footer: business.quote_footer || '',
      invoice_footer: business.invoice_footer || '',
      payment_terms_days: business.payment_terms_days ?? 14,
    })
  }, [business])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    try {
      // Convert percent → decimal. Use Number.isFinite so an empty
      // field falls back to 15%, but explicit 0 is preserved (the
      // previous `|| 15` snapped any 0 back to 15, which was the bug
      // the operator hit when trying to disable GST by typing 0).
      const pct = Number(form.gst_rate_percent)
      const gstRate = Number.isFinite(pct) ? Math.max(0, Math.min(1, pct / 100)) : 0.15
      const payload = {
        ...form,
        payment_terms_days: Number(form.payment_terms_days) || 14,
        gst_enabled: !!form.gst_enabled,
        gst_rate: gstRate,
      }
      // Strip the UI-only percent field so it doesn't reach the row.
      delete payload.gst_rate_percent
      const { error } = business?.id
        ? await supabase.from('businesses').update(payload).eq('id', business.id)
        : await supabase.from('businesses').insert(payload)
      if (error) throw error
      await refresh()
      setToast({ msg: 'Saved', kind: 'success' })
      setTimeout(() => setToast({ msg: '', kind: 'info' }), 1500)
    } catch (e) {
      setToast({ msg: e.message || 'Save failed', kind: 'error' })
      setTimeout(() => setToast({ msg: '', kind: 'info' }), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header title="Business details" backTo="/settings" />
      <PageWrapper>
        {loading ? null : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <IconBox icon={Building2} color="brand" size="lg" />
              <div>
                <p className="font-semibold">Your business</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Appears on quotes, invoices, and the customer portal.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="section-title">Contact</h2>
              <Input label="Trading name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="ProLine Aluminium" />
              <Input label="Legal name" value={form.legal_name} onChange={e => update('legal_name', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
                <Input label="Phone" value={form.phone} onChange={e => update('phone', e.target.value)} />
              </div>
              <Input label="Service area / address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Christchurch & Canterbury" />
            </div>

            <div className="space-y-4">
              <h2 className="section-title">Tax & payment</h2>

              {/* GST toggle — disabled state greys the rate + number
                  inputs but keeps their values around so flipping back
                  on doesn't lose the operator's settings. */}
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Charge GST</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {form.gst_enabled
                      ? 'New quotes and invoices include GST at the rate below.'
                      : "Off — new quotes and invoices won't include GST. Turn on once you're GST-registered."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.gst_enabled}
                  onClick={() => update('gst_enabled', !form.gst_enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${form.gst_enabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <span
                    aria-hidden
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform translate-y-0.5 ${form.gst_enabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className={form.gst_enabled ? '' : 'opacity-50 pointer-events-none'}>
                  <Input label="GST number" value={form.gst_number} onChange={e => update('gst_number', e.target.value)} placeholder="123-456-789" disabled={!form.gst_enabled} />
                </div>
                <div className={form.gst_enabled ? '' : 'opacity-50 pointer-events-none'}>
                  <Input label="GST rate (%)" type="number" min="0" max="100" step="0.1" value={form.gst_rate_percent} onChange={e => update('gst_rate_percent', e.target.value)} placeholder="15" disabled={!form.gst_enabled} />
                </div>
                <Input label="Payment terms (days)" type="number" min="0" value={form.payment_terms_days} onChange={e => update('payment_terms_days', e.target.value)} />
              </div>
              <TextArea label="Bank account for direct credit" rows={2} value={form.bank_account} onChange={e => update('bank_account', e.target.value)} placeholder="Bank — 12-3456-7890123-00" />
            </div>

            <div className="space-y-4">
              <h2 className="section-title">Document numbering</h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Quote prefix" value={form.quote_prefix} onChange={e => update('quote_prefix', e.target.value)} placeholder="Q-" />
                <Input label="Invoice prefix" value={form.invoice_prefix} onChange={e => update('invoice_prefix', e.target.value)} placeholder="INV-" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="section-title">Document footers</h2>
              <TextArea label="Quote footer" rows={3} value={form.quote_footer} onChange={e => update('quote_footer', e.target.value)} placeholder="Terms, exclusions, default warranty…" />
              <TextArea label="Invoice footer" rows={3} value={form.invoice_footer} onChange={e => update('invoice_footer', e.target.value)} placeholder="Thanks for your business. Payment details above." />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} loading={saving}>Save changes</Button>
              {toast.kind === 'success' && toast.msg && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {toast.msg}
                </span>
              )}
            </div>
          </div>
        )}
      </PageWrapper>

      {toast.kind === 'error' && <Toast message={toast.msg} kind="error" />}
    </>
  )
}
