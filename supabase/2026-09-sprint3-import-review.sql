-- Sprint 3 — support for the import review UI.
-- Run AFTER 2026-09-sprint2-import-staging.sql. Safe to re-run.

begin;

-- The review panel needs "how many rows were skipped, and why" per import.
-- PostgREST cannot GROUP BY, and a month's staged rows are far too many to
-- count in the browser. Deliberately security invoker (the default), so
-- row-level security on sales_import_rows still decides what a caller sees.
create or replace function public.import_row_summary(import uuid)
returns table (skip_reason text, rows bigint, first_row_number integer)
language sql stable security invoker set search_path = '' as $fn$
  select r.skip_reason, count(*)::bigint, min(r.source_row_number)
  from public.sales_import_rows r
  where r.sales_import_id = import
  group by r.skip_reason
  order by count(*) desc;
$fn$;

revoke all on function public.import_row_summary(uuid) from public, anon;
grant execute on function public.import_row_summary(uuid) to authenticated;

-- Fetching the sample rows behind one skip reason.
create index if not exists sales_import_rows_reason_idx
on public.sales_import_rows (sales_import_id, skip_reason, source_row_number);

commit;
