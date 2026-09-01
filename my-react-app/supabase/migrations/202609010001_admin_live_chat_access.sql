create table if not exists public.admin_chat_threads (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  email text,
  phone text,
  status text not null default 'waiting_admin' check (status in ('waiting_admin', 'waiting_customer', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.admin_chat_threads(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  sender_name text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_chat_threads enable row level security;
alter table public.admin_chat_messages enable row level security;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'admin_chat_threads'
      and constraint_name = 'admin_chat_threads_status_check'
  ) then
    alter table public.admin_chat_threads drop constraint admin_chat_threads_status_check;
  end if;
end $$;

alter table public.admin_chat_threads
  add constraint admin_chat_threads_status_check
  check (status in ('waiting_admin', 'waiting_customer', 'closed'))
  not valid;

alter table public.admin_chat_threads validate constraint admin_chat_threads_status_check;

drop policy if exists "Anon customers can create admin chat threads" on public.admin_chat_threads;
create policy "Anon customers can create admin chat threads"
on public.admin_chat_threads
for insert
to anon
with check (true);

drop policy if exists "Allowed anon select of admin chat threads" on public.admin_chat_threads;
create policy "Allowed anon select of admin chat threads"
on public.admin_chat_threads
for select
to anon
using (true);

drop policy if exists "Admins can manage admin chat threads" on public.admin_chat_threads;
create policy "Admins can manage admin chat threads"
on public.admin_chat_threads
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Anon customers can create admin chat messages" on public.admin_chat_messages;
create policy "Anon customers can create admin chat messages"
on public.admin_chat_messages
for insert
to anon
with check (
  sender = 'customer' and exists (
    select 1
    from public.admin_chat_threads
    where admin_chat_threads.id = admin_chat_messages.thread_id
  )
);

drop policy if exists "Allowed anon select of admin chat messages" on public.admin_chat_messages;
create policy "Allowed anon select of admin chat messages"
on public.admin_chat_messages
for select
to anon
using (true);

drop policy if exists "Admins can manage admin chat messages" on public.admin_chat_messages;
create policy "Admins can manage admin chat messages"
on public.admin_chat_messages
for all
to authenticated
using (true)
with check (true);
