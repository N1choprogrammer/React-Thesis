-- Enforce stronger duplicate-account detection for Auth emails and profile names.
-- Email examples blocked:
--   aaronclauren@gmail.com
--   claurenaaron@gmail.com
--   aaron.clauren+1@googlemail.com
--
-- Profile examples blocked:
--   Aaron Manzano
--   Aaron Nicholas Manzano
--   Manzano Aaron

drop view if exists public.suspected_duplicate_profile_names cascade;
drop view if exists public.suspected_duplicate_auth_emails cascade;

create or replace function public.sort_text_chars(input_text text)
returns text
language sql
immutable
as $$
  select coalesce(string_agg(substr(input_text, i, 1), '' order by substr(input_text, i, 1), i), '')
  from generate_series(1, length(coalesce(input_text, ''))) as i;
$$;

create or replace function public.auth_email_fingerprint(input_email text)
returns text
language plpgsql
immutable
as $$
declare
  email_text text;
  local_part text;
  domain_part text;
begin
  email_text := lower(trim(coalesce(input_email, '')));

  if email_text = '' or position('@' in email_text) = 0 then
    return null;
  end if;

  local_part := split_part(email_text, '@', 1);
  domain_part := split_part(email_text, '@', 2);

  if local_part = '' or domain_part = '' then
    return null;
  end if;

  if domain_part = 'googlemail.com' then
    domain_part := 'gmail.com';
  end if;

  local_part := regexp_replace(local_part, '\+.*$', '', 'g');
  local_part := regexp_replace(local_part, '[^a-z0-9]', '', 'g');
  local_part := regexp_replace(local_part, '[0-9]+', '', 'g');

  if local_part = '' then
    return null;
  end if;

  return domain_part || ':' || local_part;
end;
$$;

create or replace function public.auth_email_sorted_fingerprint(input_email text)
returns text
language plpgsql
immutable
as $$
declare
  fingerprint text;
  domain_part text;
  local_part text;
begin
  fingerprint := public.auth_email_fingerprint(input_email);

  if fingerprint is null then
    return null;
  end if;

  domain_part := split_part(fingerprint, ':', 1);
  local_part := split_part(fingerprint, ':', 2);

  return domain_part || ':' || public.sort_text_chars(local_part);
end;
$$;

create or replace function public.before_user_created_detect_similar_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  incoming_email text;
  incoming_fingerprint text;
  incoming_sorted_fingerprint text;
  existing_user_id uuid;
begin
  incoming_email := event->'user'->>'email';
  incoming_fingerprint := public.auth_email_fingerprint(incoming_email);
  incoming_sorted_fingerprint := public.auth_email_sorted_fingerprint(incoming_email);

  if incoming_fingerprint is null then
    return event;
  end if;

  select id
  into existing_user_id
  from auth.users
  where public.auth_email_fingerprint(email) = incoming_fingerprint
     or public.auth_email_sorted_fingerprint(email) = incoming_sorted_fingerprint
  limit 1;

  if existing_user_id is not null then
    raise exception 'Email already exists.'
      using errcode = '23505',
            detail = 'Email already exists.';
  end if;

  return event;
end;
$$;

revoke all on function public.before_user_created_detect_similar_email(jsonb) from public;
grant execute on function public.before_user_created_detect_similar_email(jsonb) to supabase_auth_admin;

create or replace function public.profile_name_tokens(input_name text)
returns text[]
language plpgsql
immutable
as $$
declare
  cleaned text;
  tokens text[];
begin
  cleaned := lower(coalesce(input_name, ''));
  cleaned := regexp_replace(cleaned, '[^a-z0-9[:space:]]', ' ', 'g');
  cleaned := regexp_replace(cleaned, '[0-9]+', '', 'g');
  cleaned := regexp_replace(cleaned, '[[:space:]]+', ' ', 'g');
  cleaned := trim(cleaned);

  if cleaned = '' then
    return array[]::text[];
  end if;

  select array_agg(distinct token order by token)
  into tokens
  from unnest(regexp_split_to_array(cleaned, '[[:space:]]+')) as token
  where length(token) > 1;

  return coalesce(tokens, array[]::text[]);
end;
$$;

create or replace function public.profile_name_fingerprint(input_name text)
returns text
language plpgsql
immutable
as $$
declare
  tokens text[];
begin
  tokens := public.profile_name_tokens(input_name);

  if array_length(tokens, 1) is null then
    return null;
  end if;

  return array_to_string(tokens, ' ');
end;
$$;

alter table public.profiles
  add column if not exists full_name_fingerprint text;

create or replace function public.prevent_similar_profile_names()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tokens text[];
  duplicate_profile_id uuid;
begin
  new_tokens := public.profile_name_tokens(new.full_name);
  new.full_name_fingerprint := public.profile_name_fingerprint(new.full_name);

  if array_length(new_tokens, 1) is null then
    return new;
  end if;

  select existing.id
  into duplicate_profile_id
  from public.profiles as existing
  where existing.id <> new.id
    and (
      existing.full_name_fingerprint = new.full_name_fingerprint
      or (
        array_length(new_tokens, 1) >= 2
        and public.profile_name_tokens(existing.full_name) @> new_tokens
      )
      or (
        array_length(public.profile_name_tokens(existing.full_name), 1) >= 2
        and new_tokens @> public.profile_name_tokens(existing.full_name)
      )
    )
  limit 1;

  if duplicate_profile_id is not null then
    raise exception 'Username already exists.'
      using errcode = '23505',
            detail = 'Username already exists.';
  end if;

  return new;
end;
$$;

update public.profiles
set full_name_fingerprint = public.profile_name_fingerprint(full_name);

drop trigger if exists prevent_similar_profile_names_before_save on public.profiles;

create trigger prevent_similar_profile_names_before_save
before insert or update of full_name on public.profiles
for each row
execute function public.prevent_similar_profile_names();

create index if not exists profiles_full_name_fingerprint_idx
  on public.profiles (full_name_fingerprint)
  where full_name_fingerprint is not null;

create view public.suspected_duplicate_auth_emails as
select
  public.auth_email_sorted_fingerprint(email) as email_fingerprint,
  count(*) as account_count,
  array_agg(id order by created_at) as user_ids,
  array_agg(email order by created_at) as emails
from auth.users
where public.auth_email_sorted_fingerprint(email) is not null
group by public.auth_email_sorted_fingerprint(email)
having count(*) > 1;

create view public.suspected_duplicate_profile_names as
select
  a.id as profile_id,
  a.full_name,
  b.id as similar_profile_id,
  b.full_name as similar_full_name
from public.profiles a
join public.profiles b
  on a.id < b.id
 and (
   public.profile_name_tokens(a.full_name) @> public.profile_name_tokens(b.full_name)
   or public.profile_name_tokens(b.full_name) @> public.profile_name_tokens(a.full_name)
 );

revoke all on public.suspected_duplicate_auth_emails from public;
revoke all on public.suspected_duplicate_auth_emails from anon;
revoke all on public.suspected_duplicate_auth_emails from authenticated;
grant select on public.suspected_duplicate_auth_emails to service_role;

revoke all on public.suspected_duplicate_profile_names from public;
revoke all on public.suspected_duplicate_profile_names from anon;
revoke all on public.suspected_duplicate_profile_names from authenticated;
grant select on public.suspected_duplicate_profile_names to service_role;
