-- Read one listing by id for the citizenship revert script, whether or not it is on the active feed.
-- Same scope as citizenship_candidates: non-synthetic and not withdrawn. Read-only, service role only.
begin;

create function public.citizenship_listing(target_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select record from listings.listings
  where listing_id = target_id
    and record->'synthetic' = 'false'::jsonb
    and record #>> '{lifecycle,publication_status}' <> 'withdrawn';
$$;

revoke all on function public.citizenship_listing(text) from public, anon, authenticated;
grant execute on function public.citizenship_listing(text) to service_role;

commit;
