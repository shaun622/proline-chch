import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      await signIn(email, pw)
      nav('/', { replace: true })
    } catch (e) {
      setErr(e.message || 'Sign-in failed')
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
            <h1 className="text-2xl font-bold tracking-tight">ProLine Aluminium</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Repairs &amp; Alterations</p>
          </div>
        </div>
        <form onSubmit={submit} className="card space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              className="input"
              value={pw}
              onChange={e => setPw(e.target.value)}
            />
          </div>
          {err && <p className="text-xs text-red-500 font-medium">{err}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="text-center">
            <Link to="/forgot-password" className="text-xs font-medium text-brand-700 dark:text-brand-300 hover:underline">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
