import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Trash2, Upload, X } from 'lucide-react'
import Button from './Button'
import ConfirmModal from './ConfirmModal'
import Badge from './Badge'
import Toast from './Toast'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

const KINDS = [
  { value: 'before',   label: 'Before' },
  { value: 'progress', label: 'Progress' },
  { value: 'after',    label: 'After' },
]

export default function JobPhotos({ jobId }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const fileRef = useRef(null)
  const [pendingKind, setPendingKind] = useState('progress')
  const [toast, setToast] = useState({ msg: '', kind: 'info' })

  function showToast(msg, kind = 'error', ms = 3000) {
    setToast({ msg, kind })
    setTimeout(() => setToast({ msg: '', kind: 'info' }), ms)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('job_photos').select('*').eq('job_id', jobId).order('created_at', { ascending: false })
    setPhotos(data || [])
    setLoading(false)
  }, [jobId])

  useEffect(() => { load() }, [load])

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setBusy(true)
    try {
      for (const file of files) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg'
        const path = `${jobId}/${crypto.randomUUID()}.${safeExt}`
        const { error: upErr } = await supabase.storage.from('job-photos').upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(path)
        const { error } = await supabase.from('job_photos').insert({ job_id: jobId, url: urlData.publicUrl, kind: pendingKind })
        if (error) throw error
      }
      await load()
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(photo) {
    try {
      const m = photo.url.match(/\/object\/public\/job-photos\/(.+)$/)
      if (m) await supabase.storage.from('job-photos').remove([m[1]])
      await supabase.from('job_photos').delete().eq('id', photo.id)
      await load()
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error')
    }
  }

  const visible = filter === 'all' ? photos : photos.filter(p => p.kind === filter)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {[{ value: 'all', label: 'All' }, ...KINDS].map(k => (
            <button
              key={k.value}
              type="button"
              onClick={() => setFilter(k.value)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
                filter === k.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pendingKind}
            onChange={e => setPendingKind(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5"
          >
            {KINDS.map(k => <option key={k.value} value={k.value}>Tag as {k.label}</option>)}
          </select>
          <Button
            size="sm"
            leftIcon={Upload}
            loading={busy}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        </div>
      </div>

      {loading ? null : visible.length === 0 ? (
        <div className="card flex flex-col items-center text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
            <Camera className="w-6 h-6" strokeWidth={2} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">No {filter === 'all' ? 'photos' : filter + ' photos'} yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {visible.map(p => (
            <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group">
              <button
                type="button"
                onClick={() => setViewing(p)}
                aria-label={`View photo${p.caption ? ` — ${p.caption}` : ''}`}
                className="absolute inset-0 w-full h-full focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-inset"
              >
                <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
              </button>
              <span className="absolute top-1.5 left-1.5 pointer-events-none">
                <Badge variant={p.kind === 'after' ? 'success' : p.kind === 'before' ? 'warning' : 'primary'}>
                  {p.kind}
                </Badge>
              </span>
              <button
                type="button"
                onClick={() => setDeleting(p)}
                aria-label="Delete photo"
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-black/70 hover:bg-black/85 text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <button onClick={() => setViewing(null)} className="absolute top-4 right-4 text-white min-h-tap min-w-tap flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
          <img src={viewing.url} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => handleDelete(deleting)}
        destructive
        title="Delete this photo?"
        description="This cannot be undone."
        confirmLabel="Delete"
      />

      <Toast message={toast.msg} kind={toast.kind} />
    </div>
  )
}
