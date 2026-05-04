import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Edit3, Receipt, MapPin, Phone, Mail, User, Clock } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import NewInvoiceModal from './NewInvoiceModal'
import { supabase } from '../../lib/supabase'
import { badgeFor, labelFor, JOB_STATUSES, JOB_TYPES } from '../../lib/constants'

/**
 * Quick-action modal for a Schedule job click.
 *
 * Shows the customer's basic contact info + 3 actions:
 *   - Complete Job   → flips status to 'completed' + sets completed_date
 *   - Edit Job       → routes to /jobs/:id (full edit surface)
 *   - Send Invoice   → opens NewInvoiceModal pre-filled with this
 *                      customer + job, so the operator can adjust line
 *                      items and send without leaving the schedule.
 *
 * Replaces the old "click → /jobs/:id" navigation pattern. Keeps the
 * Schedule view as a per-occurrence quick-action surface; the full
 * job page is one click further behind "Edit".
 */
export default function JobQuickModal({ open, onClose, job, onUpdated }) {
  const nav = useNavigate()
  const [completing, setCompleting] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  if (!job) return null

  const customer = job.customer || {}
  const isCompleted = job.status === 'completed'
  const isCancelled = job.status === 'cancelled'

  async function handleComplete() {
    setCompleting(true)
    try {
      const { error } = await supabase.from('jobs').update({
        status: 'completed',
        completed_date: new Date().toISOString(),
      }).eq('id', job.id)
      if (error) throw error
      onUpdated?.()
      onClose?.()
    } finally {
      setCompleting(false)
    }
  }

  function handleEdit() {
    onClose?.()
    nav(`/jobs/${job.id}`)
  }

  return (
    <>
      <Modal open={open && !invoiceOpen} onClose={onClose} title={job.title || 'Job'} size="md">
        <div className="space-y-4">
          {/* Status + job type chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={badgeFor(JOB_STATUSES, job.status)}>
              {labelFor(JOB_STATUSES, job.status)}
            </Badge>
            {job.job_type && (
              <Badge variant={badgeFor(JOB_TYPES, job.job_type)}>
                {labelFor(JOB_TYPES, job.job_type)}
              </Badge>
            )}
          </div>

          {/* Customer block */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            <Row icon={<User className="w-4 h-4" />} label="Customer" value={customer.name || '—'} />
            {(customer.address || customer.suburb) && (
              <Row
                icon={<MapPin className="w-4 h-4" />}
                label="Address"
                value={[customer.address, customer.suburb].filter(Boolean).join(', ')}
              />
            )}
            {customer.phone && (
              <Row
                icon={<Phone className="w-4 h-4" />}
                label="Phone"
                value={
                  <a href={`tel:${customer.phone}`} className="text-brand-600 dark:text-brand-400 hover:underline">
                    {customer.phone}
                  </a>
                }
              />
            )}
            {customer.email && (
              <Row
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={
                  <a href={`mailto:${customer.email}`} className="text-brand-600 dark:text-brand-400 hover:underline break-all">
                    {customer.email}
                  </a>
                }
              />
            )}
            {job.scheduled_date && (
              <Row
                icon={<Clock className="w-4 h-4" />}
                label="Scheduled"
                value={new Date(job.scheduled_date).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              />
            )}
          </div>

          {/* Notes (only if present — keeps the modal short for the common case) */}
          {job.notes && (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {job.notes}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            {!isCompleted && !isCancelled && (
              <Button
                variant="primary"
                onClick={handleComplete}
                loading={completing}
                leftIcon={CheckCircle2}
                className="w-full"
              >
                Complete Job
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={handleEdit} leftIcon={Edit3}>
                Edit Job
              </Button>
              <Button variant="secondary" onClick={() => setInvoiceOpen(true)} leftIcon={Receipt}>
                Send Invoice
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* NewInvoiceModal already supports prefill — passing customer_id +
          job_id pre-populates the form so the operator just adds line
          items and saves. The modal sits at zLayer 60 so it stacks
          over this quick modal cleanly. */}
      <NewInvoiceModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        prefill={{ customer_id: job.customer_id, job_id: job.id, title: job.title || '' }}
        onSaved={(row) => {
          setInvoiceOpen(false)
          onClose?.()
          if (row?.id) nav(`/invoices/${row.id}`)
        }}
        zLayer={60}
      />
    </>
  )
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <div className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 break-words">{value || '—'}</div>
      </div>
    </div>
  )
}
