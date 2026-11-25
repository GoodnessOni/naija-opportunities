begin;

create function public.filter_active_listings(
  selected_kind text default null,
  page_offset integer default 0,
  search_text text default null,
  page_limit integer default 30,
  provider_type text default null,
  location_query text default null,
  work_arrangement text default null,
  deadline_type text default null,
  closes_within integer default null
) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select item.record
    from listings.listings item
    where (selected_kind is null or item.kind = selected_kind)

      and (provider_type is null or item.record #>> '{provider,type}' = provider_type)
      and (nullif(trim(location_query), '') is null or strpos(lower(concat_ws(' ',
        item.record #>> '{location,country}', item.record #>> '{location,locality}',
        case when item.record->>'summary' like 'Location listed by the employer:%' then item.record->>'summary' end)),
        lower(trim(location_query))) > 0)
      and (work_arrangement is null or item.record #>> '{location,arrangement}' = work_arrangement)
      and (deadline_type is null or item.record #>> '{deadline,kind}' = deadline_type)
      and (closes_within is null or (closes_within in (7, 14, 30)
        and item.record #>> '{deadline,kind}' = 'fixed'
        and item.fixed_at <= now() + closes_within * interval '1 day'))
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
    limit greatest(1, least(coalesce(page_limit, 30), 31)) offset greatest(0, coalesce(page_offset, 0));
$$;
revoke all on function public.filter_active_listings(text, integer, text, integer, text, text, text, text, integer) from public;
grant execute on function public.filter_active_listings(text, integer, text, integer, text, text, text, text, integer) to anon, authenticated, service_role;

commit;
