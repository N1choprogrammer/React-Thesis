-- -- Re-apply active similar-email protection for projects where the older
-- -- migration was already recorded while commented out.

-- create or replace function public.auth_email_fingerprint(input_email text)
-- returns text
-- language plpgsql
-- immutable
-- as $$
-- declare
--   email_text text;
--   local_part text;
--   domain_part text;
-- begin
--   email_text := lower(trim(coalesce(input_email, '')));

--   if email_text = '' or position('@' in email_text) = 0 then
--     return null;
--   end if;

--   local_part := split_part(email_text, '@', 1);
--   domain_part := split_part(email_text, '@', 2);

--   if local_part = '' or domain_part = '' then
--     return null;
--   end if;

--   if domain_part = 'googlemail.com' then
--     domain_part := 'gmail.com';
--   end if;

--   local_part := regexp_replace(local_part, '\+.*$', '', 'g');
--   local_part := regexp_replace(local_part, '[^a-z0-9]', '', 'g');
--   local_part := regexp_replace(local_part, '[0-9]+', '', 'g');

--   if local_part = '' then
--     return null;
--   end if;

--   return domain_part || ':' || local_part;
-- end;
-- $$;

-- create or replace function public.reverse_text(input_text text)
-- returns text
-- language sql
-- immutable
-- as $$
--   select string_agg(substr(input_text, i, 1), '' order by i desc)
--   from generate_series(1, length(input_text)) as i;
-- $$;

-- create or replace function public.auth_email_reversal_fingerprint(input_email text)
-- returns text
-- language plpgsql
-- immutable
-- as $$
-- declare
--   fingerprint text;
--   domain_part text;
--   local_part text;
--   reversed_local_part text;
-- begin
--   fingerprint := public.auth_email_fingerprint(input_email);

--   if fingerprint is null then
--     return null;
--   end if;

--   domain_part := split_part(fingerprint, ':', 1);
--   local_part := split_part(fingerprint, ':', 2);
--   reversed_local_part := public.reverse_text(local_part);

--   if local_part <= reversed_local_part then
--     return domain_part || ':' || local_part || ':' || reversed_local_part;
--   end if;

--   return domain_part || ':' || reversed_local_part || ':' || local_part;
-- end;
-- $$;

-- create or replace function public.before_user_created_detect_similar_email(event jsonb)
-- returns jsonb
-- language plpgsql
-- security definer
-- set search_path = public, auth
-- as $$
-- declare
--   incoming_email text;
--   incoming_fingerprint text;
--   incoming_reversal_fingerprint text;
--   existing_user_id uuid;
-- begin
--   incoming_email := event->'user'->>'email';
--   incoming_fingerprint := public.auth_email_fingerprint(incoming_email);
--   incoming_reversal_fingerprint := public.auth_email_reversal_fingerprint(incoming_email);

--   if incoming_fingerprint is null then
--     return event;
--   end if;

--   select id
--   into existing_user_id
--   from auth.users
--   where public.auth_email_fingerprint(email) = incoming_fingerprint
--      or public.auth_email_reversal_fingerprint(email) = incoming_reversal_fingerprint
--   limit 1;

--   if existing_user_id is not null then
--     raise exception 'Email already exists.'
--       using errcode = '23505',
--             detail = 'Email already exists.';
--   end if;

--   return event;
-- end;
-- $$;

-- revoke all on function public.before_user_created_detect_similar_email(jsonb) from public;
-- grant execute on function public.before_user_created_detect_similar_email(jsonb) to supabase_auth_admin;

-- create or replace view public.suspected_duplicate_auth_emails as
-- select
--   public.auth_email_reversal_fingerprint(email) as email_fingerprint,
--   count(*) as account_count,
--   array_agg(id order by created_at) as user_ids,
--   array_agg(email order by created_at) as emails
-- from auth.users
-- where public.auth_email_reversal_fingerprint(email) is not null
-- group by public.auth_email_reversal_fingerprint(email)
-- having count(*) > 1;

-- revoke all on public.suspected_duplicate_auth_emails from public;
-- revoke all on public.suspected_duplicate_auth_emails from anon;
-- revoke all on public.suspected_duplicate_auth_emails from authenticated;
-- grant select on public.suspected_duplicate_auth_emails to service_role;
