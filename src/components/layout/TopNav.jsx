import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, Wrench, Users, FileText, Receipt, Settings as SettingsIcon } from 'lucide-react'
import { ThemeToggleCompact } from './ThemeToggle'
import GlobalSearch from './GlobalSearch'
import { cn } from '../../lib/utils'

const TABS = [
  { path: '/',          label: 'Home',      Icon: Home },
  { path: '/schedule',  label: 'Schedule',  Icon: Calendar },
  { path: '/jobs',      label: 'Jobs',      Icon: Wrench },
  { path: '/customers', label: 'Customers', Icon: Users },
  { path: '/quotes',    label: 'Quotes',    Icon: FileText },
  { path: '/invoices',  label: 'Invoices',  Icon: Receipt },
]

export default function TopNav() {
  const location = useLocation()
  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
      {/* Row 1: brand + global search + theme + settings */}
      <div className="max-w-7xl mx-auto px-8 flex items-center gap-6 min-h-[60px]">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" alt="ProLine Aluminium" className="w-8 h-8 object-contain dark:invert" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">ProLine Aluminium</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Repairs &amp; Alterations</p>
          </div>
        </NavLink>
        <GlobalSearch className="flex-1 max-w-2xl mx-auto" />
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggleCompact />
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              'min-h-tap min-w-tap rounded-xl p-2 transition-colors',
              isActive
                ? 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/40'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
            )}
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5" strokeWidth={2} />
          </NavLink>
        </div>
      </div>

      {/* Row 2: underline tabs */}
      <nav className="max-w-7xl mx-auto px-8 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-gray-100 dark:border-gray-800/60">
        {TABS.map(({ path, label, Icon }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                active
                  ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} /> {label}
            </NavLink>
          )
        })}
      </nav>
    </header>
  )
}
