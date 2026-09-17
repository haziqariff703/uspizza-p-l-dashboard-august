-- Share dashboard figures across signed-in users while keeping data management
-- with the original uploader. Source-file objects remain private in Storage.
begin;

create policy "Authenticated users read shared outlets"
on public.outlets for select to authenticated
using (true);

create policy "Authenticated users read shared outlet aliases"
on public.outlet_aliases for select to authenticated
using (true);

create policy "Authenticated users read shared sales imports"
on public.sales_imports for select to authenticated
using (true);

create policy "Authenticated users read shared sales totals"
on public.sales_daily for select to authenticated
using (true);

create policy "Authenticated users read shared purchase imports"
on public.purchases_imports for select to authenticated
using (true);

create policy "Authenticated users read shared purchase totals"
on public.purchases_daily for select to authenticated
using (true);

commit;
