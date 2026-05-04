import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Plus, User, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import NewJobModal from '../components/modals/NewJobModal'
import JobQuickModal from '../components/modals/JobQuickModal'
import { supabase } from '../lib/supabase'
import { badgeFor, JOB_STATUSES, JOB_TYPES, labelFor } from '../lib/constants'
import { cn } from '../lib/utils'

// Up to this many stops render inline per day column. Past that, the
// remainder collapse behind a "+N more" link that flips the bottom
// section to that day. Keeps the week-grid row a manageable height
// no matter how busy a single day gets.
const MAX_VISIBLE_STOPS_PER_DAY = 8

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

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Schedule() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek())
  // Mobile single-day view index (0 = Mon, 6 = Sun).
  const [dayIdx, setDayIdx] = useState(() => {
    const today = new Date()
    const idx = Math.round((today - startOfWeek()) / (1000 * 60 * 60 * 24))
    return idx >= 0 && idx < 7 ? idx : 0
  })
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newJobOpen, setNewJobOpen] = useState(false)
  // Job whose quick-action modal is open. null when no modal is showing.
  const [openJob, setOpenJob] = useState(null)
  // The desktop week grid caps each day at MAX_VISIBLE_STOPS_PER_DAY rows.
  // Clicking the day header (or "+N more") flips the bottom "Today"
  // section into a "selected day" section showing every stop that day,
  // no cap. null = bottom section shows real today.
  const [focusedDay, setFocusedDay] = useState(null)

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jobs')
      .select('*, customer:customer_id(id,name,address,suburb,phone,email,property_type)')
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
    for (const d of days) map.set(ymd(d), [])
    for (const j of jobs) {
      const d = new Date(j.scheduled_date)
      const key = ymd(d)
      if (map.has(key)) map.get(key).push(j)
    }
    return map
  }, [jobs, days])

  const today = new Date()
  const todayMid = useMemo(() => { const t = new Date(today); t.setHours(0,0,0,0); return t }, [today])
  const isThisWeek = sameDay(startOfWeek(today), weekStart)

  // Day-step (mobile single-day view): when stepping past the ends of
  // the current week, jump to the adjacent week so the user can keep
  // swiping forward / back without manually changing weeks.
  const stepDay = (delta) => {
    const next = dayIdx + delta
    if (next < 0) { setWeekStart(addDays(weekStart, -7)); setDayIdx(6) }
    else if (next > 6) { setWeekStart(addDays(weekStart, 7)); setDayIdx(0) }
    else { setDayIdx(next) }
  }

  const headerLabel = useMemo(() => {
    const s = weekStart.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
    const e = addDays(weekStart, 6).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    return `${s} — ${e}`
  }, [weekStart])

  const focusedDay_mobile = days[dayIdx]
  const focusedJobs_mobile = byDay.get(ymd(focusedDay_mobile)) || []

  // Bottom-section "selected day". Defaults to today when in this week,
  // else the start of the visible week (so it always has a coherent
  // anchor regardless of week navigation).
  const selectedDay = focusedDay || (isThisWeek ? today : weekStart)
  const selectedDayJobs = byDay.get(ymd(selectedDay)) || []
  const isFocusedReal = focusedDay && !sameDay(focusedDay, today)
  const selectedDayHeading = isFocusedReal
    ? selectedDay.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'short' })
    : 'Today'

  // Scroll the bottom section into view when the operator clicks a
  // day header — on a tall page they might not notice it updating
  // below the fold otherwise.
  function focusDay(day) {
    setFocusedDay(day)
    requestAnimationFrame(() => {
      document.getElementById('schedule-day-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <PageWrapper width="wide">
      <PageHero
        title="Schedule"
        subtitle={loading ? 'Loading…' : `${jobs.length} job${jobs.length === 1 ? '' : 's'} this week`}
        action={<Button leftIcon={Plus} onClick={() => setNewJobOpen(true)}>New Job</Button>}
      />

      {/* Mobile: single-day view with day-step arrows. */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        <button onClick={() => stepDay(-1)} aria-label="Previous day"
          className="min-h-tap min-w-tap flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <p className={'text-sm font-semibold ' + (sameDay(focusedDay_mobile, today) ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300')}>
            {sameDay(focusedDay_mobile, today)
              ? 'Today'
              : focusedDay_mobile.toLocaleDateString('en-NZ', { weekday: 'long' })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {focusedDay_mobile.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {!sameDay(focusedDay_mobile, today) && (
            <button onClick={() => { setWeekStart(startOfWeek()); setDayIdx(Math.round((today - startOfWeek()) / (1000 * 60 * 60 * 24))) }}
              className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline">
              Jump to today
            </button>
          )}
        </div>
        <button onClick={() => stepDay(1)} aria-label="Next day"
          className="min-h-tap min-w-tap flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop: week range + Prev / This week / Next nav. Matches the
          PoolPro Schedule layout the operator referenced. */}
      <div className="hidden md:flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400 inline-flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5" strokeWidth={2.5} />
            Week view
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{headerLabel}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button onClick={() => setWeekStart(startOfWeek())} disabled={isThisWeek}
            className={cn(
              'h-9 px-3 rounded-full border text-sm font-medium transition-colors',
              isThisWeek
                ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-200/70 dark:border-brand-800/40 text-brand-700 dark:text-brand-300'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}>
            This week
          </button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? null : (
        <>
          {/* Mobile: render only the focused day. */}
          <div className="md:hidden">
            {focusedJobs_mobile.length === 0 ? (
              <Card>
                <EmptyState icon={Calendar} title="No jobs this day" description="Nothing scheduled. Tap an arrow to step to the next day." />
              </Card>
            ) : (
              <div className="space-y-2">
                {focusedJobs_mobile.map(j => <JobCard key={j.id} j={j} onClick={() => setOpenJob(j)} />)}
              </div>
            )}
          </div>

          {/* Desktop: 7-column week grid. */}
          <div className="hidden md:block">
            <WeekGrid
              days={days}
              byDay={byDay}
              today={todayMid}
              onJobClick={(j) => setOpenJob(j)}
              onFocusDay={focusDay}
            />
          </div>

          {/* Selected-day section (desktop only). Mobile already lists
              the focused day inline above so this is desktop-only. */}
          <div className="hidden md:block mt-4" id="schedule-day-section">
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 inline-flex items-center gap-2">
                  <CalendarClock className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {selectedDayHeading}
                </p>
                <div className="flex items-center gap-2">
                  {isFocusedReal && (
                    <button
                      type="button"
                      onClick={() => setFocusedDay(null)}
                      className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Back to today
                    </button>
                  )}
                  <span className="inline-flex items-center justify-center min-w-[24px] px-2 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                    {selectedDayJobs.length}
                  </span>
                </div>
              </div>
              {selectedDayJobs.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isFocusedReal
                      ? `Nothing scheduled for ${selectedDay.toLocaleDateString('en-NZ', { weekday: 'long' })}.`
                      : 'Nothing scheduled.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedDayJobs.map(j => (
                    <li key={j.id}>
                      <button
                        onClick={() => setOpenJob(j)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant={badgeFor(JOB_TYPES, j.job_type)}>{labelFor(JOB_TYPES, j.job_type)}</Badge>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {j.customer?.name ? `${j.customer.name} · ${j.title}` : j.title}
                            </p>
                            {j.customer?.address && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {[j.customer.address, j.customer.suburb].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                          <Badge variant={badgeFor(JOB_STATUSES, j.status)} dot>{labelFor(JOB_STATUSES, j.status)}</Badge>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      <NewJobModal open={newJobOpen} onClose={() => setNewJobOpen(false)} onSaved={(row) => { load(); setOpenJob(row) }} />
      <JobQuickModal
        open={!!openJob}
        job={openJob}
        onClose={() => setOpenJob(null)}
        onUpdated={() => { load(); setOpenJob(null) }}
      />
    </PageWrapper>
  )
}

// ─── Week grid (7 day columns) ─────────────────
function WeekGrid({ days, byDay, today, onJobClick, onFocusDay }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-800">
        {days.map(day => {
          const list = byDay.get(ymd(day)) || []
          const isToday = sameDay(day, today)
          return (
            <DayColumn
              key={ymd(day)}
              day={day}
              jobs={list}
              isToday={isToday}
              onJobClick={onJobClick}
              onFocusDay={onFocusDay}
            />
          )
        })}
      </div>
    </div>
  )
}

function DayColumn({ day, jobs, isToday, onJobClick, onFocusDay }) {
  const dow = day.toLocaleDateString('en-NZ', { weekday: 'short' }).toUpperCase()
  const visible = jobs.slice(0, MAX_VISIBLE_STOPS_PER_DAY)
  const hiddenCount = Math.max(0, jobs.length - visible.length)
  const count = jobs.length
  return (
    <div className="min-h-[220px] flex flex-col">
      {count > 0 ? (
        <button
          type="button"
          onClick={() => onFocusDay?.(day)}
          className={cn(
            'text-left px-3 py-2 border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
            isToday && 'bg-brand-50/60 dark:bg-brand-950/20',
          )}
          aria-label={`Open all ${count} jobs for ${day.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'text-[10px] font-semibold uppercase tracking-wider',
              isToday ? 'text-brand-700 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500',
            )}>{dow}</p>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold tabular-nums text-gray-600 dark:text-gray-400">
              {count}
            </span>
          </div>
          <p className={cn(
            'text-2xl font-bold leading-none mt-0.5',
            isToday ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100',
          )}>
            {day.getDate()}
          </p>
        </button>
      ) : (
        <div className={cn(
          'px-3 py-2 border-b border-gray-100 dark:border-gray-800',
          isToday && 'bg-brand-50/60 dark:bg-brand-950/20',
        )}>
          <p className={cn(
            'text-[10px] font-semibold uppercase tracking-wider',
            isToday ? 'text-brand-700 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500',
          )}>{dow}</p>
          <p className={cn(
            'text-2xl font-bold leading-none mt-0.5',
            isToday ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-gray-100',
          )}>
            {day.getDate()}
          </p>
        </div>
      )}
      <div className="p-1.5 space-y-1 flex-1">
        {visible.length === 0 ? (
          <p className="text-center text-gray-300 dark:text-gray-700 text-sm py-6 select-none">—</p>
        ) : (
          <>
            {visible.map(j => <InlineJobCard key={j.id} j={j} onClick={() => onJobClick(j)} />)}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => onFocusDay?.(day)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
              >
                +{hiddenCount} more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Compact card for the week-grid columns.
function InlineJobCard({ j, onClick }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left bg-brand-50/70 dark:bg-brand-950/30 border-l-[3px] border-brand-500 rounded-md px-2 py-1.5 hover:bg-brand-100/70 dark:hover:bg-brand-950/50 transition-colors"
    >
      <div className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
        {j.customer?.name ? `${j.customer.name} · ${j.title}` : j.title}
      </div>
      {j.customer?.address && (
        <div className="text-[9.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {[j.customer.address, j.customer.suburb].filter(Boolean).join(', ')}
        </div>
      )}
    </button>
  )
}

// ─── Mobile: single-day card list (unchanged shape from before) ──
function JobCard({ j, onClick }) {
  return (
    <Card onClick={onClick}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={badgeFor(JOB_TYPES, j.job_type)}>{labelFor(JOB_TYPES, j.job_type)}</Badge>
          </div>
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {j.customer?.name ? `${j.customer.name} · ${j.title}` : j.title}
          </p>
          {j.customer?.address && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 inline-flex items-center gap-1">
              <User className="w-3 h-3" />{j.customer.name}
            </p>
          )}
        </div>
        <Badge variant={badgeFor(JOB_STATUSES, j.status)} dot>{labelFor(JOB_STATUSES, j.status)}</Badge>
      </div>
    </Card>
  )
}
