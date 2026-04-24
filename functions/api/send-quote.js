import { verifyAuth, jsonResponse, supaHeaders, supaUrl, sendResendEmail, renderQuoteEmail } from '../_lib/email.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
  }

  const user = await verifyAuth(request, env)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  let body
  try { body = await request.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  const { quoteId, to } = body || {}
  if (!quoteId || !to) return jsonResponse({ error: 'Missing quoteId or to' }, 400)

  const headers = supaHeaders(env)
  const base = supaUrl(env)

  const [quoteRes, bizRes] = await Promise.all([
    fetch(`${base}/rest/v1/quotes?id=eq.${quoteId}&select=*,customer:customer_id(id,name,email)`, { headers }),
    fetch(`${base}/rest/v1/business?select=*&limit=1`, { headers }),
  ])
  const quotes = await quoteRes.json()
  const biz = await bizRes.json()
  const quote = Array.isArray(quotes) ? quotes[0] : null
  const business = Array.isArray(biz) ? biz[0] : null
  if (!quote) return jsonResponse({ error: 'Quote not found' }, 404)

  const origin = env.PUBLIC_APP_URL || `${new URL(request.url).origin}`
  const portalUrl = `${origin}/q/${quote.public_token}`

  try {
    await sendResendEmail({
      env,
      to,
      subject: `Quote ${quote.number} from ${business?.name || 'ProLine Aluminium'}`,
      html: renderQuoteEmail({ quote, business, customer: quote.customer, portalUrl }),
      replyTo: business?.email || undefined,
    })
  } catch (err) {
    return jsonResponse({ error: 'Email failed', detail: String(err.message || err) }, 502)
  }

  // Mark as sent
  const patchRes = await fetch(`${base}/rest/v1/quotes?id=eq.${quoteId}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
  })
  const patched = await patchRes.json()

  return jsonResponse({ ok: true, quote: Array.isArray(patched) ? patched[0] : patched })
}
