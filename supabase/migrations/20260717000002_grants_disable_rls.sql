-- Grant full access to authenticated and anon roles
-- (tables created via SQL are not auto-granted like UI-created tables)
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- RLS disabled for development — re-enable per-table as policies are added
alter table profiles disable row level security;
alter table babies disable row level security;
alter table baby_members disable row level security;
alter table subscriptions disable row level security;
alter table feeding_logs disable row level security;
alter table sleep_logs disable row level security;
alter table diaper_logs disable row level security;
alter table growth_records disable row level security;
alter table baby_invites disable row level security;
