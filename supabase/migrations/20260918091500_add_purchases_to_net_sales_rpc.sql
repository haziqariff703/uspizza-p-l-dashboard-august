create or replace function public.get_purchases_to_net_sales(p_start_date date, p_end_date date)
returns table (outlet_id uuid, outlet_name text, outlet_code text, total_purchases numeric, total_net_sales numeric, percentage numeric)
language sql stable security invoker set search_path = public
as $$
  with s as (select outlet_id, sum(net_sales) net_sales from public.sales_daily where sales_date between p_start_date and p_end_date group by outlet_id), p as (select o.id outlet_id, sum(g.po_unit_price*g.quantity) purchases from public.grn_items g join public.outlets o on upper(trim(g.branch_code))=upper(trim(o.code)) where coalesce(upper(g.is_grn_cancelled),'NO') <> 'YES' and g.grn_date between p_start_date and p_end_date group by o.id)
  select o.id, o.name, o.code, round(coalesce(p.purchases,0),2), round(coalesce(s.net_sales,0),2), case when coalesce(s.net_sales,0)>0 then round(coalesce(p.purchases,0)/s.net_sales*100,1) else 0 end from public.outlets o left join s on s.outlet_id=o.id left join p on p.outlet_id=o.id where o.status='active' or o.status is null order by 6 desc;
$$;
grant execute on function public.get_purchases_to_net_sales(date,date) to authenticated;
