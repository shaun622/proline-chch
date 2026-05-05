import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { User, Calendar, Pencil, Trash2, Send, Check, X as XIcon, Copy, Receipt, ExternalLink } from 'lucide-react'
import Header from '../components/layout/Header'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import DetailRow from '../components/ui/DetailRow'
import ConfirmModal from '../components/ui/ConfirmModal'
import LineItemsEditor from '../components/ui/LineItemsEditor'
import NewQuoteModal from '../components/modals/NewQuoteModal'
import { supabase } from '../lib/supabase'
import { sendQuoteEmail } from '../lib/sendEmail'
import { badgeFor, labelFor, QUOTE_STATUSES } from '../lib/constants'
import { currency, formatDate } from '../lib/utils'

export default function QuoteDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [quote, setQuote] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: q }, { data: ls }] = await Promise.all([
      supabase.from('quotes').select('*, customer:customer_id(id,name,phone,email,address,suburb), job:job_id(id,title)').eq('id', id).maybeSingle(),
      supabase.from('quote_line_items').select('*').eq('quote_id', id).order('sort'),
    ])
    setQuote(q || null)
    setLines(ls || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    if (error) throw error
    nav('/quotes', { replace: true })
  }

  async function setStatus(status) {
    const patch = { status }
    if (status === 'sent' && !quote.sent_at) patch.sent_at = new Date().toISOString()
    if (status === 'accepted' && !quote.accepted_at) patch.accepted_at = new Date().toISOString()
    if (status === 'declined' && !quote.declined_at) patch.declined_at = new Date().toISOString()
    await supabase.from('quotes').update(patch).eq('id', id)
    await load()
  }

  async function convertToInvoice() {
    // Carry over line items to a new invoice via URL pre-fill path
    nav(`/invoices?quote=${quote.id}`)
  }

  function copyPublicLink() {
    const url = `${location.origin}/q/${quote.public_token}`
    navigator.clipboard?.writeText(url)
    setToast('Link copied')
    setTimeout(() => setToast(''), 1500)
  }

  async function sendByEmail() {
    if (!quote.customer?.email) {
      setToast('Add a customer email first')
      setTimeout(() => setToast(''), 2000)
      return
    }
    setSending(true)
    try {
      const res = await sendQuoteEmail({ quoteId: quote.id, to: quote.customer.email })
      if (res?.warning === 'email_sent_status_update_failed') {
        setToast('Sent — but status update failed. Refreshing.')
        setTimeout(() => setToast(''), 4000)
      } else {
        setToast(`Sent to ${quote.customer.email}`)
        setTimeout(() => setToast(''), 2500)
      }
      await load()
    } catch (e) {
      setToast(e.message || 'Send failed')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSending(false)
    }
  }

  if (loading) return null
  if (!quote) {
    return (
      <>
        <Header title="Quote" backTo="/quotes" />
        <PageWrapper><Card><EmptyState title="Quote not found" description="It may have been deleted." /></Card></PageWrapper>
      </>
    )
  }

  return (
    <>
      <Header
        title={quote.number}
        subtitle={quote.title || quote.customer?.name}
        backTo="/quotes"
        right={
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setEditOpen(true)} aria-label="Edit"
              className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              <Pencil className="w-4 h-4" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => setDeleteOpen(true)} aria-label="Delete"
              className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
              <Trash2 className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        }
      />
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={badgeFor(QUOTE_STATUSES, quote.status)} dot>{labelFor(QUOTE_STATUSES, quote.status)}</Badge>
              </div>
              <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{quote.number}</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words">{quote.title || '—'}</h1>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold tabular-nums">{currency(quote.total)}</p>
            </div>
          </div>

          <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
            <DetailRow
              icon={User} color="brand" label="Customer" value={quote.customer?.name}
              action={<button onClick={() => nav(`/customers/${quote.customer?.id}`)} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View</button>}
            />
            {quote.job && (
              <DetailRow icon={Calendar} color="emerald" label="Linked job" value={quote.job.title}
                action={<button onClick={() => nav(`/jobs/${quote.job.id}`)} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View</button>}
              />
            )}
            <DetailRow icon={Calendar} color="amber" label="Valid until" value={quote.valid_until ? formatDate(quote.valid_until) : 'No expiry set'} />
          </Card>

          <div className="flex flex-wrap gap-2">
            {quote.status === 'draft' && (
              <Button size="sm" leftIcon={Send} loading={sending} onClick={sendByEmail}>Email to customer</Button>
            )}
            {quote.status === 'draft' && (
              <Button size="sm" variant="secondary" onClick={() => setStatus('sent')}>Mark sent (no email)</Button>
            )}
            {quote.status === 'sent' && (
              <Button size="sm" leftIcon={Send} loading={sending} onClick={sendByEmail}>Resend email</Button>
            )}
            {['sent','draft'].includes(quote.status) && (
              <>
                <Button size="sm" variant="secondary" leftIcon={Check} onClick={() => setStatus('accepted')}>Mark accepted</Button>
                <Button size="sm" variant="secondary" leftIcon={XIcon} onClick={() => setStatus('declined')}>Mark declined</Button>
              </>
            )}
            {quote.status === 'accepted' && (
              <Button size="sm" leftIcon={Receipt} onClick={convertToInvoice}>Create invoice</Button>
            )}
            <Button size="sm" variant="secondary" leftIcon={Copy} onClick={copyPublicLink}>Copy customer link</Button>
            <a href={`/q/${quote.public_token}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs min-h-[36px] inline-flex items-center gap-2 px-3 py-2">
              <ExternalLink className="w-4 h-4" /> Preview
            </a>
          </div>

          {toast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-elevated">{toast}</div>
          )}

          <div className="space-y-2">
            <h2 className="section-title">Line items</h2>
            {/* Pass the quote's per-doc gst_rate so the GST line
                hides for docs issued without GST (rate 0). Without
                this, LineItemsEditor falls back to its 0.15 default
                and shows "GST (15%)" on every quote regardless. */}
            <LineItemsEditor
              lines={lines.map(l => ({ ...l, id: l.id }))}
              readOnly
              gstRate={quote.gst_rate != null ? Number(quote.gst_rate) : 0.15}
            />
          </div>

          {quote.notes && (
            <div className="space-y-2">
              <h2 className="section-title">Notes / terms</h2>
              <Card><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{quote.notes}</p></Card>
            </div>
          )}
        </div>
      </PageWrapper>

      <NewQuoteModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={quote}
        editingLines={lines}
        onSaved={() => load()}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        destructive
        title="Delete this quote?"
        description="This cannot be undone."
        confirmLabel="Delete"
      />
    </>
  )
}
