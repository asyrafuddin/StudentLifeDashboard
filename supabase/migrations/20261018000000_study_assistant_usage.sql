-- =============================================================================
-- Study assistant: a daily limit on AI requests per user.
--
-- Sign-up is open to anyone, so without a limit one account could send
-- thousands of AI requests and run up the bill. The Edge Function calls
-- claim_assistant_request() before every AI call; it records the request and
-- returns false once the user has made 20 in the last 24 hours.
--
-- Users can't read or change the usage table directly (no grants, no
-- policies). The only way in is the function below, which only ever acts on
-- the caller's own rows.
-- =============================================================================

create table public.assistant_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index assistant_requests_user_time_idx
  on public.assistant_requests (user_id, created_at);

revoke all on public.assistant_requests from anon, authenticated;
alter table public.assistant_requests enable row level security;


-- Runs with the owner's rights (security definer) because users have no
-- direct access to the table. It only touches rows of auth.uid(), the caller.
create or replace function public.claim_assistant_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  used   integer;
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  -- One claim at a time per user, so two simultaneous requests can't both
  -- slip in under the limit.
  perform pg_advisory_xact_lock(hashtextextended('assistant:' || caller::text, 0));

  -- Housekeeping: older rows no longer matter.
  delete from public.assistant_requests
   where user_id = caller and created_at < now() - interval '24 hours';

  select count(*) into used
    from public.assistant_requests
   where user_id = caller;

  if used >= 20 then
    return false;
  end if;

  insert into public.assistant_requests (user_id) values (caller);
  return true;
end;
$$;

revoke execute on function public.claim_assistant_request() from public, anon;
grant execute on function public.claim_assistant_request() to authenticated;
