alter table public.event_registration_questions
add column if not exists question_type text not null default 'text',
add column if not exists options jsonb not null default '[]'::jsonb;

alter table public.event_registration_questions
drop constraint if exists event_registration_questions_question_type_check;

alter table public.event_registration_questions
add constraint event_registration_questions_question_type_check
check (question_type in ('text', 'multiple_choice', 'checkboxes'));

alter table public.event_registration_questions
drop constraint if exists event_registration_questions_options_check;

alter table public.event_registration_questions
add constraint event_registration_questions_options_check
check (
  question_type = 'text'
  or (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2)
);
