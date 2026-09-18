create table if not exists public.grn_items (
  id uuid primary key default gen_random_uuid(),
  grn_no text not null,
  grn_date date not null,
  branch_code text not null,
  branch_name text not null,
  item_code text,
  item_description text,
  po_unit_price numeric(12,2) not null default 0,
  quantity numeric(12,2) not null default 0,
  is_grn_cancelled text default 'NO',
  created_at timestamptz not null default now(),
  constraint unique_grn_item unique nulls not distinct (grn_no, item_code, branch_code)
);

create index if not exists grn_items_branch_date_idx on public.grn_items (branch_code, grn_date);
alter table public.grn_items enable row level security;
grant select, insert, update on public.grn_items to authenticated;

drop policy if exists "Authenticated users read GRN items" on public.grn_items;
drop policy if exists "Authenticated users import GRN items" on public.grn_items;
drop policy if exists "Authenticated users update GRN items" on public.grn_items;
create policy "Authenticated users read GRN items" on public.grn_items for select to authenticated using (true);
create policy "Authenticated users import GRN items" on public.grn_items for insert to authenticated with check (true);
create policy "Authenticated users update GRN items" on public.grn_items for update to authenticated using (true) with check (true);

create or replace function public.get_purchases_by_outlet(p_start_date date default null, p_end_date date default null)
returns table (branch_code text, branch_name text, total_purchase numeric)
language sql stable security invoker set search_path = public
as $$
  select g.branch_code, g.branch_name, round(sum(g.po_unit_price * g.quantity), 2)
  from public.grn_items g
  where coalesce(upper(g.is_grn_cancelled), 'NO') <> 'YES'
    and (p_start_date is null or g.grn_date >= p_start_date)
    and (p_end_date is null or g.grn_date <= p_end_date)
  group by g.branch_code, g.branch_name
  order by 3 desc;
$$;

grant execute on function public.get_purchases_by_outlet(date, date) to authenticated;
