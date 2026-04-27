import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { User, Calendar, Pencil, Trash2, Send, Copy, ExternalLink, CircleDollarSign, AlertCircle } from 'lucide-react'
import Header from '../components/layout/Header'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import DetailRow from '../components/ui/DetailRow'
import ConfirmModal from '../components/ui/ConfirmModal'
import LineItemsEditor from '../components/ui/LineItemsEditor'
import NewInvoiceModal from '../components/modals/NewInvoiceModal'
import { supabase } from '../lib/supabase'
import { sendInvoiceEmail } from '../lib/sendEmail'
import { badgeFor, INVOICE_STATUSES, labelFor } from '../lib/constants'
import { currency, formatDate } from '../lib/utils'

function isOverdue(row) {
  if (!row || row.status !== 'sent') return false
  if (!row.due_date) return false
  return new Date(row.due_date) < new Date(new Date().toDateString())
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: inv }, { data: ls }] = await Promise.all([
      supabase.from('invoices').select('*, customer:customer_id(id,name,phone,email,address,suburb), job:job_id(id,title), quote:quote_id(id,number)').eq('id', id).maybeSingle(),
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('sort'),
    ])
    setInvoice(inv || null)
    setLines(ls || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw error
    nav('/invoices', { replace: true })
  }

  async function setStatus(status) {
    const patch = { status }
    if (status === 'sent' && !invoice.sent_at) patch.sent_at = new Date().toISOString()
    if (status === 'paid') { patch.paid_at = new Date().toISOString(); patch.paid_amount = invoice.total }
    await supabase.from('invoices').update(patch).eq('id', id)
    await load()
  }

  function copyPublicLink() {
    const url = `${location.origin}/i/${invoice.public_token}`
    navigator.clipboard?.writeText(url)
    setToast('Link copied')
    setTimeout(() => setToast(''), 1500)
  }

  async function sendByEmail() {
    if (!invoice.customer?.email) {
      setToast('Add a customer email first')
      setTimeout(() => setToast(''), 2000)
      return
    }
    setSending(true)
    try {
      const res = await sendInvoiceEmail({ invoiceId: invoice.id, to: invoice.customer.email })
      if (res?.warning === 'email_sent_status_update_failed') {
        setToast('Sent — but status update failed. Refreshing.')
        setTimeout(() => setToast(''), 4000)
      } else {
        setToast(`Sent to ${invoice.customer.email}`)
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
  if (!invoice) {
    return (
      <>
        <Header title="Invoice" backTo="/invoices" />
        <PageWrapper><Card><EmptyState title="Invoice not found" description="It may have been deleted." /></Card></PageWrapper>
      </>
    )
  }

  const overdue = isOverdue(invoice)
  const effectiveStatus = overdue ? 'overdue' : invoice.status

  return (
    <>
      <Header
        title={invoice.number}
        subtitle={invoice.title || invoice.customer?.name}
        backTo="/invoices"
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
                {overdue ? (
                  <Badge variant="danger" dot>Overdue</Badge>
                ) : (
                  <Badge variant={badgeFor(INVOICE_STATUSES, invoice.status)} dot>{labelFor(INVOICE_STATUSES, invoice.status)}</Badge>
                )}
              </div>
              <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{invoice.number}</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words">{invoice.title || '—'}</h1>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold tabular-nums">{currency(invoice.total)}</p>
            </div>
          </div>

          <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
            <DetailRow
              icon={User} color="brand" label="Customer" value={invoice.customer?.name}
              action={<button onClick={() => nav(`/customers/${invoice.customer?.id}`)} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View</button>}
            />
            {invoice.job && (
              <DetailRow icon={Calendar} color="emerald" label="Linked job" value={invoice.job.title}
                action={<button onClick={() => nav(`/jobs/${invoice.job.id}`)} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View</button>}
              />
            )}
            {invoice.quote && (
              <DetailRow icon={CircleDollarSign} color="indigo" label="From quote" value={invoice.quote.number}
                action={<button onClick={() => nav(`/quotes/${invoice.quote.id}`)} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View</button>}
              />
            )}
            <DetailRow
              icon={overdue ? AlertCircle : Calendar}
              color={overdue ? 'red' : 'amber'}
              label="Due"
              value={invoice.due_date ? formatDate(invoice.due_date) : 'No due date set'}
            />
          </Card>

          <div className="flex flex-wrap gap-2">
            {invoice.status === 'draft' && (
              <Button size="sm" leftIcon={Send} loading={sending} onClick={sendByEmail}>Email to customer</Button>
            )}
            {invoice.status === 'draft' && (
              <Button size="sm" variant="secondary" onClick={() => setStatus('sent')}>Mark sent (no email)</Button>
            )}
            {invoice.status === 'sent' && (
              <Button size="sm" leftIcon={Send} loading={sending} onClick={sendByEmail}>Resend email</Button>
            )}
            {invoice.status !== 'paid' && (
              <Button size="sm" variant={invoice.status === 'draft' ? 'secondary' : 'primary'} leftIcon={CircleDollarSign} onClick={() => setStatus('paid')}>Mark paid</Button>
            )}
            <Button size="sm" variant="secondary" leftIcon={Copy} onClick={copyPublicLink}>Copy customer link</Button>
            <a href={`/i/${invoice.public_token}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs min-h-[36px] inline-flex items-center gap-2 px-3 py-2">
              <ExternalLink className="w-4 h-4" /> Preview
            </a>
          </div>

          {toast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-elevated">{toast}</div>
          )}

          <div className="space-y-2">
            <h2 className="section-title">Line items</h2>
            <LineItemsEditor lines={lines.map(l => ({ ...l, id: l.id }))} readOnly />
          </div>

          {invoice.notes && (
            <div className="space-y-2">
              <h2 className="section-title">Notes / payment info</h2>
              <Card><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{invoice.notes}</p></Card>
            </div>
          )}
        </div>
      </PageWrapper>

      <NewInvoiceModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={invoice}
        editingLines={lines}
        onSaved={() => load()}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        destructive
        title="Delete this invoice?"
        description="This cannot be undone."
        confirmLabel="Delete"
      />
    </>
  )
}
