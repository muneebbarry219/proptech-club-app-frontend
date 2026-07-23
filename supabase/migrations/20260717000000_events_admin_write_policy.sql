-- Event reads remain controlled by the existing SELECT policy.
-- All writes are restricted to the single admin account used by the Android app.
alter table public.events enable row level security;

-- Remove every existing mutation policy, including broad ALL policies. RLS policies
-- are ORed together, so leaving one broad policy would bypass the admin restriction.
do $$
declare policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.events', policy_row.policyname);
  end loop;
end $$;

-- Preserve public access to published events if an old ALL policy supplied reads.
drop policy if exists "Published events are publicly readable" on public.events;
create policy "Published events are publicly readable"
on public.events for select
to anon, authenticated
using (is_published = true or auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

create policy "Admin can insert events"
on public.events for insert
to authenticated
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

create policy "Admin can update events"
on public.events for update
to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid)
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

create policy "Admin can delete events"
on public.events for delete
to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);
