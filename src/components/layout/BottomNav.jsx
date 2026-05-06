import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, Wrench, Users, MoreHorizontal, FileText, Receipt, Wallet, Settings as SettingsIcon, LogOut } from 'lucide-react'
import MoreSheet from './MoreSheet'
import { cn } from '../../lib/utils'

const PRIMARY = [
  { path: '/',          label: 'Home',      Icon: Home },
  { path: '/schedule',  label: 'Schedule',  Icon: Calendar },
  { path: '/jobs',      label: 'Jobs',      Icon: Wrench },
  { path: '/customers', label: 'Customers', Icon: Users },
]

const MORE_ITEMS = [
  { path: '/quotes',   label: 'Quotes',   Icon: FileText, color: 'indigo', description: 'Estimates & proposals' },
  { path: '/invoices', label: 'Invoices', Icon: Receipt,  color: 'emerald', description: 'Send & track payments' },
  { path: '/expenses', label: 'Expenses', Icon: Wallet,   color: 'amber',   description: 'Money in / money out' },
  { path: '/settings', label: 'Settings', Icon: SettingsIcon, color: 'gray', description: 'Business details & preferences' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-800/60 z-40 shadow-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {PRIMARY.map(({ path, label, Icon }) => {
            const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
            return (
              <NavLink
                key={path}
                to={path}
                className={cn(
                  'min-h-tap py-2 flex flex-col items-center justify-center gap-0.5 relative transition-colors',
                  active ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400',
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-brand-500 rounded-full" />
                )}
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="min-h-tap py-2 flex flex-col items-center justify-center gap-0.5 text-gray-500 dark:text-gray-400"
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={MORE_ITEMS} />
    </>
  )
}
