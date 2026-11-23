begin;
create table listings.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reviewer_id text unique not null check (reviewer_id ~ '^[a-z0-9]+([-_][a-z0-9]+)*$'),
  role text not null check (role in ('reviewer', 'admin'))
);
create table listings.verification_attempts (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references listings.listings(listing_id),
  attempted_at timestamptz not null default statement_timestamp(),
  reviewer_id text not null,
  source_checked_url text not null,
  evidence jsonb not null,
  outcome text not null check (outcome in ('confirmed_open', 'confirmed_closed', 'inconclusive', 'failed'))
);
alter table listings.staff enable row level security;
alter table listings.verification_attempts enable row level security;

create function public.staff_review_queue(staff_user uuid)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select l.record from listings.listings l
  where exists (select from listings.staff s where s.user_id = staff_user)
    and l.record->'synthetic' = 'false'::jsonb
    and (l.record #>> '{lifecycle,publication_status}' = 'draft' or
      (l.record #>> '{lifecycle,publication_status}' = 'published'
        and l.record #>> '{lifecycle,status}' = 'open'
        and (l.verified_until is null or l.verified_until <= now() + interval '24 hours'
          or l.record #>> '{verification,last_attempt_outcome}' in ('ambiguous', 'failed'))))
  order by l.fixed_at nulls last, l.record #>> '{timestamps,created_at}', l.listing_id
  limit 100;
$$;

create function public.record_staff_review(
  staff_user uuid, prior_revision integer, updated_record jsonb, review_evidence jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  reviewer text;
  target_id text := updated_record->>'listing_id';
  review_outcome text := updated_record #>> '{verification,last_attempt_outcome}';
begin
  select reviewer_id into reviewer from listings.staff where user_id = staff_user;
  if reviewer is null then raise insufficient_privilege; end if;
  update listings.listings l set record = updated_record
    where l.listing_id = target_id and (l.record->>'revision')::integer = prior_revision
      and (updated_record->>'revision')::integer = prior_revision + 1
      and l.record->'synthetic' = 'false'::jsonb;
  if not found then return false; end if;

  insert into listings.verification_attempts (listing_id, reviewer_id, source_checked_url, evidence, outcome)
  values (target_id, reviewer, updated_record #>> '{source,url}', review_evidence,
    case when review_outcome = 'ambiguous' then 'inconclusive' else review_outcome end);
  return true;
end;
$$;

create function public.staff_reviewer(staff_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select reviewer_id from listings.staff where user_id = staff_user;
$$;

revoke all on function public.staff_review_queue(uuid), public.staff_reviewer(uuid),
  public.record_staff_review(uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.staff_review_queue(uuid), public.staff_reviewer(uuid),
  public.record_staff_review(uuid, integer, jsonb, jsonb) to service_role;
commit;
