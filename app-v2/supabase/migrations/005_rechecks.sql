begin;
create table listings.recheck_queue (
  listing_id text primary key references listings.listings(listing_id) on delete cascade,
  requested_at timestamptz not null default statement_timestamp(),
  revision integer not null
);
alter table listings.recheck_queue enable row level security;

create function public.enqueue_listing_rechecks()
returns integer language sql security definer set search_path = '' as $$
  with inserted as (
    insert into listings.recheck_queue(listing_id, revision)
    select item.listing_id, (item.record->>'revision')::integer
      from listings.listings item
      where item.record->'synthetic' = 'false'::jsonb
        and item.record #>> '{lifecycle,publication_status}' = 'published'
        and item.record #>> '{lifecycle,status}' = 'open'
        and (item.fixed_at is null or item.fixed_at >= now())
        and (item.verified_until is null or item.verified_until <= now() + interval '24 hours')
    on conflict (listing_id) do update set revision = excluded.revision
      where listings.recheck_queue.revision < excluded.revision
    returning 1
  )
  select count(*)::integer from inserted;
$$;

create function listings.clear_recheck_after_review()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.outcome in ('confirmed_open', 'confirmed_closed') then
    delete from listings.recheck_queue where listing_id = new.listing_id;
  end if;
  return new;
end;
$$;
create trigger clear_recheck_after_review after insert on listings.verification_attempts
  for each row execute function listings.clear_recheck_after_review();

revoke all on function public.enqueue_listing_rechecks() from public, anon, authenticated;
grant execute on function public.enqueue_listing_rechecks() to service_role;
commit;
