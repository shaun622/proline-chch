import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Wrench, Receipt, FileText, Plus, Users, ArrowRight, AlertCircle } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import IconBox from '../components/ui/IconBox'
import EmptyState from '../components/ui/EmptyState'
import NewJobModal from '../components/modals/NewJobModal'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../hooks/useBusiness'
import { badgeFor, JOB_STATUSES, JOB_TYPES, labelFor } from '../lib/constants'
import { currency, formatDate } from '../lib/utils'

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
function endOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x
}

export default function Home() {
  const nav = useNavigate()
  const { business } = useBusiness()
  const [stats, setStats] = useState({ outstanding: 0, quotesPending: 0, jobsInProgress: 0, jobsToday: 0 })
  const [today, setToday] = useState([])
  const [overdueInvoices, setOverdueInvoices] = useState([])
  const [newJobOpen, setNewJobOpen] = useState(false)

  const load = useCallback(async () => {
    const nowIso = new Date().toISOString()
    const dayStart = startOfDay().toISOString()
    const dayEnd = endOfDay().toISOString()
    const today = new Date().toISOString().slice(0, 10)
    const [todayJobs, inProgress, quotesSent, invoicesUnpaid, overdues] = await Promise.all([
      supabase.from('jobs').select('*, customer:customer_id(id,name)').gte('scheduled_date', dayStart).lte('scheduled_date', dayEnd).order('scheduled_date'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('quotes').select('total').eq('status', 'sent'),
      supabase.from('invoices').select('total').in('status', ['sent']),
      supabase.from('invoices').select('*, customer:customer_id(id,name)').eq('status', 'sent').lt('due_date', today).order('due_date').limit(5),
    ])
    const outstanding = (invoicesUnpaid.data || []).reduce((s, r) => s + Number(r.total || 0), 0)
    const quotesPending = (quotesSent.data || []).reduce((s, r) => s + Number(r.total || 0), 0)
    setStats({
      outstanding,
      quotesPending,
      jobsInProgress: inProgress.count || 0,
      jobsToday: (todayJobs.data || []).length,
    })
    setToday(todayJobs.data || [])
    setOverdueInvoices(overdues.data || [])
  }, [])

  useEffect(() => { load() }, [load])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const firstName = (business?.name || 'there').split(' ')[0]

  return (
    <PageWrapper width="wide">
      <PageHero
        title={`${greeting}, Michael`}
        subtitle={new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })}
        action={<Button leftIcon={Plus} onClick={() => setNewJobOpen(true)}>New Job</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card onClick={() => nav('/jobs?status=in_progress')} className="flex items-center gap-3">
          <IconBox icon={Wrench} color="blue" />
          <div className="min-w-0">
            <p className="text-2xl font-bold tabular-nums">{stats.jobsInProgress}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">In progress</p>
          </div>
        </Card>
        <Card onClick={() => nav('/jobs')} className="flex items-center gap-3">
          <IconBox icon={Calendar} color="emerald" />
          <div className="min-w-0">
            <p className="text-2xl font-bold tabular-nums">{stats.jobsToday}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Jobs today</p>
          </div>
        </Card>
        <Card onClick={() => nav('/quotes')} className="flex items-center gap-3">
          <IconBox icon={FileText} color="indigo" />
          <div className="min-w-0">
            <p className="text-lg font-bold tabular-nums truncate">{currency(stats.quotesPending)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Quotes awaiting</p>
          </div>
        </Card>
        <Card onClick={() => nav('/invoices')} className="flex items-center gap-3">
          <IconBox icon={Receipt} color="amber" />
          <div className="min-w-0">
            <p className="text-lg font-bold tabular-nums truncate">{currency(stats.outstanding)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
          </div>
        </Card>
      </div>

      <section className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Today's jobs</h2>
          <button onClick={() => nav('/schedule')} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline inline-flex items-center gap-1">
            See schedule <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {today.length === 0 ? (
          <Card><EmptyState icon={Calendar} title="Nothing scheduled today" description="Take a breather or knock out some admin." /></Card>
        ) : (
          <div className="space-y-2">
            {today.map(j => (
              <Card key={j.id} onClick={() => nav(`/jobs/${j.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={badgeFor(JOB_TYPES, j.job_type)}>{labelFor(JOB_TYPES, j.job_type)}</Badge>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{j.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{j.customer?.name}</p>
                  </div>
                  <Badge variant={badgeFor(JOB_STATUSES, j.status)} dot>{labelFor(JOB_STATUSES, j.status)}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {overdueInvoices.length > 0 && (
        <section className="mb-6 space-y-2">
          <h2 className="section-title flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue invoices
          </h2>
          <div className="space-y-2">
            {overdueInvoices.map(inv => (
              <Card key={inv.id} onClick={() => nav(`/invoices/${inv.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{inv.number}</p>
                      <Badge variant="danger" dot>Overdue</Badge>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{inv.title || '—'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{inv.customer?.name} · due {formatDate(inv.due_date)}</p>
                  </div>
                  <p className="font-semibold tabular-nums shrink-0">{currency(inv.total)}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="section-title">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => nav('/customers')} className="card-interactive flex flex-col items-start gap-2 text-left">
            <IconBox icon={Users} color="brand" />
            <div>
              <p className="font-semibold text-sm">Customers</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add or edit</p>
            </div>
          </button>
          <button onClick={() => setNewJobOpen(true)} className="card-interactive flex flex-col items-start gap-2 text-left">
            <IconBox icon={Wrench} color="blue" />
            <div>
              <p className="font-semibold text-sm">New job</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Schedule or repair</p>
            </div>
          </button>
          <button onClick={() => nav('/quotes')} className="card-interactive flex flex-col items-start gap-2 text-left">
            <IconBox icon={FileText} color="indigo" />
            <div>
              <p className="font-semibold text-sm">Quotes</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Draft & send</p>
            </div>
          </button>
          <button onClick={() => nav('/invoices')} className="card-interactive flex flex-col items-start gap-2 text-left">
            <IconBox icon={Receipt} color="emerald" />
            <div>
              <p className="font-semibold text-sm">Invoices</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Send & collect</p>
            </div>
          </button>
        </div>
      </section>

      <NewJobModal open={newJobOpen} onClose={() => setNewJobOpen(false)} onSaved={(row) => { load(); nav(`/jobs/${row.id}`) }} />
    </PageWrapper>
  )
}
