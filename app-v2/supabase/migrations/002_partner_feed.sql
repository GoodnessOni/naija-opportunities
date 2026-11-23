begin;

create function public.partner_listings(
  evaluated_at timestamptz, after_id text, selected_id text, page_limit integer
) returns table (listing_id text, record jsonb, reason text)
language sql stable security definer set search_path = '' as $$
  with evaluated as (
    select item.listing_id, item.record,
      case
        when item.record->'synthetic' is distinct from 'false'::jsonb
          or item.record #>> '{lifecycle,publication_status}' = 'draft' then 'not_found'
        when item.record #>> '{lifecycle,publication_status}' = 'withdrawn' then 'withdrawn'
        when item.record #>> '{lifecycle,status}' = 'expired' then 'expired_deadline'
        when item.record #>> '{lifecycle,status}' = 'closed' then 'closed'
        when item.record #>> '{lifecycle,publication_status}' is distinct from 'published'
          or item.record #>> '{lifecycle,status}' is distinct from 'open' then 'not_on_active_feed'
        when item.record #>> '{verification,state}' is distinct from 'verified'
          or item.record #>> '{verification,outcome}' is distinct from 'confirmed_open' then 'missing'
        when item.record #>> '{deadline,kind}' = 'fixed'
          and (item.fixed_at is null or item.fixed_at < evaluated_at) then 'expired_deadline'
        when item.verified_until is null or item.verified_until < evaluated_at then 'stale'
        when item.verified_until - interval '168 hours' > evaluated_at then 'missing'
        else null
      end as reason
    from listings.listings item
    where (after_id is null or item.listing_id > after_id)
      and (selected_id is null or item.listing_id = selected_id)
  )
  select evaluated.listing_id,
    case when evaluated.reason is null then evaluated.record else null end,
    evaluated.reason
  from evaluated
  where selected_id is not null or evaluated.reason is null
  order by evaluated.listing_id
  limit greatest(1, least(coalesce(page_limit, 25), 101));
$$;

revoke all on function public.partner_listings(timestamptz, text, text, integer) from public, anon, authenticated;
grant execute on function public.partner_listings(timestamptz, text, text, integer) to service_role;

commit;
