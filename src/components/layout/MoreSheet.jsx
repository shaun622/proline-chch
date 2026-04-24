import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight } from 'lucide-react'
import Modal from '../ui/Modal'
import IconBox from '../ui/IconBox'
import { useAuth } from '../../contexts/AuthContext'

export default function MoreSheet({ open, onClose, items = [] }) {
  const nav = useNavigate()
  const { signOut, user } = useAuth()

  function go(path) {
    onClose?.()
    nav(path)
  }

  async function handleSignOut() {
    onClose?.()
    await signOut()
  }

  return (
    <Modal open={open} onClose={onClose} title="More" subtitle={user?.email} size="md">
      <div className="space-y-4">
        <div className="card !p-0 divide-y divide-gray-100 dark:divide-gray-800">
          {items.map(it => (
            <button
              key={it.path}
              onClick={() => go(it.path)}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <IconBox icon={it.Icon} color={it.color || 'brand'} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">{it.label}</p>
                {it.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{it.description}</p>}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-card hover:bg-gray-50 dark:hover:bg-gray-800 min-h-tap"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </Modal>
  )
}
