import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowDownUp, ArrowUp, Calendar, CalendarClock, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import NewJobModal from '../components/modals/NewJobModal'
import JobQuickModal from '../components/modals/JobQuickModal'
import { supabase } from '../lib/supabase'
import { badgeFor, JOB_STATUSES, JOB_TYPES, labelFor } from '../lib/constants'
import { addCalendarDays, compareScheduledJobs, formatCalendarDay, formatJobTime, jobDay, jobDayStart } from '../lib/jobSchedule'
import { cn } from '../lib/utils'

const MAX_VISIBLE_STOPS = 8
const JOB_SELECT = '*, customer:customer_id(id,name,address,suburb,phone,email,property_type)'
const pagerClass = 'inline-flex items-center justify-center gap-1 min-h-tap px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50'
const dayLabel = day => formatCalendarDay(day, { weekday: 'long', day: 'numeric', month: 'short' })
const dayIndex = day => (new Date(day).getUTCDay() + 6) % 7
const startOfWeek = day => addCalendarDays(day, -dayIndex(day))
const jobTitle = job => job.customer?.name ? `${job.customer.name} · ${job.title}` : job.title
const jobAddress = job => job.address || [job.customer?.address, job.customer?.suburb].filter(Boolean).join(', ')
const timeLabel = job => formatJobTime(job.scheduled_time) || 'No time set'

export default function Schedule() {
  const today = jobDay()
  const [week, setWeek] = useState(() => startOfWeek(today))
  const [mobileIndex, setMobileIndex] = useState(() => dayIndex(today))
  const [focusedDay, setFocusedDay] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [newJobDay, setNewJobDay] = useState(null)
  const [openJob, setOpenJob] = useState(null)
  const [timeJob, setTimeJob] = useState(null)
  const [reorder, setReorder] = useState(null)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addCalendarDays(week, i)), [week])
  const thisWeek = week === startOfWeek(today)
  const selectedDay = focusedDay || (thisWeek ? today : week)
  const mobileDay = days[mobileIndex]

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    void (async () => {
      const { data, error } = await supabase.from('jobs').select(JOB_SELECT)
        .gte('scheduled_date', jobDayStart(week))
        .lt('scheduled_date', jobDayStart(addCalendarDays(week, 7)))
      if (!active) return
      setJobs(data || [])
      setLoadError(error ? 'Could not load the schedule.' : '')
      setLoading(false)
    })()
    return () => { active = false }
  }, [week, reload])

  const byDay = useMemo(() => {
    const map = new Map(days.map(day => [day, []]))
    for (const job of jobs) map.get(jobDay(job.scheduled_date))?.push(job)
    for (const list of map.values()) list.sort(compareScheduledJobs)
    return map
  }, [days, jobs])

  function refresh() {
    setReload(value => value + 1)
  }

  function changeWeek(day) {
    setWeek(day)
    setFocusedDay(null)
  }

  function stepDay(delta) {
    const index = mobileIndex + delta
    if (index < 0 || index > 6) changeWeek(addCalendarDays(week, delta * 7))
    setMobileIndex((index + 7) % 7)
  }

  function focusDay(day) {
    setFocusedDay(day)
    requestAnimationFrame(() => document.getElementById('schedule-day-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function dayJobs(day) {
    const list = byDay.get(day)
    return <DayJobs day={day} today={today} jobs={list} onOpen={setOpenJob} onSetTime={setTimeJob}
      onReorder={() => setReorder({ day, jobs: list })} />
  }

  return (
    <PageWrapper width="wide">
      <PageHero title="Schedule"
        subtitle={loading ? 'Loading…' : loadError ? 'Schedule unavailable' : `${jobs.length} job${jobs.length === 1 ? '' : 's'} this week`}
        action={<>
          <Button leftIcon={Plus} className="hidden md:inline-flex" onClick={() => setNewJobDay(selectedDay)}>New Job</Button>
          <Button leftIcon={Plus} className="md:hidden" onClick={() => setNewJobDay(mobileDay)}>New Job</Button>
        </>} />

      <div className="md:hidden flex items-center gap-2 mb-4">
        <button type="button" onClick={() => stepDay(-1)} aria-label="Previous day" className={pagerClass}><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold">{mobileDay === today ? 'Today' : formatCalendarDay(mobileDay, { weekday: 'long' })}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatCalendarDay(mobileDay, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          {mobileDay !== today && (
            <button type="button" onClick={() => { changeWeek(startOfWeek(today)); setMobileIndex(dayIndex(today)) }}
              className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">Jump to today</button>
          )}
        </div>
        <button type="button" onClick={() => stepDay(1)} aria-label="Next day" className={pagerClass}><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="hidden md:flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400 inline-flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5" /> Week view
          </p>
          <h2 className="text-2xl font-bold mt-1">
            {formatCalendarDay(week, { weekday: 'short', day: 'numeric', month: 'short' })} — {formatCalendarDay(days[6], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => changeWeek(addCalendarDays(week, -7))} className={pagerClass}><ChevronLeft className="w-4 h-4" /> Prev</button>
          <button type="button" onClick={() => changeWeek(startOfWeek(today))} disabled={thisWeek} className={pagerClass}>This week</button>
          <button type="button" onClick={() => changeWeek(addCalendarDays(week, 7))} className={pagerClass}>Next <ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {loadError ? (
        <Card className="flex items-center justify-between gap-3">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          <Button size="sm" variant="secondary" onClick={refresh}>Retry</Button>
        </Card>
      ) : !loading && (
        <>
          <div className="md:hidden">{dayJobs(mobileDay)}</div>
          <div className="hidden md:block">
            <WeekGrid days={days} byDay={byDay} today={today} selectedDay={selectedDay} onFocusDay={focusDay} onJobClick={setOpenJob} />
            <div className="mt-4 scroll-mt-32" id="schedule-day-section">{dayJobs(selectedDay)}</div>
          </div>
        </>
      )}

      <NewJobModal open={!!newJobDay} prefill={{ scheduled_date: newJobDay }} onClose={() => setNewJobDay(null)}
        onSaved={job => { refresh(); setOpenJob(job) }} />
      <JobQuickModal open={!!openJob} job={openJob} onClose={() => setOpenJob(null)}
        onUpdated={() => { refresh(); setOpenJob(null) }} />
      {timeJob && <JobTimeModal job={timeJob} onClose={() => setTimeJob(null)} onSaved={updated => {
        setJobs(current => current.map(job => job.id === updated.id ? updated : job))
        setTimeJob(null)
      }} />}
      {reorder && <ReorderModal day={reorder.day} jobs={reorder.jobs} onClose={() => setReorder(null)}
        onSaved={() => { setReorder(null); refresh() }} onStale={refresh} />}
    </PageWrapper>
  )
}

function WeekGrid({ days, byDay, today, selectedDay, onJobClick, onFocusDay }) {
  return (
    <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-gray-100 dark:border-gray-800 overflow-hidden">
      {days.map(day => {
        const jobs = byDay.get(day)
        const hidden = jobs.length - MAX_VISIBLE_STOPS
        return (
          <div key={day} className="min-w-0 min-h-[220px]">
            <button type="button" onClick={() => onFocusDay(day)} aria-label={`Show jobs for ${dayLabel(day)}`}
              aria-pressed={day === selectedDay}
              className={cn('w-full text-left px-3 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                day === selectedDay && 'bg-brand-50 dark:bg-brand-950/30 ring-1 ring-inset ring-brand-200 dark:ring-brand-800')}>
              <div className="flex items-center justify-between gap-1">
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider', day === today ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400')}>
                  {formatCalendarDay(day, { weekday: 'short' })}
                </span>
                {jobs.length > 0 && <span className="text-[10px] font-bold tabular-nums rounded-full bg-gray-100 dark:bg-gray-800 px-1.5">{jobs.length}</span>}
              </div>
              <span className={cn('text-2xl font-bold', day === today && 'text-brand-700 dark:text-brand-300')}>{new Date(day).getUTCDate()}</span>
            </button>
            <div className="p-1.5 space-y-1">
              {jobs.slice(0, MAX_VISIBLE_STOPS).map(job => (
                <button key={job.id} type="button" onClick={() => onJobClick(job)}
                  className={cn('block w-full text-left rounded-md border-l-[3px] border-brand-500 bg-brand-50/70 dark:bg-brand-950/30 px-2 py-1.5 hover:bg-brand-100 dark:hover:bg-brand-950/50',
                    job.status === 'completed' && 'opacity-60')}>
                  {job.scheduled_time && <p className="text-[10px] font-bold text-brand-700 dark:text-brand-300">{timeLabel(job)}</p>}
                  <p className={cn('text-[11px] font-semibold truncate', job.status === 'completed' && 'line-through')}>{jobTitle(job)}</p>
                  {jobAddress(job) && <p className="text-[10px] truncate text-gray-500 dark:text-gray-400">{jobAddress(job)}</p>}
                  {job.notes?.trim() && <p className="text-[10px] mt-0.5 leading-snug line-clamp-2 text-gray-700 dark:text-gray-300">{job.notes}</p>}
                </button>
              ))}
              {jobs.length === 0 && <p className="text-center text-sm py-6 text-gray-300 dark:text-gray-700">—</p>}
              {hidden > 0 && <button type="button" onClick={() => onFocusDay(day)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/40">+{hidden} more</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayJobs({ day, today, jobs, onOpen, onSetTime, onReorder }) {
  const manual = jobs.some(job => job.schedule_order != null)
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{day === today ? "Today's jobs" : dayLabel(day)}</h2>
          {jobs.length > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} · {manual ? 'Manual order' : 'Time order'}</p>}
        </div>
        {(jobs.length > 1 || manual) && <Button size="sm" variant="secondary" leftIcon={ArrowDownUp} onClick={onReorder}>Reorder</Button>}
      </div>
      {jobs.length === 0 ? <EmptyState icon={Calendar} title="No jobs this day" description="Choose another day or add a job." /> : (
        <ol className="divide-y divide-gray-100 dark:divide-gray-800">
          {jobs.map((job, index) => (
            <li key={job.id} className="flex flex-wrap items-start gap-x-3 gap-y-0 px-4 py-3">
              <span className="mt-1 rounded-full flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-300" aria-hidden="true">{index + 1}</span>
              <button type="button" onClick={() => onOpen(job)} className="min-w-0 flex-1 text-left rounded-md hover:text-brand-700 dark:hover:text-brand-300">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className={cn('font-semibold break-words', job.status === 'completed' && 'line-through')}>{jobTitle(job)}</p>
                  <Badge variant={badgeFor(JOB_TYPES, job.job_type)}>{labelFor(JOB_TYPES, job.job_type)}</Badge>
                </div>
                {jobAddress(job) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{jobAddress(job)}</p>}
                {job.notes?.trim() && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">{job.notes}</p>}
              </button>
              <div className="flex flex-col items-end shrink-0 gap-1">
                <Button size="sm" variant="secondary" leftIcon={Clock} onClick={() => onSetTime(job)}
                  aria-label={`${job.scheduled_time ? 'Change' : 'Set'} start time for ${job.title}`}>
                  {job.scheduled_time ? timeLabel(job) : 'Set time'}
                </Button>
                <Badge variant={badgeFor(JOB_STATUSES, job.status)} dot>{labelFor(JOB_STATUSES, job.status)}</Badge>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function JobTimeModal({ job, onClose, onSaved }) {
  const initial = job.scheduled_time?.slice(0, 5) || ''
  const [time, setTime] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data, error } = await supabase.from('jobs').update({ scheduled_time: time || null })
        .eq('id', job.id).eq('scheduled_date', job.scheduled_date).select(JOB_SELECT).maybeSingle()
      if (error) throw error
      if (!data) throw new Error('This job has moved. Refresh the schedule and try again.')
      onSaved(data)
    } catch (err) {
      setError(err.message || 'Could not save the start time.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={saving ? undefined : onClose} title="Set start time" subtitle={job.title} size="sm">
      <form onSubmit={save} className="space-y-4">
        <Input type="time" label="Start time" aria-label="Start time" hint="Christchurch time. Leave blank for a flexible visit."
          value={time} onChange={event => setTime(event.target.value)} disabled={saving} autoFocus />
        {initial && time && <button type="button" className="text-sm font-semibold text-brand-700 dark:text-brand-300 hover:underline"
          onClick={() => setTime('')} disabled={saving}>Clear time</button>}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={time === initial}>Save time</Button>
        </div>
      </form>
    </Modal>
  )
}

function ReorderModal({ day, jobs, onClose, onSaved, onStale }) {
  const [order, setOrder] = useState(jobs)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stale, setStale] = useState(false)
  const manual = jobs.some(job => job.schedule_order != null)
  const changed = order.some((job, index) => job.id !== jobs[index].id)

  function move(index, delta) {
    setOrder(current => {
      const next = [...current]
      const target = index + delta
      next[index] = current[target]
      next[target] = current[index]
      return next
    })
  }

  async function save(useTimeOrder) {
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase.rpc('save_job_schedule_order', {
        p_day: day,
        p_job_ids: order.map(job => job.id),
        p_use_time_order: useTimeOrder,
      })
      if (error) {
        if (error.code === 'P0001') {
          setStale(true)
          onStale()
          throw new Error('The jobs for this day have changed. Close and reopen Reorder to try again.')
        }
        throw error
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Could not save the job order.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={saving ? undefined : onClose} title="Reorder jobs" subtitle={dayLabel(day)}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Use the arrows to set your run order. Each job keeps its start time.</p>
      <ol className="divide-y divide-gray-100 dark:divide-gray-800">
        {order.map((job, index) => (
          <li key={job.id} className="flex items-center gap-2 py-2">
            <span className="w-6 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 tabular-nums">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold break-words">{jobTitle(job)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{timeLabel(job)}</p>
            </div>
            <button type="button" aria-label={`Move ${job.title} up`} disabled={index === 0 || saving || stale}
              onClick={() => move(index, -1)} className={pagerClass}><ArrowUp className="w-4 h-4" /></button>
            <button type="button" aria-label={`Move ${job.title} down`} disabled={index === order.length - 1 || saving || stale}
              onClick={() => move(index, 1)} className={pagerClass}><ArrowDown className="w-4 h-4" /></button>
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
        {manual && <Button variant="ghost" className="mr-auto" onClick={() => save(true)} disabled={saving || stale}>Use time order</Button>}
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={() => save(false)} loading={saving} disabled={!changed || stale}>Save order</Button>
      </div>
    </Modal>
  )
}
