-- DB-backed plan catalog. Groundwork only — ProLine is single-tenant
-- for ProLine Aluminium today, no Subscription page or Staff page
-- consumes this yet. Lays the foundation so the FieldSuite HQ Plans
-- panel can manage ProLine's plan catalog the same way it does
-- PoolPro / Tree Mate / AWC.
--
-- service_role writes; anon read everything (matches sibling apps).
-- The table holds NO secrets — Stripe price IDs would land in a
-- separate non-public column when integrated.
--
-- Note ProLine's tables use singular `business` not `businesses`.
-- The plans table is tenant-agnostic so the singular/plural quirk
-- doesn't bite here.

create table if not exists public.plans (
  slug         text primary key,
  name         text not null,
  price_cents  int  not null default 0,
  period       text not null default 'month',  -- month | year | once
  max_staff    int  not null default 1,
  features     jsonb not null default '{}',
  sort_order   int  not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.plans enable row level security;

-- Public read so a future Subscription page (anon key) can fetch the
-- available plans on visit. No insert/update/delete policies →
-- service-role-only writes.
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans for select using (true);

-- Auto-bump updated_at on every PATCH from HQ admin so we have a
-- recency signal for cache busting later.
create or replace function public.plans_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.plans_touch_updated_at();

-- Seed: starting values mirror PoolPro for HQ admin consistency. The
-- operator can tune via the HQ admin Plans panel without further
-- migrations. ProLine's domain is aluminium fabrication / glazing —
-- features dictionary reflects job/quote/invoice volume rather than
-- pool / tree-services concepts.
insert into public.plans (slug, name, price_cents, period, max_staff, features, sort_order, is_active) values
  (
    'trial',
    'Trial',
    0,
    '14 days',
    1,
    jsonb_build_object(
      'jobs',               '5 jobs',
      'staff',              '1 staff member',
      'quotesPdf',          true,
      'invoicesPdf',        true,
      'customerPortal',     true,
      'photoAttachments',   false,
      'customBranding',     false,
      'prioritySupport',    false
    ),
    0,
    true
  ),
  (
    'starter',
    'Starter',
    900,
    'month',
    2,
    jsonb_build_object(
      'jobs',               'Unlimited',
      'staff',              '2 staff members',
      'quotesPdf',          true,
      'invoicesPdf',        true,
      'customerPortal',     true,
      'photoAttachments',   true,
      'customBranding',     false,
      'prioritySupport',    false
    ),
    1,
    true
  ),
  (
    'pro',
    'Pro',
    1900,
    'month',
    10,
    jsonb_build_object(
      'jobs',               'Unlimited',
      'staff',              '10 staff members',
      'quotesPdf',          true,
      'invoicesPdf',        true,
      'customerPortal',     true,
      'photoAttachments',   true,
      'customBranding',     true,
      'prioritySupport',    true
    ),
    2,
    true
  )
on conflict (slug) do nothing;
