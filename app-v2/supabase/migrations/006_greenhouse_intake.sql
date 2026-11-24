begin;

create function public.insert_greenhouse_draft(candidate jsonb)
returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if candidate->>'kind' is distinct from 'job'
    or candidate->'synthetic' is distinct from 'false'::jsonb
    or candidate #>> '{lifecycle,publication_status}' is distinct from 'draft'
    or candidate #>> '{verification,state}' is distinct from 'unverified'
    or candidate #>> '{identity,round_key}' !~ '^greenhouse-'
    or candidate #>> '{identity,round_key}' is null then
    raise exception 'Expected an unverified Greenhouse job draft';
  end if;
  insert into listings.listings (record) values (candidate)
  on conflict (dedupe_key) do nothing;
  return found;
end;
$$;

revoke all on function public.insert_greenhouse_draft(jsonb) from public, anon, authenticated;
grant execute on function public.insert_greenhouse_draft(jsonb) to service_role;

commit;
