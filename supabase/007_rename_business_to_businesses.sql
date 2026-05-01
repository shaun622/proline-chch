-- Rename `business` (singular) to `businesses` (plural) so ProLine's
-- schema lines up with the rest of the FieldSuite family (PoolPro,
-- Tree Mate, AWC). The HQ admin Pages Functions (functions/api/admin/*)
-- query a fixed `businesses` table name; before this migration most of
-- HQ's per-business endpoints would 404 on ProLine because the table
-- name didn't match. After this, change-plan / set-staff-override /
-- impersonate / delete all work for ProLine without per-app aliasing.
--
-- Also adds owner_id (FK to auth.users) which HQ admin's getOwner
-- helper needs to resolve business → login email. The seeded
-- "ProLine Aluminium" row predates this column; backfill it manually
-- via Supabase Studio SQL editor:
--
--   update businesses set owner_id = '<auth-user-uuid>'
--     where name = 'ProLine Aluminium';
--
-- Triggers and RLS policies attached to the table automatically
-- follow the rename — no extra DDL needed for them. Idempotent: if
-- already renamed, the table-rename block is a no-op.
--
-- Caveat: schema.sql still references `public.business` in the
-- DROP TRIGGER lines and the seed INSERT. After this migration,
-- schema.sql is effectively legacy — migrations are the source of
-- truth going forward. Don't re-run schema.sql against a renamed DB.

do $$
begin
  if exists (
    select 1
    from pg_class
    where relname = 'business' and relnamespace = 'public'::regnamespace
  ) then
    alter table public.business rename to businesses;
  end if;
end $$;

alter table public.businesses
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

comment on column public.businesses.owner_id is
  'Auth user that owns this business. NULL allowed for legacy/seed rows pre-backfill.';
