-- Applied remote migration 20260917020153 on S&L_Dashboard, 17 September 2026.
-- User-authorized replacement of the testing project's application schema.
-- Requires the six simple tables created by add_simple_prototype_financial_tables.
-- This is an upgrade migration, not a fresh-install script.
begin;

create schema migration_backup_20260917;
revoke all on schema migration_backup_20260917 from public, anon, authenticated;
do $backup$
declare t text;
begin
  foreach t in array array[
    'organizations','organization_members','organization_invitations','outlets',
    'outlet_aliases','reporting_periods','sales_imports','sales_daily',
    'sales_import_rows','import_validation_issues','import_column_mappings',
    'published_source_records','sales_fee_lines','import_audit_events','reporting_period_events'
  ] loop
    execute format('lock table public.%I in access exclusive mode',t);
    execute format('create table migration_backup_20260917.%I as table public.%I',t,t);
    execute format('revoke all on migration_backup_20260917.%I from public, anon, authenticated',t);
  end loop;
  create table migration_backup_20260917.sales_file_objects as
    select * from storage.objects where bucket_id='sales-imports';
  create table migration_backup_20260917.original_policies as
    select * from pg_policies where schemaname in ('public','storage');
  create table migration_backup_20260917.original_functions as
    select n.nspname as schema_name,p.proname,
      pg_get_function_identity_arguments(p.oid) as arguments,
      pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','app_private')
      and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e');
end $backup$;
revoke all on all tables in schema migration_backup_20260917 from public, anon, authenticated;

drop policy if exists "Members upload sales import files under their own id" on storage.objects;
drop policy if exists "Organization members view sales import files" on storage.objects;
drop function if exists app_private.lock_sales_import(uuid,text[]);

-- Explicit targets with RESTRICT; an unexpected external dependency aborts.
drop table public.organizations,public.organization_members,
  public.organization_invitations,public.outlets,public.outlet_aliases,
  public.reporting_periods,public.sales_imports,public.sales_daily,
  public.sales_import_rows,public.import_validation_issues,
  public.import_column_mappings,public.published_source_records,
  public.sales_fee_lines,public.import_audit_events,public.reporting_period_events;

drop function if exists public.sales_import_contract_version(),
  public.set_sales_import_status(uuid,text,text),public.submit_sales_import(uuid,integer),
  public.review_sales_import_rows(uuid,uuid[],text,uuid,text),
  public.resolve_sales_import_issue(uuid,text),public.reject_sales_import(uuid,text),
  public.publish_sales_import(uuid),public.set_reporting_period_status(uuid,text,text),
  public.is_org_member(uuid),public.has_org_role(uuid,text[]),
  public.create_organization(text),public.organization_roster(uuid),
  public.accept_pending_invitations(),public.import_row_summary(uuid);

drop function if exists app_private.sales_amount(jsonb,text),
  app_private.guard_import_insert(),app_private.guard_staged_row(),
  app_private.guard_issue(),app_private.guard_period(),app_private.guard_membership(),
  app_private.set_sales_import_status(uuid,text,text),
  app_private.submit_sales_import(uuid,integer),
  app_private.review_sales_import_rows(uuid,uuid[],text,uuid,text),
  app_private.resolve_sales_import_issue(uuid,text),
  app_private.reject_sales_import(uuid,text),app_private.publish_sales_import(uuid),
  app_private.set_reporting_period_status(uuid,text,text),
  app_private.shares_org_with(text),app_private.add_creator_as_admin(),
  app_private.has_org_role(uuid,text[]),app_private.create_organization(text),
  app_private.is_org_member(uuid),app_private.organization_roster(uuid),
  app_private.accept_pending_invitations();

alter table public.prototype_outlets rename to outlets;
alter table public.prototype_outlet_aliases rename to outlet_aliases;
alter table public.prototype_sales_imports rename to sales_imports;
alter table public.prototype_sales_daily rename to sales_daily;
alter table public.prototype_purchases_imports rename to purchases_imports;
alter table public.prototype_purchases_daily rename to purchases_daily;

-- Renaming tables keeps FK references and RLS predicates attached by OID.
-- Give constraints, indexes and policies ordinary names too.
do $names$
declare r record;
begin
  for r in select c.relname,t.conname from pg_constraint t
    join pg_class c on c.oid=t.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and t.conname like 'prototype\_%' escape '\'
  loop
    execute format('alter table public.%I rename constraint %I to %I',
      r.relname,r.conname,substring(r.conname from 11));
  end loop;
  for r in select indexname from pg_indexes
    where schemaname='public' and indexname like 'prototype\_%' escape '\'
  loop
    execute format('alter index public.%I rename to %I',r.indexname,substring(r.indexname from 11));
  end loop;
  for r in select tablename,policyname from pg_policies
    where schemaname='public' and policyname like 'Prototype owners %'
  loop
    execute format('alter policy %I on public.%I rename to %I',
      r.policyname,r.tablename,replace(r.policyname,'Prototype owners','Owners'));
  end loop;
end $names$;

create index outlet_aliases_outlet_idx on public.outlet_aliases(outlet_id);
create index sales_imports_owner_month_idx on public.sales_imports(created_by,reporting_month);
create index purchases_imports_owner_month_idx on public.purchases_imports(created_by,reporting_month);

-- Private source files use <signed-in user UUID>/<import UUID>/<filename>.
insert into storage.buckets(id,name,public)
values ('purchases-imports','purchases-imports',false) on conflict(id) do nothing;
create policy "Owners read import files" on storage.objects for select to authenticated
using (bucket_id in ('sales-imports','purchases-imports')
  and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "Owners upload import files" on storage.objects for insert to authenticated
with check (bucket_id in ('sales-imports','purchases-imports')
  and (storage.foldername(name))[1]=(select auth.uid()::text));

notify pgrst,'reload schema';
commit;
