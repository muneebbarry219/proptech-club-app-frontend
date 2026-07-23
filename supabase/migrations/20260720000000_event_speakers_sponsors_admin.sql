alter table public.event_speakers
add column if not exists phone text,
add column if not exists email text;

alter table public.event_speakers enable row level security;
alter table public.event_sponsors enable row level security;

drop policy if exists "Event speakers are publicly readable" on public.event_speakers;
create policy "Event speakers are publicly readable"
on public.event_speakers for select to anon, authenticated
using (exists (select 1 from public.events where events.id = event_speakers.event_id and events.is_published = true));

drop policy if exists "Admin manages event speakers" on public.event_speakers;
create policy "Admin manages event speakers"
on public.event_speakers for all to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid)
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

drop policy if exists "Event sponsors are publicly readable" on public.event_sponsors;
create policy "Event sponsors are publicly readable"
on public.event_sponsors for select to anon, authenticated
using (exists (select 1 from public.events where events.id = event_sponsors.event_id and events.is_published = true));

drop policy if exists "Admin manages event sponsors" on public.event_sponsors;
create policy "Admin manages event sponsors"
on public.event_sponsors for all to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid)
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);
