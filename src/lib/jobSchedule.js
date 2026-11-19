export const JOB_TIME_ZONE = 'Pacific/Auckland'

const dayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: JOB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const offsetFormatter = new Intl.DateTimeFormat('en-NZ', { timeZone: JOB_TIME_ZONE, timeZoneName: 'longOffset' })

export function jobDay(value = new Date()) {
  return dayFormatter.format(new Date(value))
}

export function addCalendarDays(day, count) {
  const date = new Date(day)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

export function jobDayStart(day) {
  // The preceding noon UTC is midnight or 1 am in New Zealand, before
  // the 2 am/3 am clock change on either daylight saving transition day.
  const nearMidnight = new Date(`${addCalendarDays(day, -1)}T12:00:00Z`)
  const offset = offsetFormatter.formatToParts(nearMidnight)
    .find(part => part.type === 'timeZoneName').value.replace('GMT', '')
  return new Date(`${day}T00:00:00${offset}`).toISOString()
}

export function formatCalendarDay(day, options) {
  return new Date(day).toLocaleDateString('en-NZ', { ...options, timeZone: 'UTC' })
}

export function formatJobTime(time) {
  if (!time) return ''
  const [hour, minute] = time.split(':').map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`
}

export function formatJobSchedule(job) {
  if (!job.scheduled_date) return 'Not scheduled'
  const date = formatCalendarDay(jobDay(job.scheduled_date), { day: 'numeric', month: 'short', year: 'numeric' })
  return job.scheduled_time ? `${date} · ${formatJobTime(job.scheduled_time)}` : date
}

export function compareScheduledJobs(a, b) {
  return (a.schedule_order ?? Number.MAX_SAFE_INTEGER) - (b.schedule_order ?? Number.MAX_SAFE_INTEGER)
    || (a.scheduled_time?.slice(0, 5) || '25:00').localeCompare(b.scheduled_time?.slice(0, 5) || '25:00')
    || new Date(a.created_at) - new Date(b.created_at)
    || a.id.localeCompare(b.id)
}
