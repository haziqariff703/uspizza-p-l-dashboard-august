-- Run this once in Supabase Dashboard → SQL Editor, before the next import.
--
-- sales_daily money columns were `not null default 0`, so a figure a source
-- export does not contain (Shopee SST, Shopee commission, POS payout) was stored
-- as RM 0 and reported as a genuine zero. Missing is not zero: these columns now
-- hold null for "not provided by source".
--
-- Until this runs, imports from the updated parser will fail on the not-null
-- constraint rather than write a false zero.

begin;

alter table public.sales_daily
  alter column gross_sales drop not null, alter column gross_sales drop default,
  alter column discount drop not null, alter column discount drop default,
  alter column net_sales drop not null, alter column net_sales drop default,
  alter column tax drop not null, alter column tax drop default,
  alter column service_charge drop not null, alter column service_charge drop default,
  alter column platform_fees drop not null, alter column platform_fees drop default,
  alter column advertising_spend drop not null, alter column advertising_spend drop default,
  alter column payout drop not null, alter column payout drop default;

-- Rows imported before this change cannot be told apart from genuine zeros.
-- Re-import the affected months rather than trusting their zeros.

commit;
