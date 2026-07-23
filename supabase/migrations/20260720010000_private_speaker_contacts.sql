create table if not exists public.event_speaker_contacts (
  speaker_id uuid primary key references public.event_speakers(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  phone text not null,
  email text not null
);

alter table public.event_speaker_contacts enable row level security;

create policy "Admin manages speaker contacts"
on public.event_speaker_contacts for all to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid)
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

alter table public.event_speakers drop column if exists phone;
alter table public.event_speakers drop column if exists email;

do $$
declare policy_row record;
begin
  for policy_row in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('event_speakers', 'event_sponsors')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

create policy "Admin manages event speakers"
on public.event_speakers for all to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid)
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

create policy "Admin manages event sponsors"
on public.event_sponsors for all to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid)
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);
