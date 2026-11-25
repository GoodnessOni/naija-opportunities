begin;

create function public.browse_active_listings(
  selected_kind text default null,
  page_offset integer default 0,
  search_text text default null,
  page_limit integer default 30
) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select item.record
    from listings.listings item
    where (selected_kind is null or item.kind = selected_kind)

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
revoke all on function public.browse_active_listings(text, integer, text, integer) from public;
grant execute on function public.browse_active_listings(text, integer, text, integer) to anon, authenticated, service_role;

commit;
