-- babies
drop policy if exists "view member babies" on babies;
drop policy if exists "insert baby" on babies;
drop policy if exists "parent update baby" on babies;
create policy "view member babies" on babies for select using (exists (select 1 from baby_members where baby_id = babies.id and user_id = auth.uid()));
create policy "insert baby" on babies for insert with check (auth.uid() is not null);
create policy "parent update baby" on babies for update using (exists (select 1 from baby_members where baby_id = babies.id and user_id = auth.uid() and role = 'parent'));

-- baby_members
drop policy if exists "view memberships" on baby_members;
drop policy if exists "insert own membership" on baby_members;
create policy "view memberships" on baby_members for select using (user_id = auth.uid());
create policy "insert own membership" on baby_members for insert with check (user_id = auth.uid());

-- subscriptions
drop policy if exists "own subscription" on subscriptions;
create policy "own subscription" on subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- logs
drop policy if exists "member feeding logs" on feeding_logs;
drop policy if exists "member sleep logs" on sleep_logs;
drop policy if exists "member diaper logs" on diaper_logs;
drop policy if exists "member growth records" on growth_records;
create policy "member feeding logs" on feeding_logs for all using (exists (select 1 from baby_members where baby_id = feeding_logs.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = feeding_logs.baby_id and user_id = auth.uid()) and logged_by = auth.uid());
create policy "member sleep logs" on sleep_logs for all using (exists (select 1 from baby_members where baby_id = sleep_logs.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = sleep_logs.baby_id and user_id = auth.uid()) and logged_by = auth.uid());
create policy "member diaper logs" on diaper_logs for all using (exists (select 1 from baby_members where baby_id = diaper_logs.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = diaper_logs.baby_id and user_id = auth.uid()) and logged_by = auth.uid());
create policy "member growth records" on growth_records for all using (exists (select 1 from baby_members where baby_id = growth_records.baby_id and user_id = auth.uid())) with check (exists (select 1 from baby_members where baby_id = growth_records.baby_id and user_id = auth.uid()) and logged_by = auth.uid());

-- baby_invites
drop policy if exists "parent invites" on baby_invites;
create policy "parent invites" on baby_invites for all using (exists (select 1 from baby_members where baby_id = baby_invites.baby_id and user_id = auth.uid() and role = 'parent')) with check (exists (select 1 from baby_members where baby_id = baby_invites.baby_id and user_id = auth.uid() and role = 'parent') and created_by = auth.uid());

-- realtime (idempotent — skip tables already in the publication)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'feeding_logs') then
    alter publication supabase_realtime add table feeding_logs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sleep_logs') then
    alter publication supabase_realtime add table sleep_logs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'diaper_logs') then
    alter publication supabase_realtime add table diaper_logs;
  end if;
end $$;

notify pgrst, 'reload schema';
