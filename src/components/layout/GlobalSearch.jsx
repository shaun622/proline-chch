import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Wrench, FileText, Receipt, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

/**
 * Global search across customers, jobs, quotes, invoices.
 * ⌘K / Ctrl+K to focus. 250ms debounced parallel queries, max 5 per group.
 */
export default function GlobalSearch({ className }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ customers: [], jobs: [], quotes: [], invoices: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // ⌘K / Ctrl+K to focus
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Outside click closes dropdown
  useEffect(() => {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const runSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults({ customers: [], jobs: [], quotes: [], invoices: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    const term = `%${q}%`
    try {
      const [customers, jobs, quotes, invoices] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, email, phone, address, suburb, property_type')
          .or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},address.ilike.${term},suburb.ilike.${term}`)
          .limit(5),
        supabase
          .from('jobs')
          .select('id, title, status, scheduled_date, job_type, customer:customer_id(id,name)')
          .or(`title.ilike.${term},description.ilike.${term}`)
          .limit(5),
        supabase
          .from('quotes')
          .select('id, number, title, status, total, customer:customer_id(id,name)')
          .or(`number.ilike.${term},title.ilike.${term}`)
          .limit(5),
        supabase
          .from('invoices')
          .select('id, number, title, status, total, customer:customer_id(id,name)')
          .or(`number.ilike.${term},title.ilike.${term}`)
          .limit(5),
      ])
      setResults({
        customers: customers.data || [],
        jobs: jobs.data || [],
        quotes: quotes.data || [],
        invoices: invoices.data || [],
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e) {
    const v = e.target.value
    setQuery(v)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(v), 250)
  }

  function handleSelect(href) {
    setOpen(false)
    setQuery('')
    setResults({ customers: [], jobs: [], quotes: [], invoices: [] })
    inputRef.current?.blur()
    navigate(href)
  }

  const totalResults =
    results.customers.length + results.jobs.length + results.quotes.length + results.invoices.length
  const hasQuery = query.trim().length >= 2
  const showDropdown = open && hasQuery

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={handleChange}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Search jobs, customers, quotes, invoices…"
        className="w-full h-10 pl-9 pr-14 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 border border-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
        style={{ fontSize: '14px' }}
        autoComplete="off"
        spellCheck={false}
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[10px] font-medium text-gray-400 dark:text-gray-500 pointer-events-none">
        ⌘K
      </kbd>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-elevated border border-gray-100 dark:border-gray-800 max-h-[70vh] overflow-y-auto animate-scale-in">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400 dark:text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </div>
          ) : totalResults === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No results for <span className="font-semibold">"{query}"</span>
            </div>
          ) : (
            <div className="py-2">
              {results.customers.length > 0 && (
                <Group label="Customers" count={results.customers.length}>
                  {results.customers.map(c => (
                    <Row
                      key={c.id}
                      Icon={User}
                      iconColor="text-brand-700 dark:text-brand-300"
                      iconBg="bg-brand-50 dark:bg-brand-950/40"
                      title={c.name}
                      subtitle={[c.phone, c.suburb || c.address, c.email].filter(Boolean).slice(0, 2).join(' · ')}
                      onClick={() => handleSelect(`/customers/${c.id}`)}
                    />
                  ))}
                </Group>
              )}

              {results.jobs.length > 0 && (
                <Group label="Jobs" count={results.jobs.length}>
                  {results.jobs.map(j => (
                    <Row
                      key={j.id}
                      Icon={Wrench}
                      iconColor="text-emerald-600 dark:text-emerald-400"
                      iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                      title={j.title || 'Job'}
                      subtitle={[j.customer?.name, j.status?.replace('_', ' ')].filter(Boolean).join(' · ')}
                      onClick={() => handleSelect(`/jobs/${j.id}`)}
                    />
                  ))}
                </Group>
              )}

              {results.quotes.length > 0 && (
                <Group label="Quotes" count={results.quotes.length}>
                  {results.quotes.map(q => (
                    <Row
                      key={q.id}
                      Icon={FileText}
                      iconColor="text-indigo-600 dark:text-indigo-400"
                      iconBg="bg-indigo-50 dark:bg-indigo-950/40"
                      title={`${q.number}${q.title ? ` · ${q.title}` : ''}`}
                      subtitle={[q.customer?.name, q.status].filter(Boolean).join(' · ')}
                      onClick={() => handleSelect(`/quotes/${q.id}`)}
                    />
                  ))}
                </Group>
              )}

              {results.invoices.length > 0 && (
                <Group label="Invoices" count={results.invoices.length}>
                  {results.invoices.map(inv => (
                    <Row
                      key={inv.id}
                      Icon={Receipt}
                      iconColor="text-amber-600 dark:text-amber-400"
                      iconBg="bg-amber-50 dark:bg-amber-950/40"
                      title={`${inv.number}${inv.title ? ` · ${inv.title}` : ''}`}
                      subtitle={[inv.customer?.name, inv.status].filter(Boolean).join(' · ')}
                      onClick={() => handleSelect(`/invoices/${inv.id}`)}
                    />
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ label, count, children }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 tabular-nums">{count}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Row({ Icon, iconColor, iconBg, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-4 h-4', iconColor)} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>
    </button>
  )
}
