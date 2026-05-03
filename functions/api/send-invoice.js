import { verifyAuth, jsonResponse, supaHeaders, supaUrl, sendResendEmail, renderInvoiceEmail, patchWithRetry } from '../_lib/email.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
  }

  const user = await verifyAuth(request, env)
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

  let body
  try { body = await request.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  const { invoiceId, to } = body || {}
  if (!invoiceId || !to) return jsonResponse({ error: 'Missing invoiceId or to' }, 400)

  const headers = supaHeaders(env)
  const base = supaUrl(env)

  const [invRes, bizRes] = await Promise.all([
    fetch(`${base}/rest/v1/invoices?id=eq.${invoiceId}&select=*,customer:customer_id(id,name,email)`, { headers }),
    fetch(`${base}/rest/v1/businesses?select=*&limit=1`, { headers }),
  ])
  const invoices = await invRes.json()
  const biz = await bizRes.json()
  const invoice = Array.isArray(invoices) ? invoices[0] : null
  const business = Array.isArray(biz) ? biz[0] : null
  if (!invoice) return jsonResponse({ error: 'Invoice not found' }, 404)

  const origin = env.PUBLIC_APP_URL || `${new URL(request.url).origin}`
  const portalUrl = `${origin}/i/${invoice.public_token}`

  try {
    await sendResendEmail({
      env,
      to,
      subject: `Invoice ${invoice.number} from ${business?.name || 'ProLine Aluminium'}`,
      html: renderInvoiceEmail({ invoice, business, customer: invoice.customer, portalUrl }),
      replyTo: business?.email || undefined,
    })
  } catch (err) {
    return jsonResponse({ error: 'Email failed', detail: String(err.message || err) }, 502)
  }

  const patched = await patchWithRetry(
    `${base}/rest/v1/invoices?id=eq.${invoiceId}`,
    headers,
    JSON.stringify({ status: 'sent', sent_at: new Date().toISOString() }),
  )
  if (!patched) {
    return jsonResponse({
      ok: true,
      warning: 'email_sent_status_update_failed',
      message: 'Email was sent, but the invoice status could not be updated. Refresh the page; if it still shows draft, mark sent manually.',
    })
  }
  return jsonResponse({ ok: true, invoice: Array.isArray(patched) ? patched[0] : patched })
}
