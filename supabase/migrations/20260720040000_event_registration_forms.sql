create table if not exists public.event_registration_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 1 and 200),
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_registration_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.event_registration_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.event_registration_submissions(id) on delete cascade,
  question_id uuid not null references public.event_registration_questions(id) on delete cascade,
  answer text not null check (char_length(answer) <= 2000),
  unique (submission_id, question_id)
);

alter table public.event_registration_questions enable row level security;
alter table public.event_registration_submissions enable row level security;
alter table public.event_registration_answers enable row level security;

create policy "Published registration questions are readable"
on public.event_registration_questions for select to anon, authenticated
using (exists (select 1 from public.events where events.id = event_id and events.is_published = true));

create policy "Admin manages registration questions"
on public.event_registration_questions for all to authenticated
using (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid)
with check (auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

create policy "Users read own registration submissions"
on public.event_registration_submissions for select to authenticated
using (user_id = auth.uid() or auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid);

create policy "Admin reads registration answers"
on public.event_registration_answers for select to authenticated
using (
  auth.uid() = '59a93ce0-0570-4f71-897a-162b72decf7e'::uuid
  or exists (select 1 from public.event_registration_submissions s where s.id = submission_id and s.user_id = auth.uid())
);

create or replace function public.submit_event_registration(p_event_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.events where id = p_event_id and is_published = true and is_past = false) then
    raise exception 'Event is not available for registration';
  end if;
  if exists (
    select 1 from public.event_registration_questions q
    where q.event_id = p_event_id and q.is_required
      and not exists (
        select 1 from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
        where (a->>'question_id')::uuid = q.id and length(trim(a->>'answer')) > 0
      )
  ) then raise exception 'Please answer every required question'; end if;

  insert into public.event_registration_submissions (event_id, user_id)
  values (p_event_id, v_user_id)
  on conflict (event_id, user_id) do update set updated_at = now()
  returning id into v_submission_id;

  delete from public.event_registration_answers where submission_id = v_submission_id;
  insert into public.event_registration_answers (submission_id, question_id, answer)
  select v_submission_id, q.id, left(trim(a->>'answer'), 2000)
  from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
  join public.event_registration_questions q on q.id = (a->>'question_id')::uuid and q.event_id = p_event_id
  where length(trim(a->>'answer')) > 0;

  insert into public.event_attendees (event_id, user_id, status, message)
  values (p_event_id, v_user_id, 'confirmed', null)
  on conflict (event_id, user_id) do update set status = 'confirmed', message = null;
  return v_submission_id;
end;
$$;

revoke all on function public.submit_event_registration(uuid, jsonb) from public;
grant execute on function public.submit_event_registration(uuid, jsonb) to authenticated;
