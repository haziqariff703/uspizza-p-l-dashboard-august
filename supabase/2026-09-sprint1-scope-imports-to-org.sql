-- Sprint 1, part 2 — move imports and processed sales onto organization
-- membership. Run AFTER 2026-09-sprint1-organizations.sql. Safe to re-run.
--
-- Existing imports require an explicit Finance-approved ownership manifest in
-- backfill_assignments below. No organization is inferred and no user is promoted.
-- First create the target organizations with a nominated created_by in SQL
-- (the creator trigger grants that nominated owner admin). Add other members
-- separately with approved roles. Unassigned legacy imports abort this file.

begin;

alter table public.sales_imports add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.sales_daily   add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

do $backfill$
declare
  backfill_assignments constant jsonb := '[]';
  -- Example: [{"import_id":"uuid", "organization_id":"uuid"}]
begin
  if not exists (select 1 from public.sales_imports where organization_id is null) then
    return;
  end if;

  if exists (select 1 from jsonb_to_recordset(backfill_assignments) as a(import_id uuid, organization_id uuid)
    group by import_id having count(*) > 1) then
    raise exception 'Ownership manifest contains duplicate import ids.';
  end if;
  if exists (select 1 from jsonb_to_recordset(backfill_assignments) as a(import_id uuid, organization_id uuid)
    left join public.sales_imports i on i.id = a.import_id
    left join public.organizations o on o.id = a.organization_id
    where i.id is null or o.id is null or (i.organization_id is not null and i.organization_id <> a.organization_id)) then
    raise exception 'Ownership manifest has an unknown import/org or attempts to reassign an existing import.';
  end if;
  update public.sales_imports i set organization_id = a.organization_id
  from jsonb_to_recordset(backfill_assignments) as a(import_id uuid, organization_id uuid)
  where i.id = a.import_id and i.organization_id is null;
  if exists (select 1 from public.sales_imports where organization_id is null) then
    raise exception 'Supply Finance-approved backfill_assignments for every legacy import before running this migration.';
  end if;
end
$backfill$;

-- Processed sales always belong to the organization of their import.
update public.sales_daily daily
set organization_id = imports.organization_id
from public.sales_imports imports
where imports.id = daily.import_id and daily.organization_id is distinct from imports.organization_id;

alter table public.sales_imports alter column organization_id set not null;
alter table public.sales_daily   alter column organization_id set not null;

create index if not exists sales_imports_org_idx on public.sales_imports (organization_id, reporting_month);
create index if not exists sales_daily_org_month_idx on public.sales_daily (organization_id, reporting_month);

-- ------------------------------------------------------------- new policies --
-- Never restore bootstrap policies over the hardened publication contract.
do $bootstrap_policies$
begin
  if to_regprocedure('public.sales_import_contract_version()') is not null then
    return;
  end if;
-- Replaces "you can see exactly what you uploaded" with "you can see what your
-- organization uploaded". Uploading is a preparer/admin action per the guide.

drop policy if exists "Authenticated users can read sales imports" on public.sales_imports;
drop policy if exists "Authenticated users can create their sales imports" on public.sales_imports;

drop policy if exists "Members read their organization imports" on public.sales_imports;
create policy "Members read their organization imports"
on public.sales_imports for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Preparers record an import" on public.sales_imports;
create policy "Preparers record an import"
on public.sales_imports for insert to authenticated
with check (
  public.has_org_role(organization_id, array['preparer', 'admin'])
  and uploaded_by = (select auth.uid())
);

drop policy if exists "Authenticated users can read processed sales" on public.sales_daily;
drop policy if exists "Import owner can add processed sales" on public.sales_daily;

drop policy if exists "Members read their organization sales" on public.sales_daily;
create policy "Members read their organization sales"
on public.sales_daily for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Preparers add processed sales to their own import" on public.sales_daily;
create policy "Preparers add processed sales to their own import"
on public.sales_daily for insert to authenticated
with check (
  public.has_org_role(organization_id, array['preparer', 'admin'])
  and exists (
    select 1 from public.sales_imports imports
    where imports.id = import_id
      and imports.organization_id = sales_daily.organization_id
      and imports.uploaded_by = (select auth.uid())
  )
);

-- File access follows the owning import, including recorded legacy paths.
-- The app must create the import record before uploading its original file.
drop policy if exists "Authenticated users can view sales import files" on storage.objects;
drop policy if exists "Authenticated users can upload their sales import files" on storage.objects;

drop policy if exists "Organization members view sales import files" on storage.objects;
create policy "Organization members view sales import files"
on storage.objects for select to authenticated
using (
  bucket_id = 'sales-imports'
  and exists (select 1 from public.sales_imports i
    where i.storage_path = name and public.is_org_member(i.organization_id))
);

drop policy if exists "Members upload sales import files under their own id" on storage.objects;
create policy "Members upload sales import files under their own id"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'sales-imports'
  and exists (select 1 from public.sales_imports i where i.storage_path = name
    and i.uploaded_by = (select auth.uid())
    and public.has_org_role(i.organization_id, array['preparer', 'admin']))
);

end
$bootstrap_policies$;

commit;
