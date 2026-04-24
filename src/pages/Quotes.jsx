import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileText, Search, User } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import NewQuoteModal from '../components/modals/NewQuoteModal'
import { supabase } from '../lib/supabase'
import { badgeFor, labelFor, QUOTE_STATUSES } from '../lib/constants'
import { currency, formatDate } from '../lib/utils'

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const jobFilter = params.get('job')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('quotes')
      .select('*, customer:customer_id(id,name)')
      .order('created_at', { ascending: false })
    setQuotes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    if (jobFilter) setCreateOpen(true)
  }, [load, jobFilter])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return quotes.filter(row => {
      if (filter !== 'all' && row.status !== filter) return false
      if (!term) return true
      return [row.number, row.title, row.customer?.name].some(v => v?.toLowerCase().includes(term))
    })
  }, [quotes, filter, q])

  const counts = useMemo(() => {
    const c = { all: quotes.length }
    for (const s of QUOTE_STATUSES) c[s.value] = quotes.filter(r => r.status === s.value).length
    return c
  }, [quotes])

  const outstanding = useMemo(() => quotes.filter(q => q.status === 'sent').reduce((s, q) => s + Number(q.total || 0), 0), [quotes])

  async function prefillFromJob(jobId) {
    const { data } = await supabase.from('jobs').select('id, customer_id, title').eq('id', jobId).maybeSingle()
    return data ? { job_id: data.id, customer_id: data.customer_id, title: data.title } : null
  }

  const [prefill, setPrefill] = useState(null)
  useEffect(() => {
    if (!jobFilter) { setPrefill(null); return }
    prefillFromJob(jobFilter).then(setPrefill)
  }, [jobFilter])

  return (
    <PageWrapper width="wide">
      <PageHero
        title="Quotes"
        subtitle={loading ? 'Loading…' : `${quotes.length} quote${quotes.length === 1 ? '' : 's'}${outstanding > 0 ? ` · ${currency(outstanding)} awaiting acceptance` : ''}`}
        action={<Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Quote</Button>}
      />

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search quotes by number, title, customer…"
          className="input pl-10"
        />
      </div>

      <FilterChips
        className="mb-4"
        options={[
          { value: 'all', label: 'All', count: counts.all },
          ...QUOTE_STATUSES.map(s => ({ value: s.value, label: s.label, count: counts[s.value] })),
        ]}
        value={filter}
        onChange={setFilter}
        ariaLabel="Quote status"
      />

      {loading ? null : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title={quotes.length === 0 ? 'No quotes yet' : 'No matches'}
            description={quotes.length === 0 ? 'Draft your first estimate.' : 'Try a different search or filter.'}
            action={quotes.length === 0 && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Quote</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(row => (
            <Card key={row.id} onClick={() => nav(`/quotes/${row.id}`)}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.number}</p>
                    <Badge variant={badgeFor(QUOTE_STATUSES, row.status)} dot>{labelFor(QUOTE_STATUSES, row.status)}</Badge>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{row.title || '—'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {row.customer?.name && <span className="inline-flex items-center gap-1 truncate"><User className="w-3 h-3 shrink-0" />{row.customer.name}</span>}
                    <span className="shrink-0">{formatDate(row.created_at)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{currency(row.total)}</p>
                  {row.valid_until && <p className="text-[10px] text-gray-400 mt-1">exp {formatDate(row.valid_until)}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewQuoteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        prefill={prefill}
        onSaved={(row) => { load(); nav(`/quotes/${row.id}`) }}
      />
    </PageWrapper>
  )
}
