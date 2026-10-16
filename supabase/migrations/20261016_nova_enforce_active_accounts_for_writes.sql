-- Enforce active account status for writes across core social actions.
drop policy if exists "users create own posts" on public.posts;
create policy "users create own posts" on public.posts for insert to authenticated with check (author_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active'));
drop policy if exists "users create own comments" on public.comments;
create policy "users create own comments" on public.comments for insert to authenticated with check (author_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active'));
drop policy if exists "users follow as self" on public.follows;
create policy "users follow as self" on public.follows for insert to authenticated with check (follower_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active'));
drop policy if exists "users like as self" on public.post_likes;
create policy "users like as self" on public.post_likes for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active'));
drop policy if exists "users create communities" on public.communities;
create policy "users create communities" on public.communities for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active'));
drop policy if exists "users create conversations" on public.conversations;
create policy "users create conversations" on public.conversations for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active'));
drop policy if exists "conversation members send messages" on public.messages;
create policy "conversation members send messages" on public.messages for insert to authenticated with check (sender_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active') and exists(select 1 from public.conversation_members cm where cm.conversation_id=messages.conversation_id and cm.user_id=(select auth.uid())));
drop policy if exists "users join as self" on public.community_members;
create policy "users join as self" on public.community_members for insert to authenticated with check (user_id=(select auth.uid()) and role='member' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.account_status='active'));
