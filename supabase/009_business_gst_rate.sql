-- Per-business GST rate. ProLine is NZ-based (15% GST today) but the
-- rate has changed in the past (12.5% pre-2010) and could change
-- again. The hardcoded constants.js GST_RATE = 0.15 was the source
-- of truth for new quotes / invoices, which made an across-the-board
-- rate change a code-deploy task instead of a settings change.
--
-- Per-doc gst_rate already exists on quotes + invoices (0.15 default)
-- so historical documents keep whatever rate they were issued under.
-- This migration just adds a per-business default that NewQuoteModal /
-- NewInvoiceModal source from when creating new docs.
--
-- numeric(5,4) → up to 9.9999 (we won't see four-digit GST rates),
-- four decimal places handles 0.1234 cases like split rates without
-- floating-point drift.

alter table public.businesses
  add column if not exists gst_rate numeric(5,4) not null default 0.15;

comment on column public.businesses.gst_rate is
  'Per-business GST rate (decimal, e.g. 0.15 = 15%). Used as the default rate for new quotes / invoices. Historical docs keep their own gst_rate column.';
