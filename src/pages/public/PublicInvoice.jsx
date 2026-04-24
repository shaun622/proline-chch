import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Phone, Mail, Building2, AlertCircle, CheckCircle2, CircleDollarSign } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { supabase } from '../../lib/supabase'
import { badgeFor, INVOICE_STATUSES, labelFor } from '../../lib/constants'
import { currency, formatDate } from '../../lib/utils'

function isOverdue(inv) {
  if (!inv || inv.status !== 'sent' || !inv.due_date) return false
  return new Date(inv.due_date) < new Date(new Date().toDateString())
}

export default function PublicInvoice() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: res } = await supabase.rpc('public_invoice_by_token', { p_token: token })
    setData(res && !res.error ? res : null)
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading…</div>
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full"><EmptyState title="Invoice not found" description="This link may have expired or been removed." /></Card>
      </div>
    )
  }

  const { invoice, customer, business, lines } = data
  const overdue = isOverdue(invoice)

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
          {overdue ? (
            <Badge variant="danger" dot>Overdue</Badge>
          ) : (
            <Badge variant={badgeFor(INVOICE_STATUSES, invoice.status)} dot>{labelFor(INVOICE_STATUSES, invoice.status)}</Badge>
          )}
        </header>

        <Card className="!p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Invoice</p>
              <p className="font-mono text-lg">{invoice.number}</p>
              {invoice.title && <h2 className="text-xl font-bold mt-1">{invoice.title}</h2>}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount due</p>
              <p className="text-2xl font-bold tabular-nums">{currency(invoice.total - (invoice.paid_amount || 0))}</p>
              {invoice.due_date && (
                <p className={'text-xs mt-1 ' + (overdue ? 'text-red-600 dark:text-red-400 font-medium inline-flex items-center gap-1' : 'text-gray-500 dark:text-gray-400')}>
                  {overdue && <AlertCircle className="w-3 h-3" />} Due {formatDate(invoice.due_date)}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Billed to</p>
              <p className="font-medium">{customer?.name}</p>
              {[customer?.address, customer?.suburb].filter(Boolean).length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{[customer?.address, customer?.suburb].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Issued</p>
              <p className="text-sm">{formatDate(invoice.created_at)}</p>
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
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Subtotal</span><span className="tabular-nums">{currency(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">GST ({Math.round(Number(invoice.gst_rate) * 100)}%)</span><span className="tabular-nums">{currency(invoice.gst_amount)}</span></div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-100 dark:border-gray-800"><span>Total</span><span className="tabular-nums">{currency(invoice.total)}</span></div>
          </div>
        </Card>

        {business?.bank_account && invoice.status !== 'paid' && (
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <CircleDollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Payment — direct credit</p>
                <p className="text-sm whitespace-pre-wrap">{business.bank_account}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please use <span className="font-mono">{invoice.number}</span> as the reference.</p>
              </div>
            </div>
          </Card>
        )}

        {invoice.status === 'paid' && (
          <Card className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">Paid</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {invoice.paid_at ? `on ${formatDate(invoice.paid_at)}` : 'Thanks for your payment.'}
              </p>
            </div>
          </Card>
        )}

        {invoice.notes && (
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </Card>
        )}
        {business?.invoice_footer && (
          <Card><p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{business.invoice_footer}</p></Card>
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
    </div>
  )
}
