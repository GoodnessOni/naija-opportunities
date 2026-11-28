-- Undo a wrong automated citizenship decision (one-off, reviewed). Adds one service-role-only function.
-- Changes no rows by itself. The listing must still be at the revision the automation wrote, and only
-- eligibility.citizenship (back to unknown), revision (+1), timestamps.updated_at and content_hash may differ.
begin;

create function public.revert_citizenship_automation(prior_revision integer, updated_record jsonb, reviewer text, reason text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  target text := updated_record->>'listing_id';
  strip text[] := array['{eligibility,citizenship}', '{revision}', '{content_hash}', '{timestamps,updated_at}'];
  path text;
  old_rest jsonb;
  new_rest jsonb := updated_record;
begin
  if updated_record #> '{eligibility,citizenship}' is distinct from '{"requirement":"unknown","countries":[]}'::jsonb
    or not exists (select 1 from listings.staff where reviewer_id = reviewer)
    or char_length(trim(coalesce(reason, ''))) not between 1 and 1000 then
    raise check_violation;
  end if;
  -- The latest decision for this listing must be the automated one that produced prior_revision.
  if not exists (
    select 1 from listings.citizenship_decisions d
    where d.listing_id = target and d.revision = prior_revision and d.method = 'automated_review'
      and d.id = (select max(id) from listings.citizenship_decisions where listing_id = target)
  ) then return false; end if;
  select record into old_rest from listings.listings
    where listing_id = target and (record->>'revision')::integer = prior_revision
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
  values (target, prior_revision + 1, updated_record #> '{eligibility,citizenship}', 'human_review', 'human', reviewer, trim(reason));
  return true;
end;
$$;

revoke all on function public.revert_citizenship_automation(integer, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.revert_citizenship_automation(integer, jsonb, text, text) to service_role;

commit;
