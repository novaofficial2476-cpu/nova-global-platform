-- Keep repository migrations in sync with the live NOVA database.
drop policy if exists "posts readable according to visibility" on public.posts;
create policy "posts readable according to visibility" on public.posts
for select to authenticated
using (
  moderation_status = 'visible'
  and (
    author_id = (select auth.uid())
    or (visibility = 'public' and exists (
      select 1 from public.profiles p where p.id = posts.author_id
      and (p.is_private = false or p.id = (select auth.uid())
        or exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p.id and f.status = 'accepted'))
    ))
    or (visibility = 'followers' and exists (
      select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = posts.author_id and f.status = 'accepted'
    ))
  )
);
drop policy if exists "moderators can read moderated posts" on public.posts;
create policy "moderators can read moderated posts" on public.posts
for select to authenticated
using (exists (select 1 from public.admin_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','moderator')));
create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists communities_owner_id_idx on public.communities(owner_id);
create index if not exists community_members_user_id_idx on public.community_members(user_id);
create index if not exists conversation_members_user_id_idx on public.conversation_members(user_id);
create index if not exists conversations_created_by_idx on public.conversations(created_by);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists notifications_actor_id_idx on public.notifications(actor_id);
create index if not exists notifications_post_id_idx on public.notifications(post_id);
create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
