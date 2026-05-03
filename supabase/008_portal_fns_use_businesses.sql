-- Migration 007 renamed `business` (singular) → `businesses` (plural)
-- but the SECURITY DEFINER portal RPC functions weren't updated, so
-- they continued to reference the old table name and the customer-
-- facing `/q/<token>` and `/i/<token>` portal pages started rendering
-- "Quote not found" / "Invoice not found" — the relation lookup
-- inside the function aborted with `relation "business" does not
-- exist`.
--
-- Re-create both functions against `businesses`. Same shape as the
-- originals; only the FROM clause + the rowtype reference change.
-- Both stay STABLE SECURITY DEFINER so the anon role can still call
-- them without seeing the underlying table directly.

create or replace function public.public_quote_by_token(p_token uuid)
returns json
language plpgsql
stable security definer
as $$
declare
  v_quote   quotes%rowtype;
  v_cust    customers%rowtype;
  v_biz_pub json;
  v_lines   json;
begin
  select * into v_quote from quotes where public_token = p_token;
  if v_quote.id is null then return json_build_object('error', 'not_found'); end if;
  select * into v_cust from customers where id = v_quote.customer_id;

  -- Curated public business shape: no bank_account, no payment_terms_days.
  select json_build_object(
    'name',         name,
    'legal_name',   legal_name,
    'phone',        phone,
    'email',        email,
    'address',      address,
    'gst_number',   gst_number,
    'logo_url',     logo_url,
    'quote_footer', quote_footer
  ) into v_biz_pub
  from businesses order by created_at limit 1;

  select coalesce(json_agg(row_to_json(l) order by l.sort), '[]'::json) into v_lines
    from quote_line_items l where l.quote_id = v_quote.id;

  return json_build_object(
    'quote',    row_to_json(v_quote),
    'customer', row_to_json(v_cust),
    'business', v_biz_pub,
    'lines',    v_lines
  );
end $$;

create or replace function public.public_invoice_by_token(p_token uuid)
returns json
language plpgsql
stable security definer
as $$
declare
  v_inv    invoices%rowtype;
  v_cust   customers%rowtype;
  v_biz    businesses%rowtype;
  v_lines  json;
begin
  select * into v_inv from invoices where public_token = p_token;
  if v_inv.id is null then return json_build_object('error', 'not_found'); end if;
  select * into v_cust from customers where id = v_inv.customer_id;
  select * into v_biz  from businesses order by created_at limit 1;
  select coalesce(json_agg(row_to_json(l) order by l.sort), '[]'::json) into v_lines
    from invoice_line_items l where l.invoice_id = v_inv.id;
  return json_build_object(
    'invoice',  row_to_json(v_inv),
    'customer', row_to_json(v_cust),
    'business', row_to_json(v_biz),
    'lines',    v_lines
  );
end $$;
