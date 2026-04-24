-- Public customer portal functions (SECURITY DEFINER — bypass RLS by token).
-- Safe to re-run.

create or replace function public.public_quote_by_token(p_token uuid)
returns json language plpgsql security definer stable as $$
declare
  v_quote  quotes%rowtype;
  v_cust   customers%rowtype;
  v_biz    business%rowtype;
  v_lines  json;
begin
  select * into v_quote from quotes where public_token = p_token;
  if v_quote.id is null then return json_build_object('error', 'not_found'); end if;
  select * into v_cust from customers where id = v_quote.customer_id;
  select * into v_biz  from business order by created_at limit 1;
  select coalesce(json_agg(row_to_json(l) order by l.sort), '[]'::json) into v_lines
    from quote_line_items l where l.quote_id = v_quote.id;
  return json_build_object(
    'quote',    row_to_json(v_quote),
    'customer', row_to_json(v_cust),
    'business', row_to_json(v_biz),
    'lines',    v_lines
  );
end $$;

grant execute on function public.public_quote_by_token(uuid) to anon, authenticated;

create or replace function public.public_invoice_by_token(p_token uuid)
returns json language plpgsql security definer stable as $$
declare
  v_inv    invoices%rowtype;
  v_cust   customers%rowtype;
  v_biz    business%rowtype;
  v_lines  json;
begin
  select * into v_inv from invoices where public_token = p_token;
  if v_inv.id is null then return json_build_object('error', 'not_found'); end if;
  select * into v_cust from customers where id = v_inv.customer_id;
  select * into v_biz  from business order by created_at limit 1;
  select coalesce(json_agg(row_to_json(l) order by l.sort), '[]'::json) into v_lines
    from invoice_line_items l where l.invoice_id = v_inv.id;
  return json_build_object(
    'invoice',  row_to_json(v_inv),
    'customer', row_to_json(v_cust),
    'business', row_to_json(v_biz),
    'lines',    v_lines
  );
end $$;

grant execute on function public.public_invoice_by_token(uuid) to anon, authenticated;

create or replace function public.accept_quote_by_token(p_token uuid)
returns json language plpgsql security definer as $$
declare v_q quotes%rowtype;
begin
  update public.quotes
    set status = 'accepted', accepted_at = coalesce(accepted_at, now())
    where public_token = p_token and status in ('draft', 'sent')
    returning * into v_q;
  return json_build_object('ok', v_q.id is not null, 'quote', row_to_json(v_q));
end $$;

grant execute on function public.accept_quote_by_token(uuid) to anon, authenticated;

create or replace function public.decline_quote_by_token(p_token uuid)
returns json language plpgsql security definer as $$
declare v_q quotes%rowtype;
begin
  update public.quotes
    set status = 'declined', declined_at = coalesce(declined_at, now())
    where public_token = p_token and status in ('draft', 'sent')
    returning * into v_q;
  return json_build_object('ok', v_q.id is not null);
end $$;

grant execute on function public.decline_quote_by_token(uuid) to anon, authenticated;
