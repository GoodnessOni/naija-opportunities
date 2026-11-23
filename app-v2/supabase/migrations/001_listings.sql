begin;

create schema if not exists listings;
revoke all on schema listings from public, anon, authenticated;

create table listings.listings (
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  listing_id text generated always as (record->>'listing_id') stored primary key
    check (listing_id ~ '^lst_[0-9A-HJKMNP-TV-Z]{26}$'),
  dedupe_key text generated always as (record->>'dedupe_key') stored not null unique
    check (dedupe_key ~ '^[a-f0-9]{64}$'),
  kind text generated always as (record->>'kind') stored not null,
  verified_until timestamptz,
  fixed_at timestamptz,
  check ((record->>'schema_version') is not distinct from '1.0.0')
);

create function listings.sync_listing_dates() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.verified_until := (new.record #>> '{verification,fresh_until}')::timestamptz;
  new.fixed_at := (new.record #>> '{deadline,fixed_at}')::timestamptz;
  return new;
end;
$$;
create trigger sync_listing_dates before insert or update on listings.listings
for each row execute function listings.sync_listing_dates();

create index listings_kind_freshness on listings.listings (kind, verified_until);
alter table listings.listings enable row level security;
grant usage on schema listings to service_role;
grant select, insert, update, delete on listings.listings to service_role;

create function public.active_listings(
  selected_kind text default null,
  selected_id text default null,
  search_text text default null,
  page_limit integer default 30
) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select item.record
    from listings.listings item
    where (selected_kind is null or item.kind = selected_kind)
      and (selected_id is null or item.listing_id = selected_id)
      and item.record->'synthetic' = 'false'::jsonb
      and item.record #>> '{lifecycle,publication_status}' = 'published'
      and item.record #>> '{lifecycle,status}' = 'open'
      and item.record #>> '{verification,state}' = 'verified'
      and item.record #>> '{verification,outcome}' = 'confirmed_open'
      and now() <= item.verified_until
      and (item.record #>> '{deadline,kind}' in ('rolling', 'unknown') or
        (item.record #>> '{deadline,kind}' = 'fixed' and now() <= item.fixed_at))
      and (nullif(trim(search_text), '') is null or
        to_tsvector('simple', concat_ws(' ', item.record->>'title', item.record #>> '{provider,name}',
          item.record->>'summary', item.record->>'description', item.record #>> '{location,locality}'))
        @@ websearch_to_tsquery('simple', left(search_text, 200)))
    order by case item.record #>> '{deadline,kind}' when 'fixed' then 0 when 'rolling' then 1 else 2 end,
      item.fixed_at asc nulls last, item.verified_until desc, item.listing_id
    limit greatest(1, least(coalesce(page_limit, 30), 100));
$$;
revoke all on function public.active_listings(text, text, text, integer) from public;
grant execute on function public.active_listings(text, text, text, integer) to anon, authenticated, service_role;

commit;
