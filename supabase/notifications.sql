-- In-app notification backend setup for PropTech Club.
-- Run this in the Supabase SQL editor for the project.
--
-- Version 1 stores notification rows that the app displays on /notifications.
-- Device push delivery can be added later in version 2.

create table if not exists public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('signup_welcome', 'connection_request', 'direct_message')),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists push_notification_events_recipient_id_idx
  on public.push_notification_events(recipient_id);

alter table public.push_notification_events enable row level security;

drop policy if exists "Authenticated users can create notification events" on public.push_notification_events;
create policy "Authenticated users can create notification events"
  on public.push_notification_events
  for insert
  with check (auth.uid() = actor_id);

drop policy if exists "Users can read their own notification events" on public.push_notification_events;
create policy "Users can read their own notification events"
  on public.push_notification_events
  for select
  using (auth.uid() = recipient_id);
