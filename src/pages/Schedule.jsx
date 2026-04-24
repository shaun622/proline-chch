import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Plus, User, ChevronLeft, ChevronRight } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import NewJobModal from '../components/modals/NewJobModal'
import { supabase } from '../lib/supabase'
import { badgeFor, JOB_STATUSES, JOB_TYPES, labelFor } from '../lib/constants'

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = x.getDay() // 0 = Sun
  const diff = (day + 6) % 7 // days since Monday
  x.setDate(x.getDate() - diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function Schedule() {
  const nav = useNavigate()
  const [weekStart, setWeekStart] = useState(() => startOfWeek())
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newJobOpen, setNewJobOpen] = useState(false)

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jobs')
      .select('*, customer:customer_id(id,name)')
      .gte('scheduled_date', weekStart.toISOString())
      .lt('scheduled_date', weekEnd.toISOString())
      .order('scheduled_date')
    setJobs(data || [])
    setLoading(false)
  }, [weekStart, weekEnd])

  useEffect(() => { load() }, [load])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const byDay = useMemo(() => {
    const map = new Map()
    for (const d of days) map.set(d.toDateString(), [])
    for (const j of jobs) {
      const d = new Date(j.scheduled_date)
      const key = d.toDateString()
      if (map.has(key)) map.get(key).push(j)
    }
    return map
  }, [jobs, days])

  const today = new Date()
  const isThisWeek = sameDay(startOfWeek(today), weekStart)

  const rangeLabel = useMemo(() => {
    const s = weekStart.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
    const e = addDays(weekStart, 6).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
    return `${s} – ${e}`
  }, [weekStart])

  return (
    <PageWrapper width="wide">
      <PageHero
        title="Schedule"
        subtitle={loading ? 'Loading…' : `${jobs.length} job${jobs.length === 1 ? '' : 's'} this week`}
        action={<Button leftIcon={Plus} onClick={() => setNewJobOpen(true)}>New Job</Button>}
      />

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week"
          className="min-h-tap min-w-tap flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold">{rangeLabel}</p>
          {!isThisWeek && (
            <button onClick={() => setWeekStart(startOfWeek())} className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">Back to this week</button>
          )}
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week"
          className="min-h-tap min-w-tap flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? null : jobs.length === 0 ? (
        <Card>
          <EmptyState icon={Calendar} title="No jobs this week" description="Nothing on the books for these seven days." />
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map(d => {
            const list = byDay.get(d.toDateString()) || []
            const isToday = sameDay(d, today)
            const dayLabel = d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'short' })
            return (
              <section key={d.toISOString()}>
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className={'text-sm font-semibold ' + (isToday ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300')}>
                    {dayLabel}{isToday && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-brand-500 text-white px-2 py-0.5 rounded-md align-middle">Today</span>}
                  </h2>
                  <span className="text-xs text-gray-400 tabular-nums">{list.length} job{list.length === 1 ? '' : 's'}</span>
                </div>
                {list.length === 0 ? (
                  <div className="h-2" />
                ) : (
                  <div className="space-y-2">
                    {list.map(j => (
                      <Card key={j.id} onClick={() => nav(`/jobs/${j.id}`)}>
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={badgeFor(JOB_TYPES, j.job_type)}>{labelFor(JOB_TYPES, j.job_type)}</Badge>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{j.title}</p>
                            {j.customer?.name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 inline-flex items-center gap-1">
                                <User className="w-3 h-3" />{j.customer.name}
                              </p>
                            )}
                          </div>
                          <Badge variant={badgeFor(JOB_STATUSES, j.status)} dot>{labelFor(JOB_STATUSES, j.status)}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      <NewJobModal open={newJobOpen} onClose={() => setNewJobOpen(false)} onSaved={(row) => { load(); nav(`/jobs/${row.id}`) }} />
    </PageWrapper>
  )
}
