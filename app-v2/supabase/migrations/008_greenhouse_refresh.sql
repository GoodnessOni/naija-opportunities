begin;

create function public.refresh_verified_greenhouse_job(candidate jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from listings.listings item
    where item.dedupe_key = candidate->>'dedupe_key'
      and item.record #>> '{verification,method}' = 'automated_review'
      and item.record #>> '{lifecycle,publication_status}' = 'published'
      and item.record #>> '{lifecycle,status}' = 'open'
    for update;
  if not found then return false; end if;
  return public.sync_verified_greenhouse_job(candidate);
end;
$$;

create function public.reconcile_greenhouse_snapshot(board text, present_keys text[], observed_at timestamptz)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  checked_url text := 'https://boards-api.greenhouse.io/v1/boards/' || board || '/jobs';
  observed_iso text := to_char(observed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  total integer;
  missing integer;
  hidden integer;
begin
  if board is null or board !~ '^[a-zA-Z0-9_-]{1,80}$'
    or coalesce(cardinality(present_keys), 0) = 0
    or observed_at is null or observed_at > now() or observed_at < now() - interval '30 minutes'
    or exists (
      select from unnest(present_keys) key
      where key is null or key !~ ('^greenhouse:' || board || ':[0-9]+$')
    )
  then
    raise exception 'Invalid Greenhouse board snapshot';
  end if;

  select count(*), count(*) filter (where not ((record #>> '{identity,round_evidence}') = any(present_keys)))
    into total, missing
  from listings.listings
  where record #>> '{verification,source_checked_url}' = checked_url
    and record #>> '{verification,method}' = 'automated_review'
    and record #>> '{verification,state}' = 'verified'
    and record #>> '{lifecycle,publication_status}' = 'published'
    and record #>> '{lifecycle,status}' = 'open';
  if missing > greatest(1, total / 5) then
    raise exception 'Unexpectedly many postings missing from Greenhouse board';
  end if;

  with changed as (
    update listings.listings item
    set record = item.record || jsonb_build_object(
      'revision', (item.record->>'revision')::integer + 1,
      'verification', (item.record->'verification') || jsonb_build_object(
        'state', 'unverified', 'outcome', null, 'last_success_at', null, 'fresh_until', null,
        'last_attempt_at', observed_iso, 'last_attempt_outcome', 'ambiguous'
      ),
      'timestamps', (item.record->'timestamps') || jsonb_build_object('updated_at', observed_iso)
    )
    where item.record #>> '{verification,source_checked_url}' = checked_url
      and item.record #>> '{verification,method}' = 'automated_review'
      and item.record #>> '{verification,state}' = 'verified'
      and item.record #>> '{lifecycle,publication_status}' = 'published'
      and item.record #>> '{lifecycle,status}' = 'open'
      and (item.record #>> '{timestamps,updated_at}')::timestamptz < observed_at
      and not ((item.record #>> '{identity,round_evidence}') = any(present_keys))
    returning item.listing_id
  )
  insert into listings.verification_attempts (listing_id, reviewer_id, source_checked_url, evidence, outcome)
  select listing_id, 'greenhouse-importer', checked_url,
    jsonb_build_object('presence', 'Missing from a complete employer board snapshot'), 'inconclusive'
  from changed;
  get diagnostics hidden = row_count;
  return hidden;
end;
$$;

revoke all on function public.refresh_verified_greenhouse_job(jsonb),
  public.reconcile_greenhouse_snapshot(text, text[], timestamptz) from public, anon, authenticated;
grant execute on function public.refresh_verified_greenhouse_job(jsonb),
  public.reconcile_greenhouse_snapshot(text, text[], timestamptz) to service_role;

commit;
