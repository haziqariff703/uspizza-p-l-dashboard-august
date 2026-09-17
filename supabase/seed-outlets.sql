-- Seed public.outlets with the outlet master this dashboard already uses:
-- 44 trading outlets from the original May 2026 capture, plus
-- 2 upcoming. Generated from src/data/originalOutlets.ts and
-- src/data/outletData.ts — regenerate rather than hand-editing.
--
-- EDIT target_org below to your organization's id, then run once.
-- Historical starter list, NOT the authoritative August master. Finance must
-- approve it first. Re-running adds missing codes but never overwrites an
-- existing Finance-approved name, entity or status.

begin;

do $seed$
declare
  target_org constant uuid := '00000000-0000-0000-0000-000000000000';
begin
  if not exists (select 1 from public.organizations where id = target_org) then
    raise exception 'Set target_org to a real organization id before running this seed.';
  end if;

  insert into public.outlets (organization_id, code, name, entity, status)
  select target_org, seed.code, seed.name, seed.entity, seed.status
  from (values
    ('MY-030', 'Dpulze Cyberjaya', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-076', 'Vivacity Kuching', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-015', 'Mount Austin', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-007', 'Dang Wangi', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-020', 'Greenlane', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-028', 'Sri Petaling', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-026', 'ST Rosyam Mall Klang', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-037', 'Lotus Seberang Jaya', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-021', 'Summerton', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-078', 'Lucerne Residence Penang', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-013', 'Senawang', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-009', 'Kota Warisan', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-008', 'Pandan Indah', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-036', 'Puchong Jaya', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-002', 'Ampang', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-005', 'SS2', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-003', 'Seri Kembangan', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-004', 'SS15', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-017', 'Taman Universiti', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-040', 'Kiara Bay', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-027', 'Sungai Petani', 'MY US PIZZA SDN BHD', 'active'),
    ('SB-020', 'Bundusan', 'MY US PIZZA (SABAH) SDN BHD', 'active'),
    ('MY-012', 'Seremban', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-023', 'Bukit Mertajam', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-032', 'Citta Mall', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-010', 'Ayer Keroh', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-031', 'SB Mall', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-035', 'Kamunting Taiping', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-006', 'USJ Taipan', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-041', 'Anggun City', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-024', 'Simpang Ampat', 'MY US PIZZA SDN BHD', 'active'),
    ('SB-032', 'Inanam', 'MY US PIZZA (SABAH) SDN BHD', 'active'),
    ('MY-038', 'Batu Pahat Mall', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-001', 'Kelana Jaya', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-039', 'Gamuda Cove', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-018', 'Simee Ipoh', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-022', 'Raja Uda', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-034', 'Banting', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-016', 'Skudai', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-011', 'Kota Laksamana', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-033', 'Mydin Subang Jaya', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-075', 'Hextar World Empire City', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-025', 'Tanjung Tokong', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-014', 'Batu Pahat', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-051', 'Taman Connaught', 'MY US PIZZA SDN BHD', 'active'),
    ('MY-081', 'Kota Damansara', 'MY US PIZZA SDN BHD', 'active')
  ) as seed (code, name, entity, status)
  on conflict (organization_id, code) do nothing;
end
$seed$;

commit;
