-- Audit fixes 2026-04-25:
--   #4 atomic line-item replace via single-transaction RPC
--   #6 public_quote_by_token strips bank_account from the response shape

------------------------------------------------------------
-- replace_quote_lines / replace_invoice_lines  (#4)
-- Single function-body transaction: delete-all + insert-new in one shot.
-- security invoker -> RLS still applies (authenticated full CRUD policy).
------------------------------------------------------------

create or replace function public.replace_quote_lines(p_quote_id uuid, p_lines jsonb)
returns void language plpgsql security invoker as $$
begin
  delete from public.quote_line_items where quote_id = p_quote_id;
  if jsonb_typeof(p_lines) = 'array' and jsonb_array_length(p_lines) > 0 then
    insert into public.quote_line_items (quote_id, description, qty, unit_price, total, sort)
    select
      p_quote_id,
      coalesce(e->>'description', ''),
      coalesce((e->>'qty')::numeric, 0),
      coalesce((e->>'unit_price')::numeric, 0),
      coalesce((e->>'total')::numeric, 0),
      coalesce((e->>'sort')::int, 0)
    from jsonb_array_elements(p_lines) e;
  end if;
end $$;

grant execute on function public.replace_quote_lines(uuid, jsonb) to authenticated;

create or replace function public.replace_invoice_lines(p_invoice_id uuid, p_lines jsonb)
returns void language plpgsql security invoker as $$
begin
  delete from public.invoice_line_items where invoice_id = p_invoice_id;
  if jsonb_typeof(p_lines) = 'array' and jsonb_array_length(p_lines) > 0 then
    insert into public.invoice_line_items (invoice_id, description, qty, unit_price, total, sort)
    select
      p_invoice_id,
      coalesce(e->>'description', ''),
      coalesce((e->>'qty')::numeric, 0),
      coalesce((e->>'unit_price')::numeric, 0),
      coalesce((e->>'total')::numeric, 0),
      coalesce((e->>'sort')::int, 0)
    from jsonb_array_elements(p_lines) e;
  end if;
end $$;

grant execute on function public.replace_invoice_lines(uuid, jsonb) to authenticated;

------------------------------------------------------------
-- public_quote_by_token  (#6)
-- Drop bank_account and other internal-only columns from the response.
-- Customer doesn't need them on the quote portal — invoices keep them.
------------------------------------------------------------

create or replace function public.public_quote_by_token(p_token uuid)
returns json language plpgsql security definer stable as $$
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
  from business order by created_at limit 1;

  select coalesce(json_agg(row_to_json(l) order by l.sort), '[]'::json) into v_lines
    from quote_line_items l where l.quote_id = v_quote.id;

  return json_build_object(
    'quote',    row_to_json(v_quote),
    'customer', row_to_json(v_cust),
    'business', v_biz_pub,
    'lines',    v_lines
  );
end $$;

grant execute on function public.public_quote_by_token(uuid) to anon, authenticated;
