import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw error
      setSent(true)
    } catch (e) {
      setErr(e.message || 'Could not send reset link')
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
            <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">We'll email you a secure link.</p>
          </div>
        </div>

        {sent ? (
          <div className="card text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">Check your inbox</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.</p>
            </div>
            <Link to="/login" className="text-sm font-semibold text-brand-700 dark:text-brand-300 hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Sending…' : 'Email reset link'}
            </button>
            <Link to="/login" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center gap-1 justify-center w-full">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
