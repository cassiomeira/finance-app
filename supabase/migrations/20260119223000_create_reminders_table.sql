
-- Create reminders table
create table public.reminders (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  description text null,
  date timestamp with time zone not null,
  type text not null check (type in ('personal', 'bill')),
  is_completed boolean not null default false,
  notification_id int, /* Stored to manage update/cancel of local notifications */
  created_at timestamp with time zone not null default now(),
  constraint reminders_pkey primary key (id),
  constraint reminders_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Enable RLS
alter table public.reminders enable row level security;

-- Create policies
create policy "Users can view their own reminders"
on public.reminders for select
using (auth.uid() = user_id);

create policy "Users can insert their own reminders"
on public.reminders for insert
with check (auth.uid() = user_id);

create policy "Users can update their own reminders"
on public.reminders for update
using (auth.uid() = user_id);

create policy "Users can delete their own reminders"
on public.reminders for delete
using (auth.uid() = user_id);
