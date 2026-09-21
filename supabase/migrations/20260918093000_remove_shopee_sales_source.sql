begin;

-- The matching private Storage object must be removed through the Storage API.
-- Storage prevents direct SQL deletion, so this migration only changes database data.

delete from public.sales_daily as daily
using public.sales_imports as import
where daily.sales_import_id = import.id
  and import.source = 'shopee';

delete from public.sales_imports
where source = 'shopee';

delete from public.outlet_aliases
where source = 'shopee';

alter table public.sales_imports
  drop constraint sales_imports_source_check,
  add constraint sales_imports_source_check
    check (source = any (array['pos', 'grab', 'foodpanda', 'apps']));

alter table public.outlet_aliases
  drop constraint outlet_aliases_source_check,
  add constraint outlet_aliases_source_check
    check (source = any (array['pos', 'grab', 'foodpanda', 'apps']));

commit;
