-- ProLine Aluminium — initial schema
-- Applied via the Supabase Management API (/database/query)
-- Safe to re-run (idempotent).

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

------------------------------------------------------------
-- Tables
------------------------------------------------------------

create table if not exists public.business (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  email text,
  phone text,
  address text,
  gst_number text,
  bank_account text,
  logo_url text,
  quote_prefix text default 'Q-',
  invoice_prefix text default 'INV-',
  quote_footer text,
  invoice_footer text,
  payment_terms_days int default 14,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  suburb text,
  property_type text check (property_type in ('residential','commercial')) default 'residential',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_name_trgm_idx on public.customers using gin (lower(coalesce(name,'')) gin_trgm_ops);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  description text,
  job_kind text check (job_kind in ('repair','new')) default 'repair',
  job_type text check (job_type in ('maintenance','glass','hardware','glazing','locks','other')) default 'maintenance',
  status text check (status in ('scheduled','in_progress','completed','cancelled')) default 'scheduled',
  scheduled_date timestamptz,
  completed_date timestamptz,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_scheduled_idx on public.jobs(scheduled_date);
create index if not exists jobs_status_idx on public.jobs(status);

create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  url text not null,
  caption text,
  kind text check (kind in ('before','after','progress')) default 'progress',
  sort int default 0,
  created_at timestamptz not null default now()
);

create index if not exists job_photos_job_id_idx on public.job_photos(job_id);

create table if not exists public.counters (
  key text primary key,
  value bigint not null default 0
);

insert into public.counters (key, value) values ('quote', 0), ('invoice', 0)
on conflict (key) do nothing;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  number text not null,
  status text check (status in ('draft','sent','accepted','declined','expired')) default 'draft',
  title text,
  notes text,
  valid_until date,
  subtotal numeric(12,2) not null default 0,
  gst_rate numeric(5,4) not null default 0.15,
  gst_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  public_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quotes_number_idx on public.quotes(number);
create unique index if not exists quotes_public_token_idx on public.quotes(public_token);
create index if not exists quotes_customer_id_idx on public.quotes(customer_id);
create index if not exists quotes_status_idx on public.quotes(status);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  qty numeric(12,3) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  sort int default 0
);

create index if not exists quote_line_items_quote_id_idx on public.quote_line_items(quote_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  number text not null,
  status text check (status in ('draft','sent','paid','overdue')) default 'draft',
  title text,
  notes text,
  due_date date,
  subtotal numeric(12,2) not null default 0,
  gst_rate numeric(5,4) not null default 0.15,
  gst_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  paid_amount numeric(12,2) default 0,
  sent_at timestamptz,
  paid_at timestamptz,
  public_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists invoices_number_idx on public.invoices(number);
create unique index if not exists invoices_public_token_idx on public.invoices(public_token);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoices_status_idx on public.invoices(status);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  qty numeric(12,3) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  sort int default 0
);

create index if not exists invoice_line_items_invoice_id_idx on public.invoice_line_items(invoice_id);

------------------------------------------------------------
-- Functions + triggers
------------------------------------------------------------

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists set_updated_at on public.business;
create trigger set_updated_at before update on public.business
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.jobs;
create trigger set_updated_at before update on public.jobs
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.quotes;
create trigger set_updated_at before update on public.quotes
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_updated_at on public.invoices;
create trigger set_updated_at before update on public.invoices
  for each row execute function public.tg_set_updated_at();

-- next_number('quote', 'Q-') -> 'Q-0001'
create or replace function public.next_number(p_key text, p_prefix text default 'X-')
returns text language plpgsql as $$
declare
  v_next bigint;
begin
  update public.counters set value = value + 1 where key = p_key returning value into v_next;
  if v_next is null then
    insert into public.counters (key, value) values (p_key, 1) returning value into v_next;
  end if;
  return p_prefix || lpad(v_next::text, 4, '0');
end $$;

------------------------------------------------------------
-- Row-Level Security
-- Single-tenant: any authenticated user gets full CRUD.
-- Public access to quotes/invoices goes through server-side
-- functions with the service_role key (see Cloudflare Pages functions).
------------------------------------------------------------

alter table public.business           enable row level security;
alter table public.customers          enable row level security;
alter table public.jobs               enable row level security;
alter table public.job_photos         enable row level security;
alter table public.quotes             enable row level security;
alter table public.quote_line_items   enable row level security;
alter table public.invoices           enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.counters           enable row level security;

drop policy if exists auth_all on public.business;
create policy auth_all on public.business for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.customers;
create policy auth_all on public.customers for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.jobs;
create policy auth_all on public.jobs for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.job_photos;
create policy auth_all on public.job_photos for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.quotes;
create policy auth_all on public.quotes for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.quote_line_items;
create policy auth_all on public.quote_line_items for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.invoices;
create policy auth_all on public.invoices for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.invoice_line_items;
create policy auth_all on public.invoice_line_items for all to authenticated using (true) with check (true);

drop policy if exists auth_all on public.counters;
create policy auth_all on public.counters for all to authenticated using (true) with check (true);

------------------------------------------------------------
-- Storage buckets
------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do nothing;

drop policy if exists "auth_all_job_photos" on storage.objects;
create policy "auth_all_job_photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'job-photos')
  with check (bucket_id = 'job-photos');

drop policy if exists "auth_all_business_assets" on storage.objects;
create policy "auth_all_business_assets" on storage.objects
  for all to authenticated
  using (bucket_id = 'business-assets')
  with check (bucket_id = 'business-assets');

drop policy if exists "public_read_job_photos" on storage.objects;
create policy "public_read_job_photos" on storage.objects
  for select to anon
  using (bucket_id = 'job-photos');

drop policy if exists "public_read_business_assets" on storage.objects;
create policy "public_read_business_assets" on storage.objects
  for select to anon
  using (bucket_id = 'business-assets');

------------------------------------------------------------
-- Seed
------------------------------------------------------------

insert into public.business (name, legal_name, email, phone, address, payment_terms_days, quote_prefix, invoice_prefix)
select
  'ProLine Aluminium',
  'ProLine Aluminium',
  'michael@prolinechch.co.nz',
  '027 845 6163',
  'Christchurch & Canterbury',
  14,
  'Q-',
  'INV-'
where not exists (select 1 from public.business);
