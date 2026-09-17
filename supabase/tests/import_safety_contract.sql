-- SCRATCH PROJECT ONLY. Run after the complete migration sequence. No pgTAP
-- extension required. All fixtures roll back. This is NOT a Storage HTTP test.
-- Expected: no exceptions, final ROLLBACK. Failure aborts the transaction.
begin;

create function pg_temp.assert_true(ok boolean, message text)
returns void language plpgsql as $fn$
begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if; end
$fn$;
create function pg_temp.expect_error(statement text, expected_state text)
returns void language plpgsql as $fn$
declare actual_state text;
begin
  begin execute statement;
  exception when others then
    get stacked diagnostics actual_state = returned_sqlstate;
    if actual_state <> expected_state then
      raise exception 'Unexpected SQLSTATE %, expected %: %',actual_state,expected_state,sqlerrm;
    end if;
    return;
  end;
  raise exception 'Statement unexpectedly succeeded: %',statement;
end
$fn$;
do $temp_grants$
declare namespace_name text;
begin
  select nspname into namespace_name from pg_namespace where oid = pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated,anon',namespace_name);
end
$temp_grants$;
grant execute on function pg_temp.assert_true(boolean,text),pg_temp.expect_error(text,text) to authenticated,anon;

insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select ('10000000-0000-0000-0000-00000000000' || n)::uuid,'authenticated','authenticated',
  'sql-fixture-' || n || '@example.invalid',now(),'{}','{}',now(),now() from generate_series(1,5) n;
-- 1 admin, 2 preparer in BOTH orgs, 3 reviewer, 4 approver, 5 org-B viewer.
insert into public.organizations(id,name,created_by) values
 ('20000000-0000-0000-0000-000000000001','SQL fixture A','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','SQL fixture B','10000000-0000-0000-0000-000000000001');
insert into public.organization_members(organization_id,user_id,role,status)
select '20000000-0000-0000-0000-000000000001',('10000000-0000-0000-0000-00000000000' || n)::uuid,
 case n when 2 then 'preparer' when 3 then 'reviewer' else 'approver' end,'active' from generate_series(2,4) n;
insert into public.organization_members(organization_id,user_id,role,status) values
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','preparer','active'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000005','viewer','active');
insert into public.reporting_periods(id,organization_id,start_date,end_date) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','2026-08-01','2026-08-31'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','2026-08-01','2026-08-31');
insert into public.outlets(id,organization_id,name,code,entity) values
 ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Fixture A','FIX-A','Fixture Entity A'),
 ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Fixture B','FIX-B','Fixture Entity B');

select pg_temp.assert_true(app_private.sales_amount('{"tax":0}','tax') = 0,'genuine zero remains zero');
select pg_temp.assert_true(app_private.sales_amount('{"tax":null}','tax') is null,'unknown remains null');
select pg_temp.expect_error($q$select app_private.sales_amount('{"tax":"invalid"}','tax')$q$,'P0001');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select pg_temp.assert_true(public.sales_import_contract_version() = '2026-09-16-v1','schema contract is available');
insert into public.sales_imports(id,organization_id,reporting_period_id,reporting_month,source,file_name,storage_path,file_size,row_count,uploaded_by,file_hash,parser_version,mapping_version,status)
select ('50000000-0000-0000-0000-00000000000' || n)::uuid,'20000000-0000-0000-0000-000000000001',
 '30000000-0000-0000-0000-000000000001','2026-08-01','pos','fixture-' || n || '.xlsx',
 '20000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-00000000000' || n || '/fixture.xlsx',
 1,2,'10000000-0000-0000-0000-000000000002',repeat(n::text,64),'fixture-v1','fixture-v1','parsing'
from generate_series(1,2) n;
insert into storage.objects(bucket_id,name)
select 'sales-imports',storage_path from public.sales_imports where id in
 ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002');
insert into public.sales_import_rows(id,organization_id,sales_import_id,source_sheet,source_row_number,raw_row_json,normalized_row_json,outlet_id,source_record_key,status)
select ('60000000-0000-0000-0000-00000000000' || n)::uuid,'20000000-0000-0000-0000-000000000001',
 '50000000-0000-0000-0000-000000000001','Sheet1',n,'{}',
 jsonb_build_object('salesDate','2026-08-01','source','POS','netSales',n * 10,'grossSales',n * 10,
   'tax',case when n = 1 then 0 else null end,'feeLines',case when n = 1 then
     '[{"feeType":"commission","amount":"1.25","taxAmount":null,"sourceLabel":"Source commission"}]'::jsonb else '[]'::jsonb end),
 '40000000-0000-0000-0000-000000000001','order-' || n,'valid' from generate_series(1,2) n;
-- Same orders in a re-edited file. Publication must roll back, not duplicate.
insert into public.sales_import_rows(id,organization_id,sales_import_id,source_sheet,source_row_number,raw_row_json,normalized_row_json,outlet_id,source_record_key,status)
select ('60000000-0000-0000-0000-00000000000' || (source_row_number + 2))::uuid,organization_id,
 '50000000-0000-0000-0000-000000000002',source_sheet,source_row_number,raw_row_json,normalized_row_json,outlet_id,source_record_key,status
from public.sales_import_rows where sales_import_id = '50000000-0000-0000-0000-000000000001';
select pg_temp.expect_error($q$select public.submit_sales_import('50000000-0000-0000-0000-000000000001',3)$q$,'P0001');
select public.submit_sales_import('50000000-0000-0000-0000-000000000001',2);
select public.submit_sales_import('50000000-0000-0000-0000-000000000002',2);
select pg_temp.assert_true((select count(*) = 0 from public.sales_daily where import_id in
 ('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002')),'staging cannot produce dashboard figures');
select pg_temp.expect_error($q$update public.sales_imports set status = 'published' where id = '50000000-0000-0000-0000-000000000001'$q$,'42501');
select pg_temp.expect_error($q$insert into public.sales_daily(import_id,reporting_month,sales_date,outlet_name,source,organization_id) values
 ('50000000-0000-0000-0000-000000000001','2026-08-01','2026-08-01','Fixture A','pos','20000000-0000-0000-0000-000000000001')$q$,'42501');

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
select public.review_sales_import_rows('50000000-0000-0000-0000-000000000001',array[
 '60000000-0000-0000-0000-000000000001'::uuid,'60000000-0000-0000-0000-000000000002'::uuid],'approved',null,'Checked source and outlet.');
select public.review_sales_import_rows('50000000-0000-0000-0000-000000000002',array[
 '60000000-0000-0000-0000-000000000003'::uuid,'60000000-0000-0000-0000-000000000004'::uuid],'approved',null,'Checked re-edited fixture.');
select pg_temp.expect_error($q$select public.publish_sales_import('50000000-0000-0000-0000-000000000001')$q$,'42501');
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
select public.publish_sales_import('50000000-0000-0000-0000-000000000001');
select public.publish_sales_import('50000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select count(*) = 1 and max(net_sales) = 30 and count(tax) = 0 from public.sales_daily
 where import_id = '50000000-0000-0000-0000-000000000001'),'exact totals, null propagation and idempotent publication');
select pg_temp.assert_true((select count(*) = 1 and max(amount) = 1.25 from public.sales_fee_lines
 where sales_import_id = '50000000-0000-0000-0000-000000000001'),'itemized fee preserved');
select pg_temp.expect_error($q$select public.publish_sales_import('50000000-0000-0000-0000-000000000002')$q$,'23505');
select pg_temp.assert_true((select status = 'needs_review' from public.sales_imports where id = '50000000-0000-0000-0000-000000000002'),'duplicate failure rolls back import state');
select pg_temp.assert_true((select count(*) = 0 from public.published_source_records where sales_import_id = '50000000-0000-0000-0000-000000000002'),'duplicate failure rolls back source ledger');

select pg_temp.expect_error($q$select public.set_reporting_period_status('30000000-0000-0000-0000-000000000001','closed','Close fixture month.')$q$,'P0001');
select public.reject_sales_import('50000000-0000-0000-0000-000000000002','Duplicate source orders, rejected.');
select public.set_reporting_period_status('30000000-0000-0000-0000-000000000001','closed','All fixture imports resolved.');
select pg_temp.expect_error($q$select public.publish_sales_import('50000000-0000-0000-0000-000000000002')$q$,'P0001');
select public.publish_sales_import('50000000-0000-0000-0000-000000000001'); -- harmless retry after closure

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
select pg_temp.assert_true((select count(*) = 0 from public.sales_daily),'other organization cannot read sales');
select pg_temp.assert_true((select count(*) = 0 from storage.objects where bucket_id = 'sales-imports'
 and name like '20000000-0000-0000-0000-000000000001/%'),'sharing the uploader does not expose another org file');
select pg_temp.assert_true((select count(*) = 0 from public.import_row_summary('50000000-0000-0000-0000-000000000001')),'summary respects tenant RLS');
select pg_temp.expect_error($q$select public.publish_sales_import('50000000-0000-0000-0000-000000000001')$q$,'42501');

set local role anon;
select set_config('request.jwt.claims','{}',true);
select pg_temp.expect_error('select * from public.sales_daily','42501');
select pg_temp.expect_error($q$select public.publish_sales_import('50000000-0000-0000-0000-000000000001')$q$,'42501');
reset role;
select pg_temp.assert_true((select count(*) = 1 from public.sales_daily where import_id = '50000000-0000-0000-0000-000000000001'),'original figures survive denied operations');
rollback;
