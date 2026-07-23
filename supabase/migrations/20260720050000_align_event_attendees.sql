alter table public.event_attendees
add column if not exists status text not null default 'confirmed',
add column if not exists message text,
add column if not exists updated_at timestamptz not null default now();

update public.event_attendees set status = 'confirmed' where status is null;

delete from public.event_attendees older
using public.event_attendees newer
where older.event_id = newer.event_id
  and older.user_id = newer.user_id
  and older.id < newer.id;

create unique index if not exists event_attendees_event_user_unique
on public.event_attendees (event_id, user_id);
