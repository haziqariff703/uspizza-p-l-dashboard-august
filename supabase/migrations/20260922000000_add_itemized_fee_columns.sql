-- Add the three itemized Section 2 fee columns to sales_daily so each of the
-- five fee categories can be known independently. NULL = unknown/not stated,
-- never zero — the browser continues to write the parsed daily totals.
-- Mirrors the existing nullable numeric(14,2) money columns on the table.

begin;

alter table public.sales_daily
  add column if not exists commission numeric(14,2),
  add column if not exists payment_gateway_fee numeric(14,2),
  add column if not exists adjustments numeric(14,2),
  add column if not exists total_deductions numeric(14,2);

notify pgrst,'reload schema';

commit;
