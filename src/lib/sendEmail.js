import { supabase } from './supabase'

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  return { Authorization: `Bearer ${token}` }
}

export async function sendQuoteEmail({ quoteId, to }) {
  const res = await fetch('/api/send-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ quoteId, to }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Send failed (${res.status})`)
  return json
}

export async function sendInvoiceEmail({ invoiceId, to }) {
  const res = await fetch('/api/send-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ invoiceId, to }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Send failed (${res.status})`)
  return json
}
