import { verifyAuth, jsonResponse, supaHeaders, supaUrl, sendResendEmail, renderQuoteEmail, patchWithRetry } from '../_lib/email.js'

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
    fetch(`${base}/rest/v1/businesses?select=*&limit=1`, { headers }),
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

  // Email is out the door — now mark as sent. Retry on transient failure so
  // the customer never gets the email while the app still shows "draft".
  // If retries exhaust, return ok:true with a warning so the UI can prompt
  // the user to re-fetch / manually mark sent (instead of resending email).
  const patched = await patchWithRetry(
    `${base}/rest/v1/quotes?id=eq.${quoteId}`,
    headers,
    JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
  )
  if (!patched) {
    return jsonResponse({
      ok: true,
      warning: 'email_sent_status_update_failed',
      message: 'Email was sent, but the quote status could not be updated. Refresh the page; if it still shows draft, mark sent manually.',
    })
  }
  return jsonResponse({ ok: true, quote: Array.isArray(patched) ? patched[0] : patched })
}
