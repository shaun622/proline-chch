import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Search, Phone, Mail, MapPin } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FilterChips from '../components/ui/FilterChips'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import IconBox from '../components/ui/IconBox'
import NewCustomerModal from '../components/modals/NewCustomerModal'
import { supabase } from '../lib/supabase'
import { labelFor, PROPERTY_TYPES } from '../lib/constants'
import { initials } from '../lib/utils'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const nav = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return customers.filter(c => {
      if (filter !== 'all' && c.property_type !== filter) return false
      if (!term) return true
      return [c.name, c.email, c.phone, c.suburb, c.address].some(v => v?.toLowerCase().includes(term))
    })
  }, [customers, filter, q])

  const counts = useMemo(() => ({
    all: customers.length,
    residential: customers.filter(c => c.property_type === 'residential').length,
    commercial: customers.filter(c => c.property_type === 'commercial').length,
  }), [customers])

  return (
    <PageWrapper width="wide">
      <PageHero
        title="Customers"
        subtitle={loading ? 'Loading…' : `${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`}
        action={<Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Customer</Button>}
      />

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, phone, email, address…"
          className="input pl-10"
        />
      </div>

      <FilterChips
        className="mb-4"
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'residential', label: 'Residential', count: counts.residential },
          { value: 'commercial', label: 'Commercial', count: counts.commercial },
        ]}
        value={filter}
        onChange={setFilter}
        ariaLabel="Property type"
      />

      {loading ? null : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={customers.length === 0 ? 'No customers yet' : 'No matches'}
            description={customers.length === 0 ? 'Add your first customer to start tracking jobs.' : 'Try a different search or filter.'}
            action={customers.length === 0 && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>Add Customer</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map(c => (
            <Card key={c.id} onClick={() => nav(`/customers/${c.id}`)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0 font-semibold text-sm">
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.suburb && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{c.suburb}</span>}
                    {!c.phone && !c.suburb && c.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge variant={c.property_type === 'commercial' ? 'primary' : 'default'}>
                    {labelFor(PROPERTY_TYPES, c.property_type)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewCustomerModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={(row) => { load(); nav(`/customers/${row.id}`) }}
      />
    </PageWrapper>
  )
}
