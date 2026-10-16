-- NOVA moderation status and push subscription storage (applied 2026-10-16).
alter table public.posts add column if not exists moderation_status text not null default 'visible' check (moderation_status in ('visible','hidden','removed'));
create index if not exists posts_moderation_created_idx on public.posts(moderation_status,created_at desc);
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 subscription jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "users manage own push subscriptions" on public.push_subscriptions;
create policy "users manage own push subscriptions" on public.push_subscriptions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
