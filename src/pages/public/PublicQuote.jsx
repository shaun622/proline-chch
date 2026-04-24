import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, X as XIcon, Phone, Mail, Building2 } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmModal from '../../components/ui/ConfirmModal'
import EmptyState from '../../components/ui/EmptyState'
import { supabase } from '../../lib/supabase'
import { badgeFor, labelFor, QUOTE_STATUSES } from '../../lib/constants'
import { currency, formatDate } from '../../lib/utils'

export default function PublicQuote() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null) // 'accept' | 'decline' | null
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: res } = await supabase.rpc('public_quote_by_token', { p_token: token })
    setData(res && !res.error ? res : null)
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function respond(accept) {
    setBusy(true)
    try {
      const rpc = accept ? 'accept_quote_by_token' : 'decline_quote_by_token'
      await supabase.rpc(rpc, { p_token: token })
      await load()
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading…</div>
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <EmptyState title="Quote not found" description="This link may have expired or been removed. Please contact us if you think this is an error." />
        </Card>
      </div>
    )
  }

  const { quote, customer, business, lines } = data
  const statusLabel = labelFor(QUOTE_STATUSES, quote.status)
  const statusVariant = badgeFor(QUOTE_STATUSES, quote.status)
  const decided = ['accepted', 'declined'].includes(quote.status)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 py-6 md:py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 shadow-card flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain dark:invert" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{business?.name || 'ProLine Aluminium'}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{business?.address || 'Christchurch & Canterbury'}</p>
            </div>
          </div>
          <Badge variant={statusVariant} dot>{statusLabel}</Badge>
        </header>

        <Card className="!p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Quote</p>
              <p className="font-mono text-lg">{quote.number}</p>
              {quote.title && <h2 className="text-xl font-bold mt-1">{quote.title}</h2>}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total (incl. GST)</p>
              <p className="text-2xl font-bold tabular-nums">{currency(quote.total)}</p>
              {quote.valid_until && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Valid until {formatDate(quote.valid_until)}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">For</p>
              <p className="font-medium">{customer?.name}</p>
              {[customer?.address, customer?.suburb].filter(Boolean).length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{[customer?.address, customer?.suburb].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Issued</p>
              <p className="text-sm">{formatDate(quote.created_at)}</p>
            </div>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <div className="col-span-7">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-1 text-right">Unit</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {(lines || []).length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No line items.</p>
            )}
            {(lines || []).map(l => (
              <div key={l.id} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm">
                <div className="col-span-12 md:col-span-7">{l.description}</div>
                <div className="col-span-4 md:col-span-2 text-right tabular-nums">{Number(l.qty)}</div>
                <div className="col-span-4 md:col-span-1 text-right tabular-nums">{currency(l.unit_price)}</div>
                <div className="col-span-4 md:col-span-2 text-right tabular-nums font-semibold">{currency(l.total)}</div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Subtotal</span><span className="tabular-nums">{currency(quote.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">GST ({Math.round(Number(quote.gst_rate) * 100)}%)</span><span className="tabular-nums">{currency(quote.gst_amount)}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-100 dark:border-gray-800"><span>Total</span><span className="tabular-nums">{currency(quote.total)}</span></div>
          </div>
        </Card>

        {quote.notes && (
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Notes / terms</p>
            <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
          </Card>
        )}
        {business?.quote_footer && (
          <Card><p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{business.quote_footer}</p></Card>
        )}

        {decided ? (
          <Card className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">This quote has been {quote.status}.</p>
            {quote.status === 'accepted' && <p className="text-xs text-gray-400 mt-1">We'll be in touch to book the work.</p>}
          </Card>
        ) : (
          <Card className="!py-4 !px-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-3">Happy with the quote?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" leftIcon={XIcon} onClick={() => setConfirm('decline')}>Decline</Button>
              <Button leftIcon={Check} onClick={() => setConfirm('accept')}>Accept</Button>
            </div>
          </Card>
        )}

        <footer className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 space-y-1">
          <p className="inline-flex items-center gap-1 justify-center"><Building2 className="w-3 h-3" /> {business?.name || 'ProLine Aluminium'}</p>
          <p className="inline-flex items-center gap-3 justify-center flex-wrap">
            {business?.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{business.phone}</span>}
            {business?.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{business.email}</span>}
          </p>
          {business?.gst_number && <p>GST {business.gst_number}</p>}
        </footer>
      </div>

      <ConfirmModal
        open={confirm === 'accept'}
        onClose={() => setConfirm(null)}
        onConfirm={() => respond(true)}
        title="Accept this quote?"
        description="We'll be in touch to book the work."
        confirmLabel="Yes, accept"
      />
      <ConfirmModal
        open={confirm === 'decline'}
        onClose={() => setConfirm(null)}
        onConfirm={() => respond(false)}
        destructive
        title="Decline this quote?"
        description="You can always get back in touch if things change."
        confirmLabel="Decline"
      />
    </div>
  )
}
