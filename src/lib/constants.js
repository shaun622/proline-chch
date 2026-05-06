export const GST_RATE = 0.15

export const JOB_KINDS = [
  { value: 'repair', label: 'Repair' },
  { value: 'new', label: 'New job' },
]

export const JOB_TYPES = [
  { value: 'maintenance', label: 'General maintenance', badge: 'default', color: 'gray',   icon: 'Wrench' },
  { value: 'glass',       label: 'Glass replacement',   badge: 'primary', color: 'blue',   icon: 'Square' },
  { value: 'hardware',    label: 'Hardware',            badge: 'warning', color: 'amber',  icon: 'Cog' },
  { value: 'glazing',     label: 'Retrofit glazing',    badge: 'success', color: 'emerald', icon: 'Sparkles' },
  { value: 'locks',       label: 'Door & window locks', badge: 'primary', color: 'violet', icon: 'Lock' },
  { value: 'other',       label: 'Other',               badge: 'default', color: 'gray',   icon: 'Package' },
]

export const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
]

export const JOB_STATUSES = [
  { value: 'scheduled',   label: 'Scheduled',   badge: 'default' },
  { value: 'in_progress', label: 'In progress', badge: 'primary' },
  { value: 'completed',   label: 'Completed',   badge: 'success' },
  { value: 'cancelled',   label: 'Cancelled',   badge: 'danger' },
]

export const QUOTE_STATUSES = [
  { value: 'draft',    label: 'Draft',    badge: 'default' },
  { value: 'sent',     label: 'Sent',     badge: 'primary' },
  { value: 'accepted', label: 'Accepted', badge: 'success' },
  { value: 'declined', label: 'Declined', badge: 'danger' },
  { value: 'expired',  label: 'Expired',  badge: 'warning' },
]

export const INVOICE_STATUSES = [
  { value: 'draft',   label: 'Draft',   badge: 'default' },
  { value: 'sent',    label: 'Sent',    badge: 'primary' },
  { value: 'paid',    label: 'Paid',    badge: 'success' },
  { value: 'overdue', label: 'Overdue', badge: 'danger' },
]

export const EXPENSE_TYPES = [
  { value: 'expense', label: 'Expense', badge: 'danger',  color: 'red' },
  { value: 'income',  label: 'Income',  badge: 'success', color: 'emerald' },
]

// Surfaced as <datalist> options in NewExpenseModal so common picks
// are one-click. Free text — the operator can type anything not on
// the list and it'll save fine.
export const EXPENSE_CATEGORY_SUGGESTIONS = [
  'Materials', 'Fuel', 'Vehicle', 'Tools',
  'Subcontractors', 'Phone & internet', 'Insurance',
  'Accounting', 'Bank fees', 'Other',
]
export const INCOME_CATEGORY_SUGGESTIONS = [
  'Job payment', 'Refund', 'Other',
]

export function labelFor(list, value) {
  return list.find(x => x.value === value)?.label ?? value
}

export function badgeFor(list, value) {
  return list.find(x => x.value === value)?.badge ?? 'default'
}
