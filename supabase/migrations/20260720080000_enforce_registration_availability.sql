create or replace function public.submit_event_registration(p_event_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission_id uuid;
  v_profile public.profiles%rowtype;
  v_email text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.events
    where id = p_event_id
      and is_published = true
      and is_past = false
      and registration_type = 'exclusive'
      and (registration_deadline is null or registration_deadline > now())
      and event_date > now()
  ) then raise exception 'Event registration is not available or has closed'; end if;
  if exists (
    select 1 from public.event_registration_questions q
    where q.event_id = p_event_id and q.is_required
      and not exists (
        select 1 from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
        where (a->>'question_id')::uuid = q.id and length(trim(a->>'answer')) > 0
      )
  ) then raise exception 'Please answer every required question'; end if;

  select * into v_profile from public.profiles where id = v_user_id;
  select u.email into v_email from auth.users u where u.id = v_user_id;

  insert into public.event_registration_submissions
    (event_id, user_id, full_name, contact_number, email, company)
  values
    (p_event_id, v_user_id, v_profile.full_name, v_profile.whatsapp, v_email, v_profile.company)
  on conflict (event_id, user_id) do update set
    full_name = excluded.full_name,
    contact_number = excluded.contact_number,
    email = excluded.email,
    company = excluded.company,
    updated_at = now()
  returning id into v_submission_id;

  delete from public.event_registration_answers where submission_id = v_submission_id;
  insert into public.event_registration_answers (submission_id, question_id, answer)
  select v_submission_id, q.id, left(coalesce(trim(a->>'answer'), ''), 2000)
  from public.event_registration_questions q
  left join jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
    on (a->>'question_id')::uuid = q.id
  where q.event_id = p_event_id;

  insert into public.event_attendees (event_id, user_id, status, message)
  values (p_event_id, v_user_id, 'confirmed', null)
  on conflict (event_id, user_id) do update set status = 'confirmed', message = null, updated_at = now();
  return v_submission_id;
end;
$$;

revoke all on function public.submit_event_registration(uuid, jsonb) from public;
grant execute on function public.submit_event_registration(uuid, jsonb) to authenticated;
