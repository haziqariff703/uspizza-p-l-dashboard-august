-- Re-add owner-scoped DELETE policies on the simple-prototype import tables.
--
-- 20260922010000 (global outlets / shared imports) dropped the per-owner
-- "Owners manage sales imports" and "Owners manage sales totals" policies and
-- only re-created INSERT + UPDATE, leaving the tables with no DELETE permission
-- at all. That silently breaks both "last import wins" replacement in the import
-- modal and the new Data Coverage "Delete sheets" danger-zone action.
--
-- The simple-prototype schema has no organization_id; ownership is `created_by`,
-- so a user may only delete their own imports (and, transitively, the
-- sales_daily rows that cascade from them via `sales_import_id ... on delete
-- cascade`). Storage files are removed by the application using the same
-- owner folder, not by this migration.
--
-- Safe to re-run.

begin;

-- sales_imports: the owner may delete their own import rows. Deleting an import
-- cascades to sales_daily (FK `sales_import_id ... on delete cascade`).
drop policy if exists "Owners delete sales imports" on public.sales_imports;
create policy "Owners delete sales imports"
  on public.sales_imports for delete to authenticated
  using (created_by = (select auth.uid()));

-- sales_daily: deleting an import already cascades its daily rows, but a direct
-- delete of daily rows is also allowed for the owner of the parent import, so a
-- partial cleanup is not blocked. Kept symmetrical with the import policy.
drop policy if exists "Owners delete sales totals" on public.sales_daily;
create policy "Owners delete sales totals"
  on public.sales_daily for delete to authenticated
  using (
    exists (
      select 1 from public.sales_imports i
      where i.id = sales_import_id and i.created_by = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';

commit;
