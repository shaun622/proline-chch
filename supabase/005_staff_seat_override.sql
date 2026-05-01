-- Operator override for staff seat limit + the plan column it depends
-- on. Groundwork only — ProLine is single-tenant for ProLine Aluminium
-- today and has no staff layer or Subscription page consuming this
-- yet. Lays the foundation so the FieldSuite HQ Plans panel and
-- per-business Set-staff-override modal can manage ProLine the same
-- way they manage PoolPro / Tree Mate / AWC.
--
-- ProLine uses `business` (singular) — the rest of the family uses
-- `businesses`. The HQ admin functions resolve the table name per
-- app via `resolveApp()` so this divergence is fine.

alter table public.business
  add column if not exists plan text default 'trial';

alter table public.business
  add column if not exists staff_seat_override int;

alter table public.business
  drop constraint if exists business_staff_seat_override_nonneg;

alter table public.business
  add constraint business_staff_seat_override_nonneg
    check (staff_seat_override is null or staff_seat_override >= 0);

comment on column public.business.plan is
  'Plan slug — references plans.slug informally (no FK so plans.is_active=false does not orphan businesses).';

comment on column public.business.staff_seat_override is
  'HQ admin override of the plan-default staff seat limit. NULL = use plan default.';
