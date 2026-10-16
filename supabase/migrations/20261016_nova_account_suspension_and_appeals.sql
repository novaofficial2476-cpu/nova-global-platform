alter table public.profiles add column if not exists account_status text not null default 'active' check (account_status in ('active','suspended','banned'));
alter table public.profiles add column if not exists status_reason text;
alter table public.profiles add column if not exists status_changed_at timestamptz;
alter table public.profiles add column if not exists status_changed_by uuid references auth.users(id) on delete set null;
create table if not exists public.account_appeals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check (char_length(trim(reason)) between 10 and 3000),
 status text not null default 'open' check (status in ('open','reviewing','approved','rejected')),
 moderator_note text,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.account_appeals enable row level security;
drop policy if exists "users submit own account appeals" on public.account_appeals;
create policy "users submit own account appeals" on public.account_appeals for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "users read own account appeals" on public.account_appeals;
create policy "users read own account appeals" on public.account_appeals for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "admins manage account appeals" on public.account_appeals;
create policy "admins manage account appeals" on public.account_appeals for all to authenticated using (exists(select 1 from public.admin_roles r where r.user_id=(select auth.uid()) and r.role='admin')) with check (exists(select 1 from public.admin_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
create index if not exists account_appeals_status_created_idx on public.account_appeals(status, created_at desc);
create index if not exists profiles_account_status_idx on public.profiles(account_status);
