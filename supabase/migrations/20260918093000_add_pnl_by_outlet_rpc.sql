create or replace function public.get_pnl_by_outlet(p_start_date date, p_end_date date)
returns table (outlet_id uuid, outlet_name text, outlet_code text, outlet_entity text, net_sales numeric, purchases numeric, gross_profit numeric, gross_margin numeric, sales_by_platform jsonb)
language sql stable security invoker set search_path = public
as $$
  with platform_rows as (select s.outlet_id, coalesce(i.source,'pos') source, sum(s.net_sales) amount from public.sales_daily s left join public.sales_imports i on i.id=s.sales_import_id where s.sales_date between p_start_date and p_end_date group by s.outlet_id, coalesce(i.source,'pos')),
  sales as (select outlet_id, sum(amount) net, jsonb_object_agg(source,amount) platforms from platform_rows group by outlet_id),
  resolved_grn as (select g.*, coalesce(by_code.id, by_alias.outlet_id, by_name.id) outlet_id from public.grn_items g left join public.outlets by_code on upper(trim(g.branch_code))=upper(trim(by_code.code)) left join public.outlet_aliases by_alias on lower(trim(g.branch_name))=lower(trim(by_alias.alias)) left join public.outlets by_name on lower(trim(g.branch_name))=lower(trim(by_name.name))),
  purchases as (select outlet_id,sum(po_unit_price*quantity) amount from resolved_grn where outlet_id is not null and coalesce(upper(is_grn_cancelled),'NO')<>'YES' and grn_date between p_start_date and p_end_date group by outlet_id)
  select o.id,o.name,o.code,coalesce(o.entity,'MY US PIZZA SDN BHD'),round(coalesce(s.net,0),2),round(coalesce(p.amount,0),2),round(coalesce(s.net,0)-coalesce(p.amount,0),2),case when coalesce(s.net,0)>0 then round((coalesce(s.net,0)-coalesce(p.amount,0))/s.net*100,1) else 0 end,coalesce(s.platforms,'{}'::jsonb)
  from public.outlets o left join sales s on s.outlet_id=o.id left join purchases p on p.outlet_id=o.id where o.status='active' or o.status is null order by 7 desc;
$$;
grant execute on function public.get_pnl_by_outlet(date,date) to authenticated;
