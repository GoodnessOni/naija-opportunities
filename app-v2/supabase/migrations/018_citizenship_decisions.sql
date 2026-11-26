-- Citizenship fill-in: rule-based decisions for listings whose citizenship is "unknown".
-- Adds one log table and three service-role-only functions. Changes no rows by itself.
-- A write may change only eligibility.citizenship, revision (+1), timestamps.updated_at and content_hash.
-- Freshness and verification are never touched.
begin;

create table listings.citizenship_decisions (
  id bigint generated always as identity primary key,
  listing_id text not null references listings.listings(listing_id),
  revision integer not null,
  citizenship jsonb not null,
  method text not null check (method in ('automated_review', 'human_review')),
  reviewed_by text not null check (reviewed_by in ('automation', 'human')),
  reviewer_id text,
  evidence text not null check (char_length(evidence) between 1 and 1000),
  decided_at timestamptz not null default now(),
  check ((method = 'automated_review' and reviewed_by = 'automation' and reviewer_id is null)
    or (method = 'human_review' and reviewed_by = 'human' and reviewer_id is not null))
);
alter table listings.citizenship_decisions enable row level security;
revoke all on listings.citizenship_decisions from public, anon, authenticated;

create function listings.write_citizenship(prior_revision integer, updated_record jsonb, decision_evidence text,
  decision_reviewer text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  target text := updated_record->>'listing_id';
  strip text[] := array['{eligibility,citizenship}', '{revision}', '{content_hash}', '{timestamps,updated_at}'];
  rule jsonb := updated_record #> '{eligibility,citizenship}';
  path text;
  old_rest jsonb;
  new_rest jsonb := updated_record;
begin
  if rule->>'requirement' not in ('explicit', 'unconstrained') then raise check_violation; end if;
  select record into old_rest from listings.listings
    where listing_id = target and record->'synthetic' = 'false'::jsonb
      and record #>> '{eligibility,citizenship,requirement}' = 'unknown'
      and (record->>'revision')::integer = prior_revision
      and (updated_record->>'revision')::integer = prior_revision + 1
    for update;
  if not found then return false; end if;
  foreach path in array strip loop
    old_rest := old_rest #- path::text[];
    new_rest := new_rest #- path::text[];
  end loop;
  if old_rest is distinct from new_rest then raise check_violation; end if;

  update listings.listings set record = updated_record where listing_id = target;
  insert into listings.citizenship_decisions(listing_id, revision, citizenship, method, reviewed_by, reviewer_id, evidence)
  values (target, prior_revision + 1, rule,
    case when decision_reviewer is null then 'automated_review' else 'human_review' end,
    case when decision_reviewer is null then 'automation' else 'human' end,
    decision_reviewer, decision_evidence);
  return true;
end;
$$;
revoke all on function listings.write_citizenship(integer, jsonb, text, text) from public, anon, authenticated;

-- Automated rule match: method automated_review, reviewed_by automation, reviewer_id null.
create function public.apply_citizenship_automation(prior_revision integer, updated_record jsonb, decision_evidence text)
returns boolean language sql security definer set search_path = '' as $$
  select listings.write_citizenship(prior_revision, updated_record, decision_evidence, null);
$$;

-- Staff "Approve all" for suggestions: recorded as a human decision by the signed-in reviewer.
create function public.staff_apply_citizenship(staff_user uuid, prior_revision integer, updated_record jsonb, decision_evidence text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare reviewer text;
begin
  select reviewer_id into reviewer from listings.staff where user_id = staff_user;
  if reviewer is null then raise insufficient_privilege; end if;
  return listings.write_citizenship(prior_revision, updated_record, decision_evidence, reviewer);
end;
$$;

-- Non-synthetic, non-withdrawn listings whose citizenship is still unknown.
create function public.citizenship_candidates()
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select record from listings.listings
  where record->'synthetic' = 'false'::jsonb
    and record #>> '{lifecycle,publication_status}' <> 'withdrawn'
    and record #>> '{eligibility,citizenship,requirement}' = 'unknown'
  order by listing_id;
$$;

revoke all on function public.apply_citizenship_automation(integer, jsonb, text),
  public.staff_apply_citizenship(uuid, integer, jsonb, text), public.citizenship_candidates() from public, anon, authenticated;
grant execute on function public.apply_citizenship_automation(integer, jsonb, text),
  public.staff_apply_citizenship(uuid, integer, jsonb, text), public.citizenship_candidates() to service_role;

commit;
