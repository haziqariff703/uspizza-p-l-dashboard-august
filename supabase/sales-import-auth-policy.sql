-- Run once after sales-import-schema.sql if the original policies were already created.
-- Restricts each signed-in user to their own imports, processed sales, and files.

drop policy if exists "Authenticated users can read sales imports" on public.sales_imports;
create policy "Authenticated users can read sales imports"
on public.sales_imports for select to authenticated
using ((select auth.uid()) = uploaded_by);

drop policy if exists "Authenticated users can read processed sales" on public.sales_daily;
create policy "Authenticated users can read processed sales"
on public.sales_daily for select to authenticated
using (
  exists (
    select 1 from public.sales_imports imports
    where imports.id = sales_daily.import_id
      and imports.uploaded_by = (select auth.uid())
  )
);

drop policy if exists "Authenticated users can view sales import files" on storage.objects;
create policy "Authenticated users can view sales import files"
on storage.objects for select to authenticated
using (
  bucket_id = 'sales-imports'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
