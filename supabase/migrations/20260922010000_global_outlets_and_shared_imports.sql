-- Consolidate per-user duplicate outlets into ONE global row per `code`, open
-- imports to every authenticated user, and enforce "last import wins" semantics.
--
-- Owner intent (22 September 2026): everyone can see the dashboard and import;
-- data reflects the LAST import, not the importing user. The simple-prototype
-- schema scoped outlets per uploader via UNIQUE (created_by, code), which
-- produced one duplicate copy of every outlet per uploader and fragmented each
-- outlet's sales_daily rows across those copies. This migration collapses them.

begin;

-- ============================================================
-- STEP 0. Snapshot to a dated backup schema (mirrors migration_backup_20260917)
-- ============================================================
create schema migration_backup_20260922;
revoke all on schema migration_backup_20260922 from public, anon, authenticated;

create table migration_backup_20260922.outlets          as table public.outlets;
create table migration_backup_20260922.outlet_aliases   as table public.outlet_aliases;
create table migration_backup_20260922.sales_daily      as table public.sales_daily;
create table migration_backup_20260922.purchases_daily  as table public.purchases_daily;
create table migration_backup_20260922.grn_items        as table public.grn_items;
create table migration_backup_20260922.original_policies as
  select * from pg_policies where schemaname = 'public';
create table migration_backup_20260922.original_constraints as
  select c.relname as table_name, t.conname, pg_get_constraintdef(t.oid) as definition
  from pg_constraint t
  join pg_class c on c.oid = t.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public';

revoke all on all tables in schema migration_backup_20260922 from public, anon, authenticated;

-- ============================================================
-- STEP 1. Fail closed if any code has more than 2 rows.
-- ============================================================
do $guard$
declare n bigint;
begin
  select count(*) into n from (
    select code from public.outlets group by code having count(*) > 2
  ) x;
  if n > 0 then
    raise exception 'Aborting: % code(s) have more than 2 outlet rows; resolve manually first', n;
  end if;
end $guard$;

-- ============================================================
-- STEP 2. Choose the canonical survivor per code (earliest created_at, tie by id).
-- ============================================================
create temp table outlet_survivor as
select code,
       (array_agg(id order by created_at asc, id asc))[1] as keep_id,
       (array_agg(id order by created_at asc, id asc))[2] as drop_id
from public.outlets
group by code;

-- ============================================================
-- STEP 3. Merge loser metadata into survivor where the survivor has nothing better.
-- ============================================================
update public.outlets s
set name   = coalesce(nullif(btrim(s.name), ''), d.name),
    entity = coalesce(nullif(btrim(s.entity), ''), d.entity),
    status = case when s.status = 'active' then s.status else d.status end
from public.outlets d
join outlet_survivor m on m.drop_id = d.id
where s.id = m.keep_id;

-- ============================================================
-- STEP 4. Repoint ALL child FKs loser -> survivor, BEFORE any delete.
-- ============================================================
update public.sales_daily sd
set outlet_id = m.keep_id
from outlet_survivor m
where sd.outlet_id = m.drop_id;

update public.purchases_daily pd
set outlet_id = m.keep_id
from outlet_survivor m
where pd.outlet_id = m.drop_id;

update public.outlet_aliases oa
set outlet_id = m.keep_id
from outlet_survivor m
where oa.outlet_id = m.drop_id;

update public.grn_items g
set outlet_id = m.keep_id
from outlet_survivor m
where g.outlet_id = m.drop_id;

-- ============================================================
-- STEP 5. Detect unique collisions caused by repointing; abort rather than
--         silently merge financial rows.
-- ============================================================
do $dupcheck$
declare n bigint;
begin
  select count(*) into n from (
    select sales_import_id, outlet_id, sales_date
    from public.sales_daily group by 1,2,3 having count(*) > 1
  ) x;
  if n > 0 then
    raise exception 'Aborting: % duplicate sales_daily keys after repoint; inspect before merging', n;
  end if;
end $dupcheck$;

do $dupcheck2$
declare n bigint;
begin
  select count(*) into n from (
    select purchases_import_id, outlet_id, purchase_date, grn_number
    from public.purchases_daily group by 1,2,3,4 having count(*) > 1
  ) x;
  if n > 0 then
    raise exception 'Aborting: % duplicate purchases_daily keys after repoint; inspect before merging', n;
  end if;
end $dupcheck2$;

do $aliascheck$
declare n bigint;
begin
  select count(*) into n from (
    select created_by, source, alias from public.outlet_aliases
    group by 1,2,3 having count(*) > 1
  ) x;
  if n > 0 then
    raise exception 'Aborting: % duplicate alias keys; resolve manually', n;
  end if;
end $aliascheck$;

-- ============================================================
-- STEP 6. Delete the now-childless duplicates.
-- ============================================================
delete from public.outlets o
using outlet_survivor m
where o.id = m.drop_id;

do $post$
declare n bigint;
begin
  select count(*) into n from (
    select code from public.outlets group by code having count(*) <> 1
  ) x;
  if n > 0 then
    raise exception 'Aborting: % code(s) do not have exactly one row', n;
  end if;
end $post$;

-- ============================================================
-- STEP 7. Constraint swap: (created_by, code) -> global (code).
-- ============================================================
alter table public.outlets drop constraint outlets_created_by_code_key;
alter table public.outlets add constraint outlets_code_key unique (code);

do $codecheck$
declare n bigint;
begin
  select count(*) into n from public.outlets where code is null or btrim(code) = '';
  if n > 0 then
    raise exception 'code has % null/blank values; cannot enforce global uniqueness', n;
  end if;
end $codecheck$;

-- ============================================================
-- STEP 8. RLS: open INSERT + UPDATE to all authenticated users; keep DELETE
--         owner-scoped. Read policies are already global.
-- ============================================================

-- outlets
drop policy if exists "Owners manage outlets" on public.outlets;
create policy "Authenticated users insert outlets"
  on public.outlets for insert to authenticated with check (true);
create policy "Authenticated users update outlets"
  on public.outlets for update to authenticated using (true) with check (true);
create policy "Owners delete outlets"
  on public.outlets for delete to authenticated
  using (created_by = (select auth.uid()));

-- outlet_aliases
drop policy if exists "Owners manage outlet aliases" on public.outlet_aliases;
create policy "Authenticated users insert aliases"
  on public.outlet_aliases for insert to authenticated with check (true);
create policy "Authenticated users update aliases"
  on public.outlet_aliases for update to authenticated using (true) with check (true);

-- sales_imports
drop policy if exists "Owners manage sales imports" on public.sales_imports;
create policy "Authenticated users insert sales imports"
  on public.sales_imports for insert to authenticated with check (true);
create policy "Authenticated users update sales imports"
  on public.sales_imports for update to authenticated using (true) with check (true);

-- sales_daily
drop policy if exists "Owners manage sales totals" on public.sales_daily;
create policy "Authenticated users insert sales totals"
  on public.sales_daily for insert to authenticated
  with check (
    exists (select 1 from public.sales_imports i where i.id = sales_import_id)
    and exists (select 1 from public.outlets o where o.id = outlet_id)
  );
create policy "Authenticated users update sales totals"
  on public.sales_daily for update to authenticated using (true) with check (true);

-- purchases_imports
drop policy if exists "Owners manage purchase imports" on public.purchases_imports;
create policy "Authenticated users insert purchase imports"
  on public.purchases_imports for insert to authenticated with check (true);
create policy "Authenticated users update purchase imports"
  on public.purchases_imports for update to authenticated using (true) with check (true);

-- purchases_daily
drop policy if exists "Owners manage purchase totals" on public.purchases_daily;
create policy "Authenticated users insert purchase totals"
  on public.purchases_daily for insert to authenticated
  with check (
    exists (select 1 from public.purchases_imports i where i.id = purchases_import_id)
    and exists (select 1 from public.outlets o where o.id = outlet_id)
  );
create policy "Authenticated users update purchase totals"
  on public.purchases_daily for update to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
commit;
