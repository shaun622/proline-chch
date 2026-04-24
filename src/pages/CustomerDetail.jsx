import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Phone, Mail, MapPin, Pencil, Trash2, Wrench, FileText, Receipt, Building2, House } from 'lucide-react'
import Header from '../components/layout/Header'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import DetailRow from '../components/ui/DetailRow'
import ConfirmModal from '../components/ui/ConfirmModal'
import NewCustomerModal from '../components/modals/NewCustomerModal'
import { supabase } from '../lib/supabase'
import { badgeFor, JOB_STATUSES, JOB_TYPES, labelFor, PROPERTY_TYPES } from '../lib/constants'
import { currency, formatDate, initials } from '../lib/utils'

export default function CustomerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [c, j, q, i] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).maybeSingle(),
      supabase.from('jobs').select('*').eq('customer_id', id).order('scheduled_date', { ascending: false, nullsFirst: false }).limit(20),
      supabase.from('quotes').select('id,number,status,title,total,created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
      supabase.from('invoices').select('id,number,status,title,total,due_date,created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(20),
    ])
    setCustomer(c.data || null)
    setJobs(j.data || [])
    setQuotes(q.data || [])
    setInvoices(i.data || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
    nav('/customers', { replace: true })
  }

  if (loading) return null
  if (!customer) {
    return (
      <>
        <Header title="Customer" backTo="/customers" />
        <PageWrapper>
          <Card><EmptyState title="Customer not found" description="It may have been deleted." /></Card>
        </PageWrapper>
      </>
    )
  }

  const PropertyIcon = customer.property_type === 'commercial' ? Building2 : House

  return (
    <>
      <Header
        title={customer.name}
        subtitle={labelFor(PROPERTY_TYPES, customer.property_type)}
        backTo="/customers"
        right={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Edit"
            >
              <Pencil className="w-4 h-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="min-h-tap min-w-tap flex items-center justify-center rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        }
      />
      <PageWrapper>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-brand text-white flex items-center justify-center shrink-0 font-bold text-xl shadow-glow">
              {initials(customer.name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={customer.property_type === 'commercial' ? 'primary' : 'default'}>
                  <PropertyIcon className="w-3 h-3" />
                  {labelFor(PROPERTY_TYPES, customer.property_type)}
                </Badge>
              </div>
            </div>
          </div>

          <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
            <DetailRow icon={Phone} color="emerald" label="Phone" value={customer.phone} action={customer.phone && <a href={`tel:${customer.phone}`} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">Call</a>} />
            <DetailRow icon={Mail} color="blue" label="Email" value={customer.email} action={customer.email && <a href={`mailto:${customer.email}`} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">Email</a>} />
            <DetailRow
              icon={MapPin}
              color="amber"
              label="Address"
              value={[customer.address, customer.suburb].filter(Boolean).join(', ')}
            />
          </Card>

          {customer.notes && (
            <div className="space-y-2">
              <h2 className="section-title">Notes</h2>
              <Card>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
              </Card>
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Jobs ({jobs.length})</h2>
              <button onClick={() => nav(`/jobs?customer=${customer.id}`)} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View all</button>
            </div>
            {jobs.length === 0 ? (
              <Card><EmptyState icon={Wrench} title="No jobs yet" description="Create a job for this customer." /></Card>
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 5).map(j => (
                  <Card key={j.id} onClick={() => nav(`/jobs/${j.id}`)}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{j.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {labelFor(JOB_TYPES, j.job_type)}
                          {j.scheduled_date ? ` · ${formatDate(j.scheduled_date)}` : ''}
                        </p>
                      </div>
                      <Badge variant={badgeFor(JOB_STATUSES, j.status)}>{labelFor(JOB_STATUSES, j.status)}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Quotes ({quotes.length})</h2>
              <button onClick={() => nav('/quotes')} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View all</button>
            </div>
            {quotes.length === 0 ? (
              <Card><EmptyState icon={FileText} title="No quotes yet" /></Card>
            ) : (
              <div className="space-y-2">
                {quotes.slice(0, 5).map(q => (
                  <Card key={q.id} onClick={() => nav(`/quotes/${q.id}`)}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{q.number}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{q.title || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm tabular-nums">{currency(q.total)}</p>
                        <Badge className="mt-1">{q.status}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Invoices ({invoices.length})</h2>
              <button onClick={() => nav('/invoices')} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">View all</button>
            </div>
            {invoices.length === 0 ? (
              <Card><EmptyState icon={Receipt} title="No invoices yet" /></Card>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map(i => (
                  <Card key={i.id} onClick={() => nav(`/invoices/${i.id}`)}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{i.number}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{i.title || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm tabular-nums">{currency(i.total)}</p>
                        <Badge className="mt-1">{i.status}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </PageWrapper>

      <NewCustomerModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={customer}
        onSaved={() => load()}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        destructive
        title="Delete this customer?"
        description="All related jobs, quotes, and invoices will also be deleted. This cannot be undone."
        confirmLabel="Delete"
      />
    </>
  )
}
