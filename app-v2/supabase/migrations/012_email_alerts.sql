begin;
create table listings.email_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null check (kind in ('','job','internship','scholarship')),
  keyword text not null check (length(keyword) <= 200),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (email,kind,keyword)
);
alter table listings.email_alerts enable row level security;

create function public.create_email_alert(address text, category text, keyword_query text)
returns uuid language sql security definer set search_path = '' as $$
  insert into listings.email_alerts(email,kind,keyword) values (address,category,keyword_query)
  on conflict (email,kind,keyword) do update set created_at=now()
    where listings.email_alerts.confirmed_at is null
      and listings.email_alerts.created_at < now()-interval '15 minutes'
  returning id;
$$;

create function public.change_email_alert(alert_id uuid, operation text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if operation = 'unsubscribe' then
    delete from listings.email_alerts where id=alert_id;
  elsif operation = 'confirm' then
    update listings.email_alerts set confirmed_at=coalesce(confirmed_at,now())
      where id=alert_id and (confirmed_at is not null or created_at>=now()-interval '48 hours');
  else
    raise check_violation;
  end if;
  return found;
end;
$$;

create function public.email_alert_digest(window_start timestamptz, window_end timestamptz)
returns table(id uuid,email text,matches jsonb)
language sql stable security definer set search_path = '' as $$
  select a.id,a.email,d.matches
  from listings.email_alerts a
  cross join lateral (
    select jsonb_agg(hit.record order by hit.fixed_at nulls last,hit.listing_id) as matches
    from (
      select l.record,l.fixed_at,l.listing_id from listings.listings l
      where (a.kind='' or a.kind=l.kind)
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

revoke all on function public.create_email_alert(text,text,text),public.change_email_alert(uuid,text),
  public.email_alert_digest(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.create_email_alert(text,text,text),public.change_email_alert(uuid,text),
  public.email_alert_digest(timestamptz,timestamptz) to service_role;
commit;
