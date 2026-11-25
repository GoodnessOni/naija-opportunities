begin;
alter table listings.email_alerts add column filters jsonb not null default '{}'::jsonb;
alter table listings.email_alerts drop constraint email_alerts_email_kind_keyword_key;
alter table listings.email_alerts add unique (email,kind,keyword,filters);

create function public.create_filtered_email_alert(address text, category text, keyword_query text, saved_filters jsonb)
returns uuid language sql security definer set search_path = '' as $$
  insert into listings.email_alerts(email,kind,keyword,filters)
  values (address,category,keyword_query,saved_filters)
  on conflict (email,kind,keyword,filters) do update set created_at=now()
    where listings.email_alerts.confirmed_at is null
      and listings.email_alerts.created_at < now()-interval '15 minutes'
  returning id;
$$;

create or replace function public.create_email_alert(address text, category text, keyword_query text)
returns uuid language sql security definer set search_path = '' as $$
  select public.create_filtered_email_alert(address,category,keyword_query,'{}'::jsonb);
$$;create or replace function public.email_alert_digest(window_start timestamptz, window_end timestamptz)
returns table(id uuid,email text,matches jsonb)
language sql stable security definer set search_path = '' as $$
  select a.id,a.email,d.matches
  from listings.email_alerts a
  cross join lateral (
    select jsonb_agg(hit.record order by hit.fixed_at nulls last,hit.listing_id) as matches
    from (
      select l.record,l.fixed_at,l.listing_id from listings.listings l
      where (a.kind='' or a.kind=l.kind)
        and (not (a.filters ? 'provider_type') or l.record #>> '{provider,type}' = a.filters->>'provider_type')
        and (not (a.filters ? 'work_arrangement') or l.record #>> '{location,arrangement}' = a.filters->>'work_arrangement')
        and (not (a.filters ? 'deadline_type') or l.record #>> '{deadline,kind}' = a.filters->>'deadline_type')
        and (not (a.filters ? 'location_query') or strpos(lower(concat_ws(' ',
          l.record #>> '{location,country}', l.record #>> '{location,locality}',
          case when l.record->>'summary' like 'Location listed by the employer:%' then l.record->>'summary' end)),
          lower(a.filters->>'location_query')) > 0)
        and (not (a.filters ? 'closes_within') or (l.record #>> '{deadline,kind}' = 'fixed'
          and l.fixed_at <= now() + (a.filters->>'closes_within')::integer * interval '1 day'))
        and l.record->'synthetic'='false'::jsonb
        and l.record #>> '{lifecycle,publication_status}'='published'
        and l.record #>> '{lifecycle,status}'='open'
        and l.record #>> '{verification,state}'='verified'
        and l.record #>> '{verification,outcome}'='confirmed_open'
        and l.verified_until>=now()
        and (l.fixed_at is null or l.fixed_at>=now())
        and (l.record #>> '{timestamps,published_at}')::timestamptz >= greatest(window_start,a.confirmed_at)
        and (l.record #>> '{timestamps,published_at}')::timestamptz < window_end
        and (a.keyword='' or to_tsvector('simple',concat_ws(' ',l.record->>'title',
          l.record #>> '{provider,name}',l.record->>'summary',l.record->>'description',
          l.record #>> '{location,locality}')) @@ websearch_to_tsquery('simple',a.keyword))
      order by l.fixed_at nulls last,l.listing_id limit 30
    ) hit
  ) d
  where a.confirmed_at is not null and d.matches is not null
  order by a.id;
$$;

revoke all on function public.create_filtered_email_alert(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_filtered_email_alert(text,text,text,jsonb) to service_role;
commit;
