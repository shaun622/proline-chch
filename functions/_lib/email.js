// Shared helpers for Cloudflare Pages Functions.

export async function verifyAuth(request, env) {
  const auth = request.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const res = await fetch(`${env.VITE_SUPABASE_URL || env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })
  if (!res.ok) return null
  return res.json()
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function supaHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export function supaUrl(env) {
  return env.VITE_SUPABASE_URL || env.SUPABASE_URL
}

export function currencyNZD(n) {
  return Number(n || 0).toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })
}

export async function sendResendEmail({ env, to, subject, html, replyTo }) {
  const from = env.BUSINESS_EMAIL_FROM || 'ProLine Aluminium <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Resend failed (${res.status}): ${detail}`)
  }
  return res.json()
}

export function renderQuoteEmail({ quote, business, customer, portalUrl }) {
  const name = customer?.name?.split(' ')[0] || 'there'
  const brand = business?.name || 'ProLine Aluminium'
  const total = currencyNZD(quote.total)
  const validUntil = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-NZ', { year: 'numeric', month: 'short', day: 'numeric' }) : null

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <tr><td style="padding:24px 28px 16px;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">Quote ${escapeHtml(quote.number)}</p>
          <h1 style="margin:0;font-size:22px;color:#111827;">${escapeHtml(brand)}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Thanks for the chance to quote${quote.title ? ` on <strong>${escapeHtml(quote.title)}</strong>` : ''}. The full breakdown is on the link below.</p>
          <p style="margin:0 0 20px;font-size:15px;"><strong style="font-size:18px;">${total}</strong> <span style="color:#6b7280;font-size:13px;">incl. GST</span></p>
          <p style="margin:0 0 24px;">
            <a href="${escapeAttr(portalUrl)}" style="display:inline-block;background:linear-gradient(135deg,#5E6875 0%,#3F4650 100%);color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">View &amp; accept quote →</a>
          </p>
          ${validUntil ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">Valid until ${escapeHtml(validUntil)}.</p>` : ''}
          <p style="margin:0 0 0;font-size:14px;line-height:1.55;color:#374151;">Any questions, hit reply or give us a call.</p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #f3f4f6;font-size:12px;color:#6b7280;">
          ${escapeHtml(brand)}${business?.phone ? ` · ${escapeHtml(business.phone)}` : ''}${business?.email ? ` · ${escapeHtml(business.email)}` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function renderInvoiceEmail({ invoice, business, customer, portalUrl }) {
  const name = customer?.name?.split(' ')[0] || 'there'
  const brand = business?.name || 'ProLine Aluminium'
  const total = currencyNZD(invoice.total)
  const due = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-NZ', { year: 'numeric', month: 'short', day: 'numeric' }) : null

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <tr><td style="padding:24px 28px 16px;border-bottom:1px solid #f3f4f6;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">Invoice ${escapeHtml(invoice.number)}</p>
          <h1 style="margin:0;font-size:22px;color:#111827;">${escapeHtml(brand)}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">Your invoice${invoice.title ? ` for <strong>${escapeHtml(invoice.title)}</strong>` : ''} is ready.</p>
          <p style="margin:0 0 6px;font-size:15px;"><strong style="font-size:18px;">${total}</strong> <span style="color:#6b7280;font-size:13px;">incl. GST</span></p>
          ${due ? `<p style="margin:0 0 20px;font-size:13px;color:#6b7280;">Due ${escapeHtml(due)}.</p>` : ''}
          <p style="margin:0 0 24px;">
            <a href="${escapeAttr(portalUrl)}" style="display:inline-block;background:linear-gradient(135deg,#5E6875 0%,#3F4650 100%);color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">View invoice →</a>
          </p>
          ${business?.bank_account ? `<p style="margin:0 0 6px;font-size:13px;color:#374151;"><strong>Direct credit:</strong></p><p style="margin:0 0 16px;font-size:13px;color:#374151;white-space:pre-wrap;">${escapeHtml(business.bank_account)}</p><p style="margin:0 0 16px;font-size:12px;color:#6b7280;">Please use <strong>${escapeHtml(invoice.number)}</strong> as the reference.</p>` : ''}
          <p style="margin:0;font-size:14px;line-height:1.55;color:#374151;">Any questions, hit reply or give us a call.</p>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #f3f4f6;font-size:12px;color:#6b7280;">
          ${escapeHtml(brand)}${business?.phone ? ` · ${escapeHtml(business.phone)}` : ''}${business?.email ? ` · ${escapeHtml(business.email)}` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function escapeAttr(s) {
  return escapeHtml(s)
}
