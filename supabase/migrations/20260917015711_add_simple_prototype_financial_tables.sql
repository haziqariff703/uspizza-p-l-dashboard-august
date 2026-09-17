-- Simple, owner-scoped prototype tables. These supplement the full finance
-- workflow tables and do not modify its reviewed legacy data or controls.

begin;

create table if not exists public.prototype_outlets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  code text not null check (length(btrim(code)) > 0),
  entity text not null check (length(btrim(entity)) > 0),
  status text not null default 'active'
    check (status in ('active', 'upcoming', 'inactive', 'closed')),
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (created_by, code)
);

create table if not exists public.prototype_outlet_aliases (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid not null references public.prototype_outlets(id) on delete cascade,
  source text not null check (source in ('pos', 'grab', 'foodpanda', 'shopee', 'apps')),
  alias text not null check (length(btrim(alias)) > 0),
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (created_by, source, alias)
);

create table if not exists public.prototype_sales_imports (
  id uuid primary key default gen_random_uuid(),
  reporting_month date not null
    check (reporting_month = date_trunc('month', reporting_month)::date),
  source text not null check (source in ('pos', 'grab', 'foodpanda', 'shopee', 'apps')),
  file_name text not null check (length(btrim(file_name)) > 0),
  status text not null default 'imported' check (status in ('draft', 'imported', 'failed')),
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.prototype_sales_daily (
  id uuid primary key default gen_random_uuid(),
  sales_import_id uuid not null references public.prototype_sales_imports(id) on delete cascade,
  outlet_id uuid not null references public.prototype_outlets(id),
  sales_date date not null,
  gross_sales numeric(14,2),
  discount numeric(14,2),
  net_sales numeric(14,2),
  tax numeric(14,2),
  service_charge numeric(14,2),
  platform_fees numeric(14,2),
  advertising_spend numeric(14,2),
  payout numeric(14,2),
  record_count integer not null default 0 check (record_count >= 0),
  created_at timestamptz not null default now(),
  unique (sales_import_id, outlet_id, sales_date)
);

create index if not exists prototype_sales_daily_outlet_date_idx
  on public.prototype_sales_daily (outlet_id, sales_date);

create table if not exists public.prototype_purchases_imports (
  id uuid primary key default gen_random_uuid(),
  reporting_month date not null
    check (reporting_month = date_trunc('month', reporting_month)::date),
  file_name text not null check (length(btrim(file_name)) > 0),
  status text not null default 'imported' check (status in ('draft', 'imported', 'failed')),
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.prototype_purchases_daily (
  id uuid primary key default gen_random_uuid(),
  purchases_import_id uuid not null references public.prototype_purchases_imports(id) on delete cascade,
  outlet_id uuid not null references public.prototype_outlets(id),
  purchase_date date not null,
  purchase_amount numeric(14,2) not null,
  grn_number text,
  supplier_name text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (purchases_import_id, outlet_id, purchase_date, grn_number)
);

create index if not exists prototype_purchases_daily_outlet_date_idx
  on public.prototype_purchases_daily (outlet_id, purchase_date);

alter table public.prototype_outlets enable row level security;
alter table public.prototype_outlet_aliases enable row level security;
alter table public.prototype_sales_imports enable row level security;
alter table public.prototype_sales_daily enable row level security;
alter table public.prototype_purchases_imports enable row level security;
alter table public.prototype_purchases_daily enable row level security;

revoke all on public.prototype_outlets, public.prototype_outlet_aliases,
  public.prototype_sales_imports, public.prototype_sales_daily,
  public.prototype_purchases_imports, public.prototype_purchases_daily
  from public, anon, authenticated;
grant select, insert, update, delete on public.prototype_outlets, public.prototype_outlet_aliases,
  public.prototype_sales_imports, public.prototype_sales_daily,
  public.prototype_purchases_imports, public.prototype_purchases_daily to authenticated;

create policy "Prototype owners manage outlets"
on public.prototype_outlets for all to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "Prototype owners manage outlet aliases"
on public.prototype_outlet_aliases for all to authenticated
using (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.prototype_outlets o
    where o.id = outlet_id and o.created_by = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.prototype_outlets o
    where o.id = outlet_id and o.created_by = (select auth.uid())
  )
);

create policy "Prototype owners manage sales imports"
on public.prototype_sales_imports for all to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "Prototype owners manage sales totals"
on public.prototype_sales_daily for all to authenticated
using (
  exists (
    select 1 from public.prototype_sales_imports i
    where i.id = sales_import_id and i.created_by = (select auth.uid())
  )
  and exists (
    select 1 from public.prototype_outlets o
    where o.id = outlet_id and o.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.prototype_sales_imports i
    where i.id = sales_import_id and i.created_by = (select auth.uid())
  )
  and exists (
    select 1 from public.prototype_outlets o
    where o.id = outlet_id and o.created_by = (select auth.uid())
  )
);

create policy "Prototype owners manage purchase imports"
on public.prototype_purchases_imports for all to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "Prototype owners manage purchase totals"
on public.prototype_purchases_daily for all to authenticated
using (
  exists (
    select 1 from public.prototype_purchases_imports i
    where i.id = purchases_import_id and i.created_by = (select auth.uid())
  )
  and exists (
    select 1 from public.prototype_outlets o
    where o.id = outlet_id and o.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.prototype_purchases_imports i
    where i.id = purchases_import_id and i.created_by = (select auth.uid())
  )
  and exists (
    select 1 from public.prototype_outlets o
    where o.id = outlet_id and o.created_by = (select auth.uid())
  )
);

commit;
