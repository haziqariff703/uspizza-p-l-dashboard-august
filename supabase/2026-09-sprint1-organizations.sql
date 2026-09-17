-- Sprint 1 — organizations, members, roles, outlets, reporting periods, RLS.
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- Before this, a signed-in user could read exactly their own uploads
-- (uploaded_by = auth.uid()), so two colleagues looking at the same month saw
-- different figures. Authorisation now comes from active membership of an
-- organization, per IMPLEMENTATION_GUIDE.md: authentication alone is not enough.

begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

-- ---------------------------------------------------------------- reference --

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'preparer', 'reviewer', 'approver', 'admin')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role text not null check (role in ('viewer', 'preparer', 'reviewer', 'approver', 'admin')),
  invited_by uuid not null references auth.users(id) default auth.uid(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- One open invitation per address per organization; accepted ones stay as history.
create unique index if not exists organization_invitations_open_idx
on public.organization_invitations (organization_id, lower(email))
where accepted_at is null;

create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  entity text not null,
  status text not null default 'active' check (status in ('active', 'upcoming', 'inactive', 'closed')),
  opening_date date,
  created_at timestamptz not null default now(),
  unique (organization_id, code),
  -- Lets outlet_aliases reference (outlet, organization) as one fact, so an alias
  -- can never drift onto an outlet belonging to a different organization.
  unique (id, organization_id)
);

create table if not exists public.outlet_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  outlet_id uuid not null,
  source text not null check (source in ('pos', 'grab', 'foodpanda', 'shopee', 'apps')),
  alias text not null,
  is_confirmed boolean not null default false,
  confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (outlet_id, organization_id)
    references public.outlets (id, organization_id) on delete cascade
);

create unique index if not exists outlet_aliases_source_alias_idx
on public.outlet_aliases (organization_id, source, lower(alias));

create table if not exists public.reporting_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'under_review', 'closed')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (organization_id, start_date, end_date)
);

-- ------------------------------------------------------- membership helpers --
-- security definer, so a policy on organization_members can ask "is this user a
-- member?" without re-entering that table's own policy and recursing.

create or replace function app_private.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid() and m.status = 'active'
  );
$fn$;

create or replace function app_private.has_org_role(org uuid, roles text[])
returns boolean language sql stable security definer set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
      and m.status = 'active' and m.role = any(roles)
  );
$fn$;

-- Legacy-only helper, kept revoked; organization-scoped Storage must not use it.
create or replace function app_private.shares_org_with(other_user text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $fn$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and mine.status = 'active'
      and theirs.user_id::text = other_user and theirs.status = 'active'
  );
$fn$;

-- Whoever creates an organization is its first admin (guide, invite flow step 1).
create or replace function app_private.add_creator_as_admin()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $fn$
begin
  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (new.id, new.created_by, 'admin', 'active', now())
  on conflict (organization_id, user_id) do nothing;
  return new;
end $fn$;

drop trigger if exists organizations_add_creator_as_admin on public.organizations;
create trigger organizations_add_creator_as_admin
after insert on public.organizations
for each row execute function app_private.add_creator_as_admin();

-- The only route the app uses to start an organization. It exists because a
-- plain insert would have to read its own row back through a select policy that
-- only passes once the trigger above has run.
create or replace function app_private.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  caller uuid := auth.uid();
  new_org uuid;
begin
  if caller is null then
    raise exception 'Sign in before creating an organization.';
  end if;
  insert into public.organizations (name, created_by)
  values (trim(org_name), caller)
  returning id into new_org;
  return new_org;
end $fn$;

-- Members need to see who else is in the organization, and auth.users is not
-- readable from the browser. Membership is re-checked inside.
create or replace function app_private.organization_roster(org uuid)
returns table (user_id uuid, email text, role text, status text, joined_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $fn$
  select m.user_id, u.email::text, m.role, m.status, m.joined_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  where m.organization_id = org and app_private.is_org_member(org)
  order by m.created_at;
$fn$;

-- Invite flow steps 3-4: an invitation stays pending until that person signs in
-- with the invited address; then their auth.users.id is linked to it. The app
-- calls this after every sign-in.
create or replace function app_private.accept_pending_invitations()
returns integer language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  caller uuid := auth.uid();
  caller_email text;
  accepted integer := 0;
  invitation record;
begin
  select lower(u.email) into caller_email from auth.users u
  where u.id = caller and u.email_confirmed_at is not null;
  if caller is null or caller_email is null then
    return 0;
  end if;

  for invitation in
    select i.* from public.organization_invitations i
    where lower(i.email) = caller_email and i.accepted_at is null and i.expires_at > now()
      -- Someone who already has a membership row keeps it. In particular an
      -- invitation must never quietly un-suspend a suspended member; that
      -- invitation stays pending so an admin has to act on it deliberately.
      and not exists (
        select 1 from public.organization_members m
        where m.organization_id = i.organization_id and m.user_id = caller
      )
    for update
  loop
    insert into public.organization_members (organization_id, user_id, role, status, invited_by, joined_at)
    values (invitation.organization_id, caller, invitation.role, 'active', invitation.invited_by, now())
    on conflict (organization_id, user_id) do nothing;

    update public.organization_invitations
    set accepted_at = now(), accepted_by = caller
    where id = invitation.id;

    accepted := accepted + 1;
  end loop;

  return accepted;
end $fn$;

-- API entry points are invoker wrappers. Privileged implementations live in a
-- non-exposed schema and check the authenticated identity/membership themselves.
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security invoker set search_path = '' as $fn$
  select app_private.is_org_member(org);
$fn$;
create or replace function public.has_org_role(org uuid, roles text[])
returns boolean language sql stable security invoker set search_path = '' as $fn$
  select app_private.has_org_role(org, roles);
$fn$;
create or replace function public.create_organization(org_name text)
returns uuid language sql security invoker set search_path = '' as $fn$
  select app_private.create_organization(org_name);
$fn$;
create or replace function public.organization_roster(org uuid)
returns table (user_id uuid, email text, role text, status text, joined_at timestamptz)
language sql stable security invoker set search_path = '' as $fn$
  select * from app_private.organization_roster(org);
$fn$;
create or replace function public.accept_pending_invitations()
returns integer language sql security invoker set search_path = '' as $fn$
  select app_private.accept_pending_invitations();
$fn$;

revoke all on function app_private.is_org_member(uuid),app_private.has_org_role(uuid,text[]),
  app_private.shares_org_with(text),app_private.add_creator_as_admin(),app_private.create_organization(text),
  app_private.organization_roster(uuid),app_private.accept_pending_invitations() from public, anon, authenticated;
grant execute on function app_private.is_org_member(uuid), app_private.has_org_role(uuid, text[]),
  app_private.create_organization(text), app_private.organization_roster(uuid),
  app_private.accept_pending_invitations() to authenticated;
revoke all on function public.is_org_member(uuid), public.has_org_role(uuid, text[]),
  public.create_organization(text), public.organization_roster(uuid), public.accept_pending_invitations()
  from public, anon;
grant execute on function public.is_org_member(uuid), public.has_org_role(uuid, text[]),
  public.create_organization(text), public.organization_roster(uuid), public.accept_pending_invitations()
  to authenticated;

-- Retire old exposed privileged helpers if upgrading an earlier draft.
do $retire$
begin
  if to_regprocedure('public.shares_org_with(text)') is not null then
    execute 'revoke all on function public.shares_org_with(text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.add_creator_as_admin()') is not null then
    execute 'revoke all on function public.add_creator_as_admin() from public, anon, authenticated';
  end if;
end
$retire$;

-- --------------------------------------------------------------------- RLS --

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.outlets enable row level security;
alter table public.outlet_aliases enable row level security;
alter table public.reporting_periods enable row level security;

drop policy if exists "Members read their organizations" on public.organizations;
create policy "Members read their organizations"
on public.organizations for select to authenticated
using (public.is_org_member(id));

-- No insert policy on purpose: organizations are created through
-- public.create_organization(), so an organization always gets its first admin.
drop policy if exists "Signed-in users create an organization" on public.organizations;

drop policy if exists "Admins rename their organization" on public.organizations;
create policy "Admins rename their organization"
on public.organizations for update to authenticated
using (public.has_org_role(id, array['admin']))
with check (public.has_org_role(id, array['admin']));

drop policy if exists "Members read the roster" on public.organization_members;
create policy "Members read the roster"
on public.organization_members for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Admins manage members" on public.organization_members;
create policy "Admins manage members"
on public.organization_members for all to authenticated
using (public.has_org_role(organization_id, array['admin']))
with check (public.has_org_role(organization_id, array['admin']));

-- An invitee can see the invitation addressed to them before they are a member.
drop policy if exists "Admins and the invitee read invitations" on public.organization_invitations;
create policy "Admins and the invitee read invitations"
on public.organization_invitations for select to authenticated
using (
  public.has_org_role(organization_id, array['admin'])
  or lower(email) = lower((select auth.jwt() ->> 'email'))
);

drop policy if exists "Admins manage invitations" on public.organization_invitations;
create policy "Admins manage invitations"
on public.organization_invitations for all to authenticated
using (public.has_org_role(organization_id, array['admin']))
with check (public.has_org_role(organization_id, array['admin']));

drop policy if exists "Members read outlets" on public.outlets;
create policy "Members read outlets"
on public.outlets for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Admins manage outlets" on public.outlets;
create policy "Admins manage outlets"
on public.outlets for all to authenticated
using (public.has_org_role(organization_id, array['admin']))
with check (public.has_org_role(organization_id, array['admin']));

drop policy if exists "Members read outlet aliases" on public.outlet_aliases;
create policy "Members read outlet aliases"
on public.outlet_aliases for select to authenticated
using (public.is_org_member(organization_id));

-- A preparer resolves mapping issues, so they may record an alias too.
drop policy if exists "Preparers and admins manage outlet aliases" on public.outlet_aliases;
create policy "Preparers and admins manage outlet aliases"
on public.outlet_aliases for all to authenticated
using (public.has_org_role(organization_id, array['preparer', 'admin']))
with check (public.has_org_role(organization_id, array['preparer', 'admin']));

drop policy if exists "Members read reporting periods" on public.reporting_periods;
create policy "Members read reporting periods"
on public.reporting_periods for select to authenticated
using (public.is_org_member(organization_id));

-- Closing a period is an approver action (guide, roles table).
drop policy if exists "Approvers and admins manage reporting periods" on public.reporting_periods;
create policy "Approvers and admins manage reporting periods"
on public.reporting_periods for all to authenticated
using (public.has_org_role(organization_id, array['approver', 'admin']))
with check (public.has_org_role(organization_id, array['approver', 'admin']));

commit;
