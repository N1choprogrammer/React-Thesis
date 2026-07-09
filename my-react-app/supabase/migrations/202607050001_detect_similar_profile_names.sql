-- -- Detect likely duplicate customer profiles by comparing normalized name fingerprints.
-- -- This catches simple spam patterns such as reversed first/surname order or added numbers.

-- alter table public.profiles
--   add column if not exists full_name_fingerprint text;

-- create or replace function public.profile_name_fingerprint(input_name text)
-- returns text
-- language plpgsql
-- immutable
-- as $$
-- declare
--   cleaned text;
--   tokens text[];
-- begin
--   cleaned := lower(coalesce(input_name, ''));
--   cleaned := regexp_replace(cleaned, '[^a-z0-9[:space:]]', ' ', 'g');
--   cleaned := regexp_replace(cleaned, '[0-9]+', '', 'g');
--   cleaned := regexp_replace(cleaned, '[[:space:]]+', ' ', 'g');
--   cleaned := trim(cleaned);

--   if cleaned = '' then
--     return null;
--   end if;

--   select array_agg(token order by token)
--   into tokens
--   from unnest(regexp_split_to_array(cleaned, '[[:space:]]+')) as token
--   where length(token) > 1;

--   if tokens is null or array_length(tokens, 1) is null then
--     return null;
--   end if;

--   return array_to_string(tokens, ' ');
-- end;
-- $$;

-- create or replace function public.prevent_similar_profile_names()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- declare
--   duplicate_profile_id uuid;
-- begin
--   new.full_name_fingerprint := public.profile_name_fingerprint(new.full_name);

--   if new.full_name_fingerprint is null then
--     return new;
--   end if;

--   select id
--   into duplicate_profile_id
--   from public.profiles
--   where full_name_fingerprint = new.full_name_fingerprint
--     and id <> new.id
--   limit 1;

--   if duplicate_profile_id is not null then
--     raise exception 'Username already exists.'
--       using errcode = '23505',
--             detail = 'Username already exists.';
--   end if;

--   return new;
-- end;
-- $$;

-- update public.profiles
-- set full_name_fingerprint = public.profile_name_fingerprint(full_name)
-- where full_name_fingerprint is null;

-- drop trigger if exists prevent_similar_profile_names_before_save on public.profiles;

-- create trigger prevent_similar_profile_names_before_save
-- before insert or update of full_name on public.profiles
-- for each row
-- execute function public.prevent_similar_profile_names();

-- create index if not exists profiles_full_name_fingerprint_idx
--   on public.profiles (full_name_fingerprint)
--   where full_name_fingerprint is not null;

-- create or replace view public.suspected_duplicate_profile_names as
-- select
--   full_name_fingerprint,
--   count(*) as account_count,
--   array_agg(id order by id) as profile_ids,
--   array_agg(full_name order by full_name) as full_names
-- from public.profiles
-- where full_name_fingerprint is not null
-- group by full_name_fingerprint
-- having count(*) > 1;
