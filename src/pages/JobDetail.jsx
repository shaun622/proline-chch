import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { User, Calendar, MapPin, Wrench, Pencil, Trash2, FileText, Receipt, CircleCheckBig } from 'lucide-react'
import Header from '../components/layout/Header'
import PageWrapper from '../components/layout/PageWrapper'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import DetailRow from '../components/ui/DetailRow'
import ConfirmModal from '../components/ui/ConfirmModal'
import JobPhotos from '../components/ui/JobPhotos'
import NewJobModal from '../components/modals/NewJobModal'
import { Select } from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { badgeFor, JOB_KINDS, JOB_STATUSES, JOB_TYPES, labelFor } from '../lib/constants'
import { formatDate } from '../lib/utils'

export default function JobDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jobs')
      .select('*, customer:customer_id(id,name,phone,email,address,suburb,property_type)')
      .eq('id', id)
      .maybeSingle()
    setJob(data || null)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error
    nav('/jobs', { replace: true })
  }

  async function updateStatus(status) {
    setSavingStatus(true)
    const patch = { status }
    if (status === 'completed' && !job.completed_date) patch.completed_date = new Date().toISOString()
    const { data } = await supabase.from('jobs').update(patch).eq('id', id).select('*, customer:customer_id(id,name,phone,email,address,suburb,property_type)').single()
    setJob(data)
    setSavingStatus(false)
  }

  if (loading) return null
  if (!job) {
    return (
      <>
        <Header title="Job" backTo="/jobs" />
        <PageWrapper><Card><EmptyState title="Job not found" description="It may have been deleted." /></Card></PageWrapper>
      </>
    )
  }

  const siteAddress = job.address || [job.customer?.address, job.customer?.suburb].filter(Boolean).join(', ')

  return (
    <>
      <Header
        title={job.title}
        subtitle={labelFor(JOB_TYPES, job.job_type)}
        backTo="/jobs"
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
                <Badge variant={badgeFor(JOB_TYPES, job.job_type)}>{labelFor(JOB_TYPES, job.job_type)}</Badge>
                <Badge variant={job.job_kind === 'new' ? 'primary' : 'default'}>{labelFor(JOB_KINDS, job.job_kind)}</Badge>
                <Badge variant={badgeFor(JOB_STATUSES, job.status)} dot>{labelFor(JOB_STATUSES, job.status)}</Badge>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 break-words">{job.title}</h1>
            </div>
          </div>

          <Card className="!p-0 divide-y divide-gray-100 dark:divide-gray-800">
            <DetailRow icon={User} color="brand" label="Customer" value={job.customer?.name}
              action={<button className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline" onClick={() => nav(`/customers/${job.customer?.id}`)}>View</button>}
            />
            <DetailRow icon={Calendar} color="emerald" label="Scheduled" value={job.scheduled_date ? formatDate(job.scheduled_date) : 'Not scheduled'} />
            <DetailRow icon={MapPin} color="amber" label="Site address" value={siteAddress || '—'} />
            {job.completed_date && (
              <DetailRow icon={CircleCheckBig} color="emerald" label="Completed" value={formatDate(job.completed_date)} />
            )}
          </Card>

          <div className="card space-y-3">
            <p className="section-title">Status</p>
            <Select
              value={job.status}
              onChange={e => updateStatus(e.target.value)}
              disabled={savingStatus}
              options={JOB_STATUSES}
            />
          </div>

          {job.description && (
            <div className="space-y-2">
              <h2 className="section-title">Description</h2>
              <Card><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.description}</p></Card>
            </div>
          )}

          {job.notes && (
            <div className="space-y-2">
              <h2 className="section-title">Internal notes</h2>
              <Card><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.notes}</p></Card>
            </div>
          )}

          <section className="space-y-2">
            <h2 className="section-title">Photos</h2>
            <JobPhotos jobId={job.id} />
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => nav(`/quotes?job=${job.id}`)} className="card-interactive flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="font-medium text-sm">Create quote</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">for this job</p>
              </div>
            </button>
            <button onClick={() => nav(`/invoices?job=${job.id}`)} className="card-interactive flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center"><Receipt className="w-5 h-5" /></div>
              <div>
                <p className="font-medium text-sm">Create invoice</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">for this job</p>
              </div>
            </button>
          </div>
        </div>
      </PageWrapper>

      <NewJobModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={job}
        onSaved={() => load()}
      />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        destructive
        title="Delete this job?"
        description="All photos for this job will also be removed. This cannot be undone."
        confirmLabel="Delete"
      />
    </>
  )
}
