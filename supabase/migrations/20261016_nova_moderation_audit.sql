-- NOVA moderation and audit schema (applied to project on 2026-10-16).
create table if not exists public.admin_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','moderator')),
 created_at timestamptz not null default now()
);
alter table public.admin_roles enable row level security;
drop policy if exists "admins can read admin roles" on public.admin_roles;
drop policy if exists "users can read their own admin role" on public.admin_roles;
create policy "users can read their own admin role" on public.admin_roles for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.content_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 target_type text not null check (target_type in ('post','comment','profile','message','community')),
 target_id uuid not null,
 reason text not null check (char_length(reason) between 3 and 1000),
 status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 moderator_note text,
 created_at timestamptz not null default now()
);
create index if not exists content_reports_status_created_idx on public.content_reports(status,created_at desc);
create index if not exists content_reports_target_idx on public.content_reports(target_type,target_id);
create index if not exists content_reports_reporter_id_idx on public.content_reports(reporter_id);
create index if not exists content_reports_reviewed_by_idx on public.content_reports(reviewed_by);
alter table public.content_reports enable row level security;
drop policy if exists "users can submit reports" on public.content_reports;
create policy "users can submit reports" on public.content_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists "reporters can read own reports" on public.content_reports;
create policy "reporters can read own reports" on public.content_reports for select to authenticated using (reporter_id = (select auth.uid()));
drop policy if exists "moderators can read reports" on public.content_reports;
create policy "moderators can read reports" on public.content_reports for select to authenticated using (exists (select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','moderator')));
drop policy if exists "moderators can update reports" on public.content_reports;
create policy "moderators can update reports" on public.content_reports for update to authenticated using (exists (select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','moderator'))) with check (exists (select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','moderator')));

create table if not exists public.audit_logs (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null,
 target_type text not null,
 target_id text,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_target_idx on public.audit_logs(target_type,target_id);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
alter table public.audit_logs enable row level security;
drop policy if exists "admins can read audit logs" on public.audit_logs;
create policy "admins can read audit logs" on public.audit_logs for select to authenticated using (exists (select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'));
revoke insert,update,delete on public.audit_logs from anon,authenticated;
grant select on public.audit_logs to authenticated;

create or replace function public.nova_audit_report_changes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
 insert into public.audit_logs(actor_id,action,target_type,target_id,details)
 values (auth.uid(),'report_'||new.status,'content_report',new.id::text,
 jsonb_build_object('previous_status',case when tg_op='UPDATE' then old.status else null end,'new_status',new.status,'moderator_note',new.moderator_note));
 return new;
end;
$$;
revoke all on function public.nova_audit_report_changes() from public,anon,authenticated;
drop trigger if exists nova_audit_report_changes on public.content_reports;
create trigger nova_audit_report_changes after update on public.content_reports for each row
when (old.status is distinct from new.status or old.moderator_note is distinct from new.moderator_note)
execute function public.nova_audit_report_changes();
