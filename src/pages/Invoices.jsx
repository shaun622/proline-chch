import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Receipt, Search, User, AlertCircle } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import NewInvoiceModal from '../components/modals/NewInvoiceModal'
import { supabase } from '../lib/supabase'
import { badgeFor, INVOICE_STATUSES, labelFor } from '../lib/constants'
import { currency, formatDate } from '../lib/utils'

function isOverdue(row) {
  if (row.status !== 'sent') return false
  if (!row.due_date) return false
  return new Date(row.due_date) < new Date(new Date().toDateString())
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const jobFilter = params.get('job')
  const quoteFilter = params.get('quote')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('invoices')
      .select('*, customer:customer_id(id,name)')
      .order('created_at', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    if (jobFilter || quoteFilter) setCreateOpen(true)
  }, [load, jobFilter, quoteFilter])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return invoices.filter(row => {
      const effective = isOverdue(row) ? 'overdue' : row.status
      if (filter !== 'all' && effective !== filter) return false
      if (!term) return true
      return [row.number, row.title, row.customer?.name].some(v => v?.toLowerCase().includes(term))
    })
  }, [invoices, filter, q])

  const counts = useMemo(() => {
    const c = { all: invoices.length, draft: 0, sent: 0, paid: 0, overdue: 0 }
    for (const row of invoices) {
      if (row.status === 'draft') c.draft++
      else if (row.status === 'paid') c.paid++
      else if (isOverdue(row)) c.overdue++
      else if (row.status === 'sent') c.sent++
      else if (row.status === 'overdue') c.overdue++
    }
    return c
  }, [invoices])

  const outstanding = useMemo(() => invoices.filter(r => r.status !== 'paid' && r.status !== 'draft').reduce((s, r) => s + Number(r.total || 0), 0), [invoices])

  const [prefill, setPrefill] = useState(null)
  useEffect(() => {
    (async () => {
      if (jobFilter) {
        const { data } = await supabase.from('jobs').select('id, customer_id, title').eq('id', jobFilter).maybeSingle()
        setPrefill(data ? { job_id: data.id, customer_id: data.customer_id, title: data.title } : null)
      } else if (quoteFilter) {
        setPrefill({ quote_id: quoteFilter })
      } else {
        setPrefill(null)
      }
    })()
  }, [jobFilter, quoteFilter])

  return (
    <PageWrapper width="wide">
      <PageHero
        title="Invoices"
        subtitle={loading ? 'Loading…' : `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}${outstanding > 0 ? ` · ${currency(outstanding)} outstanding` : ''}`}
        action={<Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Invoice</Button>}
      />

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search invoices by number, title, customer…"
          className="input pl-10"
        />
      </div>

      <FilterChips
        className="mb-4"
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'draft', label: 'Draft', count: counts.draft },
          { value: 'sent', label: 'Sent', count: counts.sent },
          { value: 'overdue', label: 'Overdue', count: counts.overdue },
          { value: 'paid', label: 'Paid', count: counts.paid },
        ]}
        value={filter}
        onChange={setFilter}
        ariaLabel="Invoice status"
      />

      {loading ? null : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title={invoices.length === 0 ? 'No invoices yet' : 'No matches'}
            description={invoices.length === 0 ? 'Send your first invoice.' : 'Try a different search or filter.'}
            action={invoices.length === 0 && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Invoice</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(row => {
            const overdue = isOverdue(row)
            return (
              <Card key={row.id} onClick={() => nav(`/invoices/${row.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.number}</p>
                      {overdue ? (
                        <Badge variant="danger" dot>Overdue</Badge>
                      ) : (
                        <Badge variant={badgeFor(INVOICE_STATUSES, row.status)} dot>{labelFor(INVOICE_STATUSES, row.status)}</Badge>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{row.title || '—'}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {row.customer?.name && <span className="inline-flex items-center gap-1 truncate"><User className="w-3 h-3 shrink-0" />{row.customer.name}</span>}
                      {row.due_date && <span className={'shrink-0 ' + (overdue ? 'text-red-600 dark:text-red-400 font-medium inline-flex items-center gap-1' : '')}>{overdue && <AlertCircle className="w-3 h-3" />}due {formatDate(row.due_date)}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">{currency(row.total)}</p>
                    {row.paid_amount > 0 && row.status !== 'paid' && (
                      <p className="text-[10px] text-emerald-600 mt-1">paid {currency(row.paid_amount)}</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <NewInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        prefill={prefill}
        onSaved={(row) => { load(); nav(`/invoices/${row.id}`) }}
      />
    </PageWrapper>
  )
}
