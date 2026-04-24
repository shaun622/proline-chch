import { useNavigate } from 'react-router-dom'
import { Building2, FileText, Palette, LogOut, ChevronRight } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import PageHero from '../components/layout/PageHero'
import IconBox from '../components/ui/IconBox'
import Badge from '../components/ui/Badge'
import { ThemeToggleFull } from '../components/layout/ThemeToggle'
import { useAuth } from '../contexts/AuthContext'

const SECTIONS = [
  {
    to: '/settings/business',
    label: 'Business details',
    description: 'Name, contact, bank account, GST',
    Icon: Building2,
    color: 'brand',
    badge: 'Soon',
  },
  {
    to: '/settings/quotes',
    label: 'Quote & invoice defaults',
    description: 'Numbering, footer, payment terms',
    Icon: FileText,
    color: 'indigo',
    badge: 'Soon',
  },
]

export default function Settings() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()

  return (
    <PageWrapper>
      <PageHero title="Settings" subtitle={user?.email ? `Signed in as ${user.email}` : undefined} />

      <div className="space-y-6">
        <div className="card !p-0 divide-y divide-gray-100 dark:divide-gray-800">
          {SECTIONS.map(s => (
            <button
              key={s.to}
              onClick={() => nav(s.to)}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <IconBox icon={s.Icon} color={s.color} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">{s.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{s.description}</p>
              </div>
              {s.badge ? <Badge>{s.badge}</Badge> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="section-title flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> Appearance</h2>
          <div className="card flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Light, dark, or match your system</p>
            </div>
            <ThemeToggleFull />
          </div>
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-card hover:bg-gray-50 dark:hover:bg-gray-800 min-h-tap"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </PageWrapper>
  )
}
