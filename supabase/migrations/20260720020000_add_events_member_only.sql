alter table public.events
add column if not exists member_only boolean not null default false;

comment on column public.events.member_only is
'Whether registration is limited to signed-in club members. The editor control is currently hidden.';
