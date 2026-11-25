-- Staff audit log (brief Phase 2, item 4): every edit, withdrawal and verification with who, when and a note.
-- Read-only function over the two existing tables. Creates no tables and changes no rows.
begin;

create function public.staff_audit(staff_user uuid, page_limit integer default 100, before_at timestamptz default null)
returns table (at timestamptz, actor text, action text, listing_id text, title text, note text)
language sql stable security definer set search_path = '' as $$
  with events as (
    select c.changed_at as at, coalesce(s.reviewer_id, 'unknown') as actor, c.action, c.listing_id, c.note
    from listings.staff_changes c left join listings.staff s on s.user_id = c.staff_user
    union all
    select v.attempted_at, v.reviewer_id, 'verified_' || v.outcome, v.listing_id,
      'Checked ' || v.source_checked_url
    from listings.verification_attempts v
  )
  select e.at, e.actor, e.action, e.listing_id, l.record ->> 'title', e.note
  from events e join listings.listings l on l.listing_id = e.listing_id
  where exists (select 1 from listings.staff where user_id = staff_user)
    and (before_at is null or e.at < before_at)
  order by e.at desc
  limit greatest(1, least(coalesce(page_limit, 100), 200));
$$;

revoke all on function public.staff_audit(uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.staff_audit(uuid, integer, timestamptz) to service_role;

commit;
