-- Sprint 2 — import records and staging tables.
-- Run AFTER 2026-09-sprint1-scope-imports-to-org.sql. Safe to re-run.
--
-- The guide's import flow parses into staging first, so that what a source file
-- actually said survives independently of what the parser made of it. Until now
-- a row the parser skipped left no trace at all.
--
-- Column names kept from the existing table rather than renamed for cosmetics:
--   guide `original_filename` = `file_name`
--   guide `uploaded_at`       = `created_at`

begin;

-- ------------------------------------------------------- import provenance --

alter table public.sales_imports add column if not exists file_hash text;
alter table public.sales_imports add column if not exists parser_version text;
alter table public.sales_imports add column if not exists mapping_version text;
alter table public.sales_imports add column if not exists header_row_number integer;
alter table public.sales_imports add column if not exists source_sheet text;
alter table public.sales_imports add column if not exists status text not null default 'uploaded';
alter table public.sales_imports add column if not exists status_detail text;

do $status$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sales_imports_status_check'
      and conrelid = 'public.sales_imports'::regclass
  ) then
    alter table public.sales_imports add constraint sales_imports_status_check
      check (status in ('uploaded', 'parsing', 'needs_mapping', 'needs_review', 'validated', 'published', 'failed'));
  end if;
end
$status$;

-- The same workbook must not be imported twice into the same organization. A
-- failed import does not reserve its hash, so the file can be fixed and retried.
create unique index if not exists sales_imports_org_file_hash_idx
on public.sales_imports (organization_id, file_hash)
where file_hash is not null and status <> 'failed';

-- ---------------------------------------------------------- staging tables --

create table if not exists public.sales_import_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_import_id uuid not null references public.sales_imports(id) on delete cascade,
  source_sheet text,
  source_row_number integer not null,
  raw_row_json jsonb not null,
  normalized_row_json jsonb,
  -- Why this row produced no sales figure. Null when it did.
  skip_reason text,
  status text not null default 'staged'
    check (status in ('staged', 'valid', 'invalid', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (sales_import_id, source_sheet, source_row_number)
);

create index if not exists sales_import_rows_import_idx
on public.sales_import_rows (sales_import_id, status);

create table if not exists public.import_validation_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_import_id uuid not null references public.sales_imports(id) on delete cascade,
  sales_import_row_id uuid references public.sales_import_rows(id) on delete cascade,
  severity text not null check (severity in ('info', 'warning', 'error')),
  code text not null,
  message text not null,
  resolution text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists import_validation_issues_open_idx
on public.import_validation_issues (sales_import_id, severity)
where resolved_at is null;

create table if not exists public.import_column_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null check (source in ('pos', 'grab', 'foodpanda', 'shopee', 'apps')),
  source_header text not null,
  canonical_field text not null,
  mapping_version text not null,
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, source, mapping_version, source_header)
);

-- --------------------------------------------------------------------- RLS --

alter table public.sales_import_rows enable row level security;
alter table public.import_validation_issues enable row level security;
alter table public.import_column_mappings enable row level security;

drop policy if exists "Members read staged rows" on public.sales_import_rows;
create policy "Members read staged rows"
on public.sales_import_rows for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Preparers stage rows for their own import" on public.sales_import_rows;
create policy "Preparers stage rows for their own import"
on public.sales_import_rows for insert to authenticated
with check (
  public.has_org_role(organization_id, array['preparer', 'admin'])
  and exists (
    select 1 from public.sales_imports imports
    where imports.id = sales_import_id
      and imports.organization_id = sales_import_rows.organization_id
      and imports.uploaded_by = (select auth.uid())
  )
);

-- A reviewer marks a staged row valid or invalid; publishing is sprint 8.
drop policy if exists "Reviewers update staged rows" on public.sales_import_rows;
create policy "Reviewers update staged rows"
on public.sales_import_rows for update to authenticated
using (public.has_org_role(organization_id, array['reviewer', 'approver', 'admin']))
with check (public.has_org_role(organization_id, array['reviewer', 'approver', 'admin']));

drop policy if exists "Members read validation issues" on public.import_validation_issues;
create policy "Members read validation issues"
on public.import_validation_issues for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Preparers and reviewers manage validation issues" on public.import_validation_issues;
create policy "Preparers and reviewers manage validation issues"
on public.import_validation_issues for all to authenticated
using (public.has_org_role(organization_id, array['preparer', 'reviewer', 'approver', 'admin']))
with check (public.has_org_role(organization_id, array['preparer', 'reviewer', 'approver', 'admin']));

drop policy if exists "Members read column mappings" on public.import_column_mappings;
create policy "Members read column mappings"
on public.import_column_mappings for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Preparers and admins manage column mappings" on public.import_column_mappings;
create policy "Preparers and admins manage column mappings"
on public.import_column_mappings for all to authenticated
using (public.has_org_role(organization_id, array['preparer', 'admin']))
with check (public.has_org_role(organization_id, array['preparer', 'admin']));

-- Imports that predate this sprint were parsed straight into sales_daily with no
-- staging, so record them as published rather than implying a review that never
-- happened. `parser_version is null` is what identifies them: every import made
-- after this sprint records one, so a re-run cannot touch a live upload that is
-- legitimately sitting at 'uploaded'.
update public.sales_imports
set status = 'published'
where status = 'uploaded'
  and parser_version is null
  and exists (select 1 from public.sales_daily daily where daily.import_id = sales_imports.id);

commit;
