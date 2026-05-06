-- Simple expense + income tracker. Single table because both share the
-- same shape (date / category / amount); the only difference is sign at
-- totals time. type='expense' debits the running profit; type='income'
-- credits it. category is free text — the modal surfaces a curated
-- datalist for fast picks but doesn't constrain the operator.
--
-- Per-doc gst handling is intentionally out of scope for v1. If the
-- operator later wants to claim GST back on expenses we can add
-- gst_rate / gst_amount columns the same way we did on quotes/invoices.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('expense', 'income')),
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses(date desc);
create index if not exists expenses_type_idx on public.expenses(type);

-- Same RLS pattern as the rest of ProLine (single-tenant, single user).
alter table public.expenses enable row level security;
drop policy if exists auth_all on public.expenses;
create policy auth_all on public.expenses
  for all to authenticated using (true) with check (true);
