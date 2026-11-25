begin;
create table listings.staff_changes (
  id bigint generated always as identity primary key,
  listing_id text not null references listings.listings(listing_id),
  staff_user uuid not null,
  action text not null check (action in ('created','edited','withdrawn')),
  note text not null,
  changed_at timestamptz not null default now()
);
alter table listings.staff_changes enable row level security;

create function public.staff_listing(staff_user uuid, target_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select record from listings.listings where listing_id = target_id
    and record->'synthetic' = 'false'::jsonb
    and exists (select 1 from listings.staff where user_id = staff_user);
$$;

create function public.staff_save_listing(staff_user uuid, prior_revision integer, candidate jsonb, action_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  target text := candidate->>'listing_id';
  action text;
begin
  if not exists (select 1 from listings.staff where user_id = staff_user) then raise insufficient_privilege; end if;
  if candidate->'synthetic' is distinct from 'false'::jsonb or char_length(trim(action_note)) not between 1 and 1000 then
    raise check_violation;
  end if;
  if prior_revision = 0 then
    if candidate #>> '{lifecycle,publication_status}' is distinct from 'draft'
      or candidate->>'revision' is distinct from '1' then raise check_violation; end if;
    action := 'created';
    insert into listings.listings(record) values (candidate) on conflict do nothing;
  else
    action := case when candidate #>> '{lifecycle,publication_status}' = 'withdrawn' then 'withdrawn' else 'edited' end;
    if candidate #>> '{lifecycle,publication_status}' not in ('draft','published','withdrawn')
      or candidate #>> '{verification,state}' is distinct from 'unverified' then raise check_violation; end if;
    update listings.listings set record = candidate
    where listing_id = target and record->>'revision' = prior_revision::text
      and candidate->>'revision' = (prior_revision + 1)::text
      and record->'synthetic' = 'false'::jsonb
      and record #>> '{lifecycle,publication_status}' <> 'withdrawn'
      and (action <> 'withdrawn' or record #>> '{lifecycle,publication_status}' = 'published');
  end if;
  if not found then return false; end if;
  if action = 'edited' then
    update listings.submissions set state = 'in_review'
    where listing_id = target and state in ('received','published');
  end if;
  insert into listings.staff_changes(listing_id,staff_user,action,note) values(target,staff_user,action,action_note);
  return true;
end;
$$;

create function public.organisation_submission_status(owner_user uuid)
returns table(listing_id text, title text, state text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.listing_id,l.record->>'title',s.state,s.created_at
    from listings.submissions s
    join listings.organisations o on o.id=s.org_id
    join listings.listings l on l.listing_id=s.listing_id
    where o.auth_user_id=owner_user
    order by s.created_at desc limit 100;
$$;

revoke all on function public.staff_listing(uuid,text), public.staff_save_listing(uuid,integer,jsonb,text),
  public.organisation_submission_status(uuid) from public,anon,authenticated;
grant execute on function public.staff_listing(uuid,text), public.staff_save_listing(uuid,integer,jsonb,text),
  public.organisation_submission_status(uuid) to service_role;
create function public.staff_overview(staff_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'pending', count(*) filter (where record #>> '{lifecycle,publication_status}' = 'draft'),
    'ambiguous', count(*) filter (where record #>> '{verification,last_attempt_outcome}' = 'ambiguous'),
    'stale', count(*) filter (where record #>> '{lifecycle,publication_status}' = 'published'
      and record #>> '{lifecycle,status}' = 'open' and verified_until < now()),
    'closingSoon', count(*) filter (where record #>> '{lifecycle,publication_status}' = 'published'
      and record #>> '{lifecycle,status}' = 'open' and fixed_at between now() and now()+interval '7 days'),
    'published', count(*) filter (where record #>> '{lifecycle,publication_status}' = 'published')
  ) from listings.listings where record->'synthetic' = 'false'::jsonb
  and exists (select 1 from listings.staff where user_id = staff_user);
$$;
revoke all on function public.staff_overview(uuid) from public,anon,authenticated;
grant execute on function public.staff_overview(uuid) to service_role;
commit;
