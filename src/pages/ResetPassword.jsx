import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase auto-applies the recovery token from the URL hash
    // and emits a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    // Also check existing session in case the token was already exchanged
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (pw.length < 8) return setErr('Password must be at least 8 characters')
    if (pw !== pw2) return setErr('Passwords don\u2019t match')
    setErr(''); setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setDone(true)
      setTimeout(() => nav('/', { replace: true }), 1500)
    } catch (e) {
      setErr(e.message || 'Could not set new password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/logo.png" alt="ProLine Aluminium" className="w-20 h-20 object-contain dark:invert" />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Set a new password</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">At least 8 characters.</p>
          </div>
        </div>

        {done ? (
          <div className="card text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-semibold">Password updated</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting…</p>
          </div>
        ) : !ready ? (
          <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
            <KeyRound className="w-6 h-6 mx-auto mb-2" />
            Verifying reset link…
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">New password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={pw}
                onChange={e => setPw(e.target.value)}
                className="input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Confirm new password</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                className="input"
              />
            </div>
            {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Saving…' : 'Update password'}
            </button>
            <Link to="/login" className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-block text-center w-full">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
