-- Run this once in Supabase Dashboard → SQL Editor before using Import Sales.
-- The policies require a signed-in user; do not expose uploads to anonymous users.

create table if not exists public.sales_imports (
  id uuid primary key default gen_random_uuid(),
  reporting_month date not null check (reporting_month = date_trunc('month', reporting_month)::date),
  source text not null check (source in ('pos', 'grab', 'foodpanda', 'shopee', 'apps')),
  file_name text not null,
  storage_path text not null unique,
  file_size bigint not null check (file_size >= 0),
  row_count integer not null check (row_count >= 0),
  uploaded_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.sales_imports enable row level security;

create policy "Authenticated users can read sales imports"
on public.sales_imports for select to authenticated
using ((select auth.uid()) = uploaded_by);

create policy "Authenticated users can create their sales imports"
on public.sales_imports for insert to authenticated
with check ((select auth.uid()) = uploaded_by);

insert into storage.buckets (id, name, public)
values ('sales-imports', 'sales-imports', false)
on conflict (id) do nothing;

create policy "Authenticated users can view sales import files"
on storage.objects for select to authenticated
using (
  bucket_id = 'sales-imports'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Authenticated users can upload their sales import files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'sales-imports'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- One standardized daily record per outlet, source, and import file. The
-- dashboard aggregates this table after the import parser has validated it.
create table if not exists public.sales_daily (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.sales_imports(id) on delete cascade,
  reporting_month date not null check (reporting_month = date_trunc('month', reporting_month)::date),
  sales_date date not null,
  outlet_name text not null,
  source text not null check (source in ('pos', 'grab', 'foodpanda', 'shopee', 'apps')),
  gross_sales numeric(14, 2) not null default 0,
  discount numeric(14, 2) not null default 0,
  net_sales numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  service_charge numeric(14, 2) not null default 0,
  platform_fees numeric(14, 2) not null default 0,
  advertising_spend numeric(14, 2) not null default 0,
  payout numeric(14, 2) not null default 0,
  record_count integer not null default 0 check (record_count >= 0),
  created_at timestamptz not null default now(),
  unique (import_id, sales_date, outlet_name, source)
);

create index if not exists sales_daily_month_source_idx
on public.sales_daily (reporting_month, source);

create index if not exists sales_daily_month_outlet_idx
on public.sales_daily (reporting_month, outlet_name);

alter table public.sales_daily enable row level security;

create policy "Authenticated users can read processed sales"
on public.sales_daily for select to authenticated
using (
  exists (
    select 1 from public.sales_imports imports
    where imports.id = import_id
      and imports.uploaded_by = (select auth.uid())
  )
);

create policy "Import owner can add processed sales"
on public.sales_daily for insert to authenticated
with check (
  exists (
    select 1 from public.sales_imports imports
    where imports.id = import_id
      and imports.uploaded_by = (select auth.uid())
  )
);
