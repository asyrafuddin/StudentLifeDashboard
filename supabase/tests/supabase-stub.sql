-- Minimal stand-in for the parts of Supabase our migration depends on, so the
-- migration can be tested in a plain PostgreSQL (PGlite) without Docker.
-- This file is ONLY for tests; never run it against a real Supabase project.

create role anon nologin;
create role authenticated nologin;

create schema auth;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Same idea as Supabase's real auth.uid(): read the user id from the JWT claim
-- that the API sets for each request. Tests set it with set_config().
create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant execute on function auth.uid() to anon, authenticated;
