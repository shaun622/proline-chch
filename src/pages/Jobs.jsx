import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Wrench, Search, Calendar, User } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import NewJobModal from '../components/modals/NewJobModal'
import { supabase } from '../lib/supabase'
import { badgeFor, JOB_STATUSES, JOB_TYPES, labelFor } from '../lib/constants'
import { formatDate } from '../lib/utils'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const customerFilter = params.get('customer')

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('jobs')
      .select('*, customer:customer_id(id,name,property_type,suburb)')
      .order('scheduled_date', { ascending: false, nullsFirst: false })
    if (customerFilter) query = query.eq('customer_id', customerFilter)
    const { data } = await query
    setJobs(data || [])
    setLoading(false)
  }, [customerFilter])

  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return jobs.filter(j => {
      if (filter !== 'all' && j.status !== filter) return false
      if (!term) return true
      return [j.title, j.description, j.customer?.name, j.address, labelFor(JOB_TYPES, j.job_type)]
        .some(v => v?.toLowerCase().includes(term))
    })
  }, [jobs, filter, q])

  const counts = useMemo(() => {
    const c = { all: jobs.length }
    for (const s of JOB_STATUSES) c[s.value] = jobs.filter(j => j.status === s.value).length
    return c
  }, [jobs])

  const heroSub = customerFilter
    ? `Filtered to one customer · ${jobs.length} job${jobs.length === 1 ? '' : 's'}`
    : loading ? 'Loading…' : `${jobs.length} ${jobs.length === 1 ? 'job' : 'jobs'}`

  return (
    <PageWrapper width="wide">
      <PageHero
        title="Jobs"
        subtitle={heroSub}
        action={<Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Job</Button>}
      />

      {customerFilter && (
        <div className="mb-4">
          <button
            onClick={() => { setParams({}); }}
            className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline"
          >
            Clear customer filter
          </button>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search jobs by title, customer, type…"
          className="input pl-10"
        />
      </div>

      <FilterChips
        className="mb-4"
        options={[
          { value: 'all', label: 'All', count: counts.all },
          ...JOB_STATUSES.map(s => ({ value: s.value, label: s.label, count: counts[s.value] })),
        ]}
        value={filter}
        onChange={setFilter}
        ariaLabel="Job status"
      />

      {loading ? null : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wrench}
            title={jobs.length === 0 ? 'No jobs yet' : 'No matches'}
            description={jobs.length === 0 ? 'Book your first repair or install.' : 'Try a different search or filter.'}
            action={jobs.length === 0 && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Job</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(j => (
            <Card key={j.id} onClick={() => nav(`/jobs/${j.id}`)}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={badgeFor(JOB_TYPES, j.job_type)}>{labelFor(JOB_TYPES, j.job_type)}</Badge>
                    {j.job_kind === 'new' && <Badge variant="primary">New</Badge>}
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{j.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {j.customer?.name && <span className="inline-flex items-center gap-1 truncate"><User className="w-3 h-3 shrink-0" />{j.customer.name}</span>}
                    {j.scheduled_date && <span className="inline-flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" />{formatDate(j.scheduled_date)}</span>}
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge variant={badgeFor(JOB_STATUSES, j.status)} dot>{labelFor(JOB_STATUSES, j.status)}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewJobModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        prefill={customerFilter ? { customer_id: customerFilter } : null}
        onSaved={(row) => { load(); nav(`/jobs/${row.id}`) }}
      />
    </PageWrapper>
  )
}
