begin;

-- Shopee remains a valid future sales source. The preceding migration removed
-- only its existing imports, daily totals and aliases.
alter table public.sales_imports
  drop constraint sales_imports_source_check,
  add constraint sales_imports_source_check
    check (source = any (array['pos', 'grab', 'foodpanda', 'shopee', 'apps']));

alter table public.outlet_aliases
  drop constraint outlet_aliases_source_check,
  add constraint outlet_aliases_source_check
    check (source = any (array['pos', 'grab', 'foodpanda', 'shopee', 'apps']));

commit;
