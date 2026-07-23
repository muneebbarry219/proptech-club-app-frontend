alter table public.events
add column if not exists registration_deadline timestamptz;

comment on column public.events.registration_deadline is
'Optional timestamp after which new event registrations are closed.';
