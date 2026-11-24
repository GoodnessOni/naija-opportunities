begin;

create function public.sync_verified_greenhouse_job(candidate jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  target_id text;
begin
  if candidate->>'kind' is distinct from 'job'
    or candidate->'synthetic' is distinct from 'false'::jsonb
    or candidate #>> '{lifecycle,publication_status}' is distinct from 'published'
    or candidate #>> '{lifecycle,status}' is distinct from 'open'
    or candidate #>> '{verification,state}' is distinct from 'verified'
    or candidate #>> '{verification,outcome}' is distinct from 'confirmed_open'
    or candidate #>> '{verification,method}' is distinct from 'automated_review'
    or not coalesce(candidate #>> '{verification,source_checked_url}' ~
      '^https://boards-api[.]greenhouse[.]io/v1/boards/[a-zA-Z0-9_-]+/jobs$', false)
    or not coalesce(candidate #>> '{identity,round_evidence}' ~ '^greenhouse:[a-zA-Z0-9_-]+:[0-9]+$', false)
  then
    raise exception 'Expected a verified Greenhouse job';
  end if;

  insert into listings.listings as current_listing (record) values (candidate)
  on conflict (dedupe_key) do update
  set record = candidate || jsonb_build_object(
    'listing_id', current_listing.listing_id,
    'revision', (current_listing.record->>'revision')::integer + 1,
    'timestamps', candidate->'timestamps' || jsonb_build_object(
      'created_at', current_listing.record #> '{timestamps,created_at}',
      'published_at', coalesce(current_listing.record #>> '{timestamps,published_at}', candidate #>> '{timestamps,published_at}')
    )
  )
  where (
    (current_listing.record #>> '{lifecycle,publication_status}' = 'draft' and current_listing.record->>'revision' = '1')
    or (current_listing.record #>> '{verification,method}' = 'automated_review'
      and current_listing.record #>> '{lifecycle,publication_status}' = 'published'
      and current_listing.record #>> '{lifecycle,status}' = 'open')
  )
  and (candidate #>> '{verification,last_success_at}')::timestamptz >
    (current_listing.record #>> '{timestamps,updated_at}')::timestamptz
  returning listing_id into target_id;

  if not found then return false; end if;

  insert into listings.verification_attempts (listing_id, reviewer_id, source_checked_url, evidence, outcome)
  values (target_id, 'greenhouse-importer', candidate #>> '{verification,source_checked_url}',
    jsonb_build_object('posting', candidate #>> '{source,url}', 'presence', 'Listed on the employer board'),
    'confirmed_open');
  return true;
end;
$$;

revoke all on function public.sync_verified_greenhouse_job(jsonb) from public, anon, authenticated;
grant execute on function public.sync_verified_greenhouse_job(jsonb) to service_role;

commit;
