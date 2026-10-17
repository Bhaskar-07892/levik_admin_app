-- Minimal stand-in for the parts of Supabase the migrations depend on, so they can be tested against a
-- plain local Postgres 17 without Docker. NOT used on Supabase itself (it already provides all of this).
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create schema extensions;
create extension pgcrypto schema extensions;

create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text, phone text unique,
  encrypted_password text, email_confirmed_at timestamptz, phone_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
  confirmation_token text, email_change text, email_change_token_new text, recovery_token text
);
create table auth.identities (
  id uuid primary key, user_id uuid references auth.users (id), provider_id text, identity_data jsonb, provider text,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
);

-- Same contract as Supabase: claims come from the request.jwt.claims setting set per request.
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
