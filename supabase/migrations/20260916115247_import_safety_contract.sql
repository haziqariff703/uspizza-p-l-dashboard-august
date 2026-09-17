-- Executed and fixture-tested on S&L_Dashboard, 16 September 2026.
-- Production release still requires application/Auth/revision/concurrency acceptance.
-- Requires the six prerequisite files in supabase/README.md. This is a breaking
-- contract change: the old browser import flow must NOT be deployed with it.
begin;

-- Platform event-trigger helper is not an application RPC. Preserve the trigger,
-- but revoke client execution if this platform helper exists.
do $platform_helper$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$platform_helper$;

alter table public.sales_imports add column if not exists reporting_period_id uuid references public.reporting_periods(id);
alter table public.sales_imports add column if not exists supersedes_import_id uuid references public.sales_imports(id);
alter table public.sales_imports add column if not exists revision integer not null default 1;
alter table public.sales_imports add column if not exists is_current boolean not null default false;
alter table public.sales_imports add column if not exists approved_by uuid references auth.users(id);
alter table public.sales_imports add column if not exists approved_at timestamptz;
alter table public.sales_imports drop constraint if exists sales_imports_status_check;
alter table public.sales_imports add constraint sales_imports_status_check
  check (status in ('uploaded','parsing','needs_mapping','needs_review','validated','published','failed','rejected'));

-- Same bytes can be reprocessed with a genuinely new parser/mapping version.
drop index if exists public.sales_imports_org_file_hash_idx;
create unique index sales_imports_org_file_hash_idx
on public.sales_imports (organization_id, reporting_month, source, file_hash, parser_version, mapping_version)
where file_hash is not null and status not in ('failed','rejected');

alter table public.sales_import_rows add column if not exists outlet_id uuid;
alter table public.sales_import_rows add column if not exists source_record_key text;
alter table public.sales_import_rows add column if not exists review_note text;
alter table public.sales_import_rows add column if not exists reviewed_by uuid references auth.users(id);
alter table public.sales_import_rows add column if not exists reviewed_at timestamptz;
alter table public.sales_daily add column if not exists outlet_id uuid;

do $fk$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.sales_import_rows'::regclass and conname = 'staged_outlet_org_fk') then
    alter table public.sales_import_rows add constraint staged_outlet_org_fk foreign key (outlet_id, organization_id)
      references public.outlets(id, organization_id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.sales_daily'::regclass and conname = 'daily_outlet_org_fk') then
    alter table public.sales_daily add constraint daily_outlet_org_fk foreign key (outlet_id, organization_id)
      references public.outlets(id, organization_id);
  end if;
end
$fk$;

create table if not exists public.published_source_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  sales_import_id uuid not null references public.sales_imports(id),
  sales_import_row_id uuid not null references public.sales_import_rows(id),
  outlet_id uuid not null,
  source text not null,
  source_record_key text not null,
  is_current boolean not null default true,
  foreign key (outlet_id, organization_id) references public.outlets(id, organization_id),
  unique (sales_import_row_id)
);
create unique index if not exists published_source_records_current_key_idx
on public.published_source_records (organization_id, outlet_id, source, source_record_key) where is_current;
create index if not exists published_source_records_import_idx on public.published_source_records(sales_import_id);

create table if not exists public.sales_fee_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  sales_import_id uuid not null references public.sales_imports(id),
  sales_daily_id uuid not null references public.sales_daily(id),
  sales_import_row_id uuid not null references public.sales_import_rows(id),
  line_number integer not null,
  fee_type text not null check (fee_type in ('commission','payment_processing','delivery','service','marketing','voucher_subsidy','refund_adjustment','tax','other','unclassified')),
  amount numeric(14,2),
  tax_amount numeric(14,2),
  source_label text not null,
  unique (sales_import_row_id, line_number)
);

create table if not exists public.import_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  sales_import_id uuid not null references public.sales_imports(id),
  actor_id uuid not null references auth.users(id),
  event_type text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists import_audit_events_import_idx on public.import_audit_events(sales_import_id, created_at);

create table if not exists public.reporting_period_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  reporting_period_id uuid not null references public.reporting_periods(id),
  actor_id uuid not null references auth.users(id),
  from_status text not null,
  to_status text not null,
  note text not null,
  created_at timestamptz not null default now()
);

-- Consistent locking order: organization -> import -> period. Serializes
-- publication/period closure and prevents a second publication racing the first.
create or replace function app_private.lock_sales_import(p_import uuid, p_roles text[])
returns public.sales_imports language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports; p public.reporting_periods; org uuid;
begin
  select organization_id into org from public.sales_imports where id = p_import;
  if auth.uid() is null or not app_private.has_org_role(org,p_roles) then
    raise exception 'Import access denied.' using errcode = '42501';
  end if;
  perform 1 from public.organizations where id = org for update;
  select * into strict i from public.sales_imports where id = p_import for update;
  select * into p from public.reporting_periods where id = i.reporting_period_id for update;
  if p.id is null or p.organization_id <> org or (p.status <> 'open' and not (i.status = 'published' and i.is_current))
     or i.reporting_month < p.start_date
     or (i.reporting_month + interval '1 month - 1 day')::date > p.end_date then
    raise exception 'Import requires an open reporting period covering the whole reporting month.';
  end if;
  return i;
end
$fn$;

-- Monetary JSON contract: missing key = not applicable contribution; explicit
-- null = applicable but unknown. Non-numeric content must never become zero.
create or replace function app_private.sales_amount(p_row jsonb, p_key text)
returns numeric language plpgsql immutable security invoker set search_path = '' as $fn$
declare v text; result numeric;
begin
  if not (p_row ? p_key) or p_row -> p_key = 'null'::jsonb then return null; end if;
  v := p_row ->> p_key;
  if jsonb_typeof(p_row -> p_key) not in ('number','string') or v !~ '^-?[0-9]+(\.[0-9]+)?$' then
    raise exception 'Malformed monetary value in %.',p_key;
  end if;
  result := v::numeric;
  if abs(result) >= 1000000000000 then raise exception 'Monetary value out of range in %.',p_key; end if;
  return result;
end
$fn$;

create or replace function app_private.guard_import_insert()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare p public.reporting_periods;
begin
  if auth.uid() is null or new.uploaded_by <> auth.uid()
    or not app_private.has_org_role(new.organization_id,array['preparer','admin']) then
    raise exception 'Only an authorized preparer/admin can create an import.' using errcode = '42501';
  end if;
  perform 1 from public.organizations where id = new.organization_id for update;
  select * into p from public.reporting_periods where id = new.reporting_period_id for update;
  if p.id is null or p.organization_id <> new.organization_id or p.status <> 'open'
    or new.reporting_month < p.start_date or (new.reporting_month + interval '1 month - 1 day')::date > p.end_date then
    raise exception 'Select an open reporting period covering this month.';
  end if;
  if new.status not in ('uploaded','parsing') or new.is_current or new.approved_by is not null
    or new.approved_at is not null or new.revision <> 1 then raise exception 'Import must begin unpublished.'; end if;
  if new.file_hash is null or new.file_hash !~ '^[0-9a-f]{64}$'
    or nullif(btrim(new.parser_version),'') is null or nullif(btrim(new.mapping_version),'') is null then
    raise exception 'File SHA-256 and parser/mapping versions are required.';
  end if;
  if new.storage_path not like new.organization_id::text || '/' || new.id::text || '/%'
     or cardinality(string_to_array(new.storage_path,'/')) <> 3
     or nullif(split_part(new.storage_path,'/',3),'') is null then
    raise exception 'Storage path must be organization_id/import_id/filename.';
  end if;
  return new;
end
$fn$;
drop trigger if exists sales_imports_guard_insert on public.sales_imports;
create trigger sales_imports_guard_insert before insert on public.sales_imports
for each row execute function app_private.guard_import_insert();

create or replace function app_private.guard_staged_row()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports;
begin
  i := app_private.lock_sales_import(new.sales_import_id,array['preparer','reviewer','approver','admin']);
  if i.organization_id <> new.organization_id then raise exception 'Staged row organization differs from its import.'; end if;
  if tg_op = 'INSERT' then
    if i.status not in ('uploaded','parsing') or i.uploaded_by <> auth.uid()
      or not app_private.has_org_role(i.organization_id,array['preparer','admin'])
      or new.status not in ('staged','valid','invalid') or new.reviewed_by is not null
      or new.reviewed_at is not null or new.review_note is not null then
      raise exception 'Import is not accepting staged rows.';
    end if;
    if nullif(btrim(new.source_sheet),'') is null or new.source_row_number < 1 then
      raise exception 'Sheet name and positive source-row number are required.';
    end if;
  else
    if i.status <> 'needs_review' then raise exception 'Import is not under review.'; end if;
    if (new.id,new.organization_id,new.sales_import_id,new.source_sheet,new.source_row_number,new.raw_row_json,
        new.normalized_row_json,new.skip_reason,new.source_record_key,new.created_at)
      is distinct from (old.id,old.organization_id,old.sales_import_id,old.source_sheet,old.source_row_number,old.raw_row_json,
        old.normalized_row_json,old.skip_reason,old.source_record_key,old.created_at) then
      raise exception 'Source provenance and parser output are immutable; re-import corrected data.';
    end if;
  end if;
  return new;
end
$fn$;
drop trigger if exists sales_import_rows_guard on public.sales_import_rows;
create trigger sales_import_rows_guard before insert or update on public.sales_import_rows
for each row execute function app_private.guard_staged_row();

create or replace function app_private.guard_issue()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports;
begin
  i := app_private.lock_sales_import(new.sales_import_id,array['preparer','reviewer','approver','admin']);
  if i.organization_id <> new.organization_id or i.status not in ('uploaded','parsing','needs_review') then
    raise exception 'Issue must belong to an editable import in the same organization.';
  end if;
  if new.sales_import_row_id is not null and not exists (select 1 from public.sales_import_rows
    where id = new.sales_import_row_id and sales_import_id = new.sales_import_id and organization_id = new.organization_id) then
    raise exception 'Issue row differs from its import.';
  end if;
  if tg_op = 'INSERT' and (new.resolved_at is not null or new.resolved_by is not null or new.resolution is not null) then
    raise exception 'New issues must be unresolved.';
  end if;
  return new;
end
$fn$;
drop trigger if exists import_validation_issues_guard on public.import_validation_issues;
create trigger import_validation_issues_guard before insert or update on public.import_validation_issues
for each row execute function app_private.guard_issue();

create or replace function app_private.guard_period()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  perform 1 from public.organizations where id = new.organization_id for update;
  if tg_op = 'UPDATE' and (new.id,new.organization_id,new.start_date,new.end_date,new.created_at)
    is distinct from (old.id,old.organization_id,old.start_date,old.end_date,old.created_at) then
    raise exception 'Period identity and boundaries are immutable; create a new period.';
  end if;
  if exists (select 1 from public.reporting_periods p where p.organization_id = new.organization_id
    and p.id <> new.id and p.start_date <= new.end_date and p.end_date >= new.start_date) then
    raise exception 'Reporting periods cannot overlap.';
  end if;
  return new;
end
$fn$;
drop trigger if exists reporting_periods_guard on public.reporting_periods;
create trigger reporting_periods_guard before insert or update on public.reporting_periods
for each row execute function app_private.guard_period();

create or replace function app_private.guard_membership()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  perform 1 from public.organizations where id = old.organization_id for update;
  if tg_op = 'UPDATE' and (new.id,new.organization_id,new.user_id,new.created_at)
    is distinct from (old.id,old.organization_id,old.user_id,old.created_at) then
    raise exception 'Membership identity is immutable.';
  end if;
  if old.role = 'admin' and old.status = 'active' then
    if tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active' then
      if not exists (select 1 from public.organization_members m where m.organization_id = old.organization_id
        and m.id <> old.id and m.role = 'admin' and m.status = 'active') then
        raise exception 'The last active admin cannot be removed, demoted or suspended.';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$fn$;
drop trigger if exists organization_members_guard on public.organization_members;
create trigger organization_members_guard before update or delete on public.organization_members
for each row execute function app_private.guard_membership();

create or replace function app_private.set_reporting_period_status(p_period uuid,p_status text,p_note text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare p public.reporting_periods; org uuid;
begin
  select organization_id into org from public.reporting_periods where id = p_period;
  if auth.uid() is null or not app_private.has_org_role(org,array['approver','admin']) then
    raise exception 'Only an approver/admin can change period status.' using errcode = '42501';
  end if;
  perform 1 from public.organizations where id = org for update;
  select * into strict p from public.reporting_periods where id = p_period for update;
  if p_status is null or p_status not in ('open','under_review','closed') or nullif(btrim(p_note),'') is null then
    raise exception 'A valid period status and reason are required.';
  end if;
  if p.status = 'closed' and p_status <> 'closed' and not app_private.has_org_role(org,array['admin']) then
    raise exception 'Only an admin may reopen a closed period.' using errcode = '42501';
  end if;
  if p_status = 'closed' and exists (select 1 from public.sales_imports where reporting_period_id = p.id
    and status not in ('published','failed','rejected')) then
    raise exception 'Resolve or reject pending imports before closing the period.';
  end if;
  update public.reporting_periods set status = p_status where id = p.id;
  insert into public.reporting_period_events(organization_id,reporting_period_id,actor_id,from_status,to_status,note)
    values(org,p.id,auth.uid(),p.status,p_status,p_note);
end
$fn$;

create or replace function app_private.set_sales_import_status(p_import uuid,p_status text,p_detail text default null)
returns void language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports;
begin
  i := app_private.lock_sales_import(p_import,array['preparer','admin']);
  if i.uploaded_by <> auth.uid() or i.status not in ('uploaded','parsing','needs_mapping','failed')
    or p_status is null or p_status not in ('parsing','needs_mapping','failed') then raise exception 'Invalid preparer status transition.'; end if;
  if i.status = 'failed' and p_status <> 'failed' then raise exception 'Create a new import to retry failed staging.'; end if;
  update public.sales_imports set status = p_status,status_detail = left(p_detail,500) where id = p_import;
  insert into public.import_audit_events(organization_id,sales_import_id,actor_id,event_type,detail)
    values(i.organization_id,p_import,auth.uid(),'status_changed',jsonb_build_object('from',i.status,'to',p_status,'note',p_detail));
end
$fn$;

create or replace function app_private.submit_sales_import(p_import uuid,p_expected_rows integer)
returns void language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports;
begin
  i := app_private.lock_sales_import(p_import,array['preparer','admin']);
  if i.uploaded_by <> auth.uid() or i.status not in ('uploaded','parsing') then raise exception 'Import cannot be submitted.'; end if;
  if p_expected_rows is null or p_expected_rows < 1 or
    (select count(*) from public.sales_import_rows where sales_import_id = p_import) <> p_expected_rows then
    raise exception 'Staging is incomplete; row count does not match.';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'sales-imports' and name = i.storage_path) then
    raise exception 'Original file has not been uploaded.';
  end if;
  update public.sales_imports set status = 'needs_review',row_count = p_expected_rows,status_detail = null where id = p_import;
  insert into public.import_audit_events(organization_id,sales_import_id,actor_id,event_type)
    values(i.organization_id,p_import,auth.uid(),'submitted');
end
$fn$;

create or replace function app_private.review_sales_import_rows(p_import uuid,p_rows uuid[],p_decision text,p_outlet uuid,p_note text)
returns integer language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports; changed integer;
begin
  i := app_private.lock_sales_import(p_import,array['reviewer','approver','admin']);
  if i.uploaded_by = auth.uid() then raise exception 'Uploader cannot review their own import.'; end if;
  if i.status <> 'needs_review' or p_decision is null or p_decision not in ('approved','rejected')
    or nullif(btrim(p_note),'') is null or coalesce(cardinality(p_rows),0) not between 1 and 500 then
    raise exception 'Review requires 1-500 rows, a decision and a note.';
  end if;
  if p_outlet is not null and not exists (select 1 from public.outlets where id = p_outlet and organization_id = i.organization_id) then
    raise exception 'Outlet does not belong to this organization.';
  end if;
  if (select count(*) from public.sales_import_rows where sales_import_id = p_import and id = any(p_rows)) <> cardinality(p_rows) then
    raise exception 'Review contains duplicate, unknown or foreign rows.';
  end if;
  if p_decision = 'approved' and exists (select 1 from public.sales_import_rows where id = any(p_rows)
    and (normalized_row_json is null or coalesce(p_outlet,outlet_id) is null or nullif(btrim(source_record_key),'') is null)) then
    raise exception 'Approval requires normalized data, a canonical outlet and stable source-record key.';
  end if;
  update public.sales_import_rows set status = p_decision,outlet_id = coalesce(p_outlet,outlet_id),
    review_note = p_note,reviewed_by = auth.uid(),reviewed_at = now() where sales_import_id = p_import and id = any(p_rows);
  get diagnostics changed = row_count;
  insert into public.import_audit_events(organization_id,sales_import_id,actor_id,event_type,detail)
    values(i.organization_id,p_import,auth.uid(),'rows_reviewed',jsonb_build_object('rows',p_rows,'decision',p_decision,'outlet',p_outlet,'note',p_note));
  return changed;
end
$fn$;

create or replace function app_private.resolve_sales_import_issue(p_issue uuid,p_note text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports; issue public.import_validation_issues;
begin
  select * into strict issue from public.import_validation_issues where id = p_issue;
  i := app_private.lock_sales_import(issue.sales_import_id,array['reviewer','approver','admin']);
  if i.uploaded_by = auth.uid() or i.status <> 'needs_review' or nullif(btrim(p_note),'') is null then
    raise exception 'An independent reviewer and resolution note are required.';
  end if;
  update public.import_validation_issues set resolution = p_note,resolved_by = auth.uid(),resolved_at = now() where id = p_issue;
  insert into public.import_audit_events(organization_id,sales_import_id,actor_id,event_type,detail)
    values(i.organization_id,i.id,auth.uid(),'issue_resolved',jsonb_build_object('issue',p_issue,'note',p_note));
end
$fn$;

create or replace function app_private.reject_sales_import(p_import uuid,p_note text)
returns void language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports;
begin
  i := app_private.lock_sales_import(p_import,array['reviewer','approver','admin']);
  if i.uploaded_by = auth.uid() or i.status <> 'needs_review' or nullif(btrim(p_note),'') is null then
    raise exception 'An independent reviewer and rejection note are required.';
  end if;
  update public.sales_imports set status = 'rejected',status_detail = left(p_note,500) where id = p_import;
  insert into public.import_audit_events(organization_id,sales_import_id,actor_id,event_type,detail)
    values(i.organization_id,p_import,auth.uid(),'rejected',jsonb_build_object('note',p_note));
end
$fn$;

create or replace function app_private.publish_sales_import(p_import uuid)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare i public.sales_imports; previous public.sales_imports; r record; k text; daily_count integer;
begin
  i := app_private.lock_sales_import(p_import,array['approver','admin']);
  if i.status = 'published' and i.is_current then
    return jsonb_build_object('importId',i.id,'status','published','revision',i.revision,
      'dailyRows',(select count(*) from public.sales_daily where import_id = i.id));
  end if;
  if i.uploaded_by = auth.uid() or i.status <> 'needs_review' then raise exception 'Only an independent approver can publish a reviewed import.'; end if;
  if (select count(*) from public.sales_import_rows where sales_import_id = i.id) <> i.row_count then raise exception 'Staging count changed.'; end if;
  if exists (select 1 from public.import_validation_issues where sales_import_id = i.id and resolved_at is null) then
    raise exception 'All validation issues require recorded resolution before publication.';
  end if;
  if exists (select 1 from public.sales_import_rows where sales_import_id = i.id and
    (status not in ('approved','rejected') or reviewed_by is null or reviewed_by = i.uploaded_by or review_note is null)) then
    raise exception 'Every source row requires an independent approval or documented rejection.';
  end if;
  if not exists (select 1 from public.sales_import_rows where sales_import_id = i.id and status = 'approved') then
    raise exception 'Import has no approved financial rows.';
  end if;
  for r in select * from public.sales_import_rows where sales_import_id = i.id and status = 'approved' loop
    if r.outlet_id is null or nullif(btrim(r.source_record_key),'') is null
      or r.source_record_key <> btrim(r.source_record_key) or length(r.source_record_key) > 512
      or jsonb_typeof(r.normalized_row_json) <> 'object'
      or coalesce(r.normalized_row_json->>'salesDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or coalesce(lower(r.normalized_row_json->>'source'),'') <> i.source then
      raise exception 'Invalid normalized identity at source row %.',r.source_row_number;
    end if;
    if not (r.normalized_row_json ?| array['grossSales','discount','netSales','tax','serviceCharge','platformFees','advertisingSpend','payout']) then
      raise exception 'Source row % has no financial contribution.',r.source_row_number;
    end if;
    if to_char((r.normalized_row_json->>'salesDate')::date,'YYYY-MM-DD') <> r.normalized_row_json->>'salesDate'
      or (r.normalized_row_json->>'salesDate')::date < i.reporting_month
      or (r.normalized_row_json->>'salesDate')::date >= (i.reporting_month + interval '1 month')::date then
      raise exception 'Source row % has an invalid/out-of-period date.',r.source_row_number;
    end if;
    foreach k in array array['grossSales','discount','netSales','tax','serviceCharge','platformFees','advertisingSpend','payout'] loop
      perform app_private.sales_amount(r.normalized_row_json,k);
    end loop;
    if r.normalized_row_json ? 'feeLines' and jsonb_typeof(r.normalized_row_json->'feeLines') <> 'array' then
      raise exception 'feeLines must be an array at source row %.',r.source_row_number;
    end if;
  end loop;
  if exists (select 1 from public.sales_daily where import_id = i.id) then
    raise exception 'Import already has legacy/partial totals; create a replacement import.';
  end if;
  if i.supersedes_import_id is not null then
    select * into previous from public.sales_imports where id = i.supersedes_import_id for update;
    if previous.id is null or previous.organization_id <> i.organization_id or previous.reporting_month <> i.reporting_month
      or previous.source <> i.source or previous.status <> 'published' or not previous.is_current then
      raise exception 'Replacement must target a current published import in the same organization/month/source.';
    end if;
    update public.sales_imports set is_current = false where id = previous.id;
    update public.published_source_records set is_current = false where sales_import_id = previous.id;
    i.revision := previous.revision + 1;
  end if;

  -- The unique current key catches overlaps within this file AND re-edited files.
  insert into public.published_source_records(organization_id,sales_import_id,sales_import_row_id,outlet_id,source,source_record_key)
    select i.organization_id,i.id,id,outlet_id,i.source,source_record_key from public.sales_import_rows
    where sales_import_id = i.id and status = 'approved';

  -- Aggregate exact numerics; explicit unknown contributors propagate to NULL.
  with approved as (
    select outlet_id,(normalized_row_json->>'salesDate')::date as d,normalized_row_json as j
    from public.sales_import_rows where sales_import_id = i.id and status = 'approved'
  ), values_by_field as (
    select a.outlet_id,a.d,f.key,count(*) filter(where a.j ? f.key) as applicable,
      count(app_private.sales_amount(a.j,f.key)) as known,sum(app_private.sales_amount(a.j,f.key)) as total
    from approved a cross join unnest(array['grossSales','discount','netSales','tax','serviceCharge','platformFees','advertisingSpend','payout']) as f(key)
    group by a.outlet_id,a.d,f.key
  ), totals as (
    select outlet_id,d,jsonb_object_agg(key,case when applicable > 0 and applicable = known then to_jsonb(total) else 'null'::jsonb end) as j
    from values_by_field group by outlet_id,d
  )
  insert into public.sales_daily(import_id,organization_id,reporting_month,sales_date,outlet_id,outlet_name,source,
    gross_sales,discount,net_sales,tax,service_charge,platform_fees,advertising_spend,payout,record_count)
    select i.id,i.organization_id,i.reporting_month,t.d,t.outlet_id,o.name,i.source,
      (t.j->>'grossSales')::numeric,(t.j->>'discount')::numeric,(t.j->>'netSales')::numeric,(t.j->>'tax')::numeric,
      (t.j->>'serviceCharge')::numeric,(t.j->>'platformFees')::numeric,(t.j->>'advertisingSpend')::numeric,(t.j->>'payout')::numeric,
      (select count(*) from approved a where a.outlet_id = t.outlet_id and a.d = t.d)
    from totals t join public.outlets o on o.id = t.outlet_id and o.organization_id = i.organization_id;
  get diagnostics daily_count = row_count;

  insert into public.sales_fee_lines(organization_id,sales_import_id,sales_daily_id,sales_import_row_id,line_number,fee_type,amount,tax_amount,source_label)
    select i.organization_id,i.id,d.id,fee_row.id,f.n::integer,f.j->>'feeType',
      app_private.sales_amount(f.j,'amount'),app_private.sales_amount(f.j,'taxAmount'),nullif(btrim(f.j->>'sourceLabel'),'')
    from public.sales_import_rows fee_row
    cross join lateral jsonb_array_elements(coalesce(fee_row.normalized_row_json->'feeLines','[]'::jsonb)) with ordinality as f(j,n)
    join public.sales_daily d on d.import_id = i.id and d.outlet_id = fee_row.outlet_id and d.sales_date = (fee_row.normalized_row_json->>'salesDate')::date
    where fee_row.sales_import_id = i.id and fee_row.status = 'approved';

  update public.sales_imports set status = 'published',is_current = true,revision = i.revision,
    approved_by = auth.uid(),approved_at = now(),status_detail = null where id = i.id;
  insert into public.import_audit_events(organization_id,sales_import_id,actor_id,event_type,detail)
    values(i.organization_id,i.id,auth.uid(),'published',jsonb_build_object('dailyRows',daily_count,'revision',i.revision,'supersedes',i.supersedes_import_id));
  return jsonb_build_object('importId',i.id,'status','published','revision',i.revision,'dailyRows',daily_count);
end
$fn$;

-- Invoker API wrappers, explicit grants, no privileged public API functions.
create or replace function public.sales_import_contract_version()
returns text language sql immutable security invoker set search_path = '' as $fn$ select '2026-09-16-v1'::text; $fn$;
revoke all on function public.sales_import_contract_version() from public,anon;
grant execute on function public.sales_import_contract_version() to authenticated;
create or replace function public.set_sales_import_status(p_import uuid,p_status text,p_detail text default null)
returns void language sql security invoker set search_path = '' as $fn$ select app_private.set_sales_import_status(p_import,p_status,p_detail); $fn$;
create or replace function public.submit_sales_import(p_import uuid,p_expected_rows integer)
returns void language sql security invoker set search_path = '' as $fn$ select app_private.submit_sales_import(p_import,p_expected_rows); $fn$;
create or replace function public.review_sales_import_rows(p_import uuid,p_rows uuid[],p_decision text,p_outlet uuid,p_note text)
returns integer language sql security invoker set search_path = '' as $fn$ select app_private.review_sales_import_rows(p_import,p_rows,p_decision,p_outlet,p_note); $fn$;
create or replace function public.resolve_sales_import_issue(p_issue uuid,p_note text)
returns void language sql security invoker set search_path = '' as $fn$ select app_private.resolve_sales_import_issue(p_issue,p_note); $fn$;
create or replace function public.reject_sales_import(p_import uuid,p_note text)
returns void language sql security invoker set search_path = '' as $fn$ select app_private.reject_sales_import(p_import,p_note); $fn$;
create or replace function public.publish_sales_import(p_import uuid)
returns jsonb language sql security invoker set search_path = '' as $fn$ select app_private.publish_sales_import(p_import); $fn$;
create or replace function public.set_reporting_period_status(p_period uuid,p_status text,p_note text)
returns void language sql security invoker set search_path = '' as $fn$ select app_private.set_reporting_period_status(p_period,p_status,p_note); $fn$;

revoke all on function app_private.lock_sales_import(uuid,text[]),app_private.sales_amount(jsonb,text),
 app_private.guard_import_insert(),app_private.guard_staged_row(),app_private.guard_issue(),app_private.guard_period(),app_private.guard_membership()
 from public,anon,authenticated;
revoke all on function app_private.set_sales_import_status(uuid,text,text),app_private.submit_sales_import(uuid,integer),
 app_private.review_sales_import_rows(uuid,uuid[],text,uuid,text),app_private.resolve_sales_import_issue(uuid,text),
 app_private.reject_sales_import(uuid,text),app_private.publish_sales_import(uuid),app_private.set_reporting_period_status(uuid,text,text) from public,anon,authenticated;
grant execute on function app_private.set_sales_import_status(uuid,text,text),app_private.submit_sales_import(uuid,integer),
 app_private.review_sales_import_rows(uuid,uuid[],text,uuid,text),app_private.resolve_sales_import_issue(uuid,text),
 app_private.reject_sales_import(uuid,text),app_private.publish_sales_import(uuid),app_private.set_reporting_period_status(uuid,text,text) to authenticated;
revoke all on function public.set_sales_import_status(uuid,text,text),public.submit_sales_import(uuid,integer),
 public.review_sales_import_rows(uuid,uuid[],text,uuid,text),public.resolve_sales_import_issue(uuid,text),
 public.reject_sales_import(uuid,text),public.publish_sales_import(uuid),public.set_reporting_period_status(uuid,text,text) from public,anon;
grant execute on function public.set_sales_import_status(uuid,text,text),public.submit_sales_import(uuid,integer),
 public.review_sales_import_rows(uuid,uuid[],text,uuid,text),public.resolve_sales_import_issue(uuid,text),
 public.reject_sales_import(uuid,text),public.publish_sales_import(uuid),public.set_reporting_period_status(uuid,text,text) to authenticated;

-- Explicit least-privilege table access. Policies remain a second boundary.
revoke all on public.organizations,public.organization_members,public.organization_invitations,public.outlets,
 public.outlet_aliases,public.reporting_periods,public.sales_imports,public.sales_import_rows,public.import_validation_issues,
 public.import_column_mappings,public.sales_daily,public.published_source_records,public.sales_fee_lines,public.import_audit_events,public.reporting_period_events
 from public,anon,authenticated;
grant select on public.organizations,public.organization_members,public.organization_invitations,public.outlets,
 public.outlet_aliases,public.reporting_periods,public.sales_imports,public.sales_import_rows,public.import_validation_issues,
 public.import_column_mappings,public.sales_daily,public.published_source_records,public.sales_fee_lines,public.import_audit_events,public.reporting_period_events to authenticated;
grant insert,update,delete on public.organization_members,public.organization_invitations,public.outlets,
 public.outlet_aliases,public.import_column_mappings to authenticated;
grant update(name) on public.organizations to authenticated;
grant insert on public.reporting_periods,public.sales_imports,public.sales_import_rows,public.import_validation_issues to authenticated;
grant update(source_sheet,header_row_number) on public.sales_imports to authenticated;

drop policy if exists "Preparers edit import metadata" on public.sales_imports;
create policy "Preparers edit import metadata" on public.sales_imports for update to authenticated
using (app_private.has_org_role(organization_id,array['preparer','admin']) and uploaded_by = auth.uid() and status in ('uploaded','parsing'))
with check (app_private.has_org_role(organization_id,array['preparer','admin']) and uploaded_by = auth.uid() and status in ('uploaded','parsing'));
drop policy if exists "Preparers add processed sales to their own import" on public.sales_daily;
drop policy if exists "Members read their organization sales" on public.sales_daily;
create policy "Members read their organization sales" on public.sales_daily for select to authenticated
using (app_private.is_org_member(organization_id) and exists (select 1 from public.sales_imports i
  where i.id = import_id and i.organization_id = sales_daily.organization_id and i.status = 'published' and i.is_current));

alter table public.published_source_records enable row level security;
alter table public.sales_fee_lines enable row level security;
alter table public.import_audit_events enable row level security;
alter table public.reporting_period_events enable row level security;
drop policy if exists "Members read period history" on public.reporting_period_events;
create policy "Members read period history" on public.reporting_period_events for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists "Members read source ledger" on public.published_source_records;
create policy "Members read source ledger" on public.published_source_records for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists "Members read audit history" on public.import_audit_events;
create policy "Members read audit history" on public.import_audit_events for select to authenticated using (app_private.is_org_member(organization_id));
drop policy if exists "Members read current published fee lines" on public.sales_fee_lines;
create policy "Members read current published fee lines" on public.sales_fee_lines for select to authenticated
using (app_private.is_org_member(organization_id) and exists (select 1 from public.sales_imports i
  where i.id = sales_import_id and i.status = 'published' and i.is_current));

drop policy if exists "Members upload sales import files under their own id" on storage.objects;
create policy "Members upload sales import files under their own id" on storage.objects for insert to authenticated
with check (bucket_id = 'sales-imports' and exists (select 1 from public.sales_imports i where i.storage_path = name
  and i.uploaded_by = auth.uid() and i.status in ('uploaded','parsing')
  and app_private.has_org_role(i.organization_id,array['preparer','admin'])));

-- Original legacy totals are retained but intentionally not current/approved.
-- Re-import rather than silently certifying prior zero-filled figures.
notify pgrst, 'reload schema';
commit;
