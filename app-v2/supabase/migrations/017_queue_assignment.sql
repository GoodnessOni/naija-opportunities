-- Staff workload (brief Phase 2, item 6): assign queue items to a reviewer.
-- Adds one table and two staff-only functions. Changes no existing rows.
begin;

create table listings.queue_assignments (
  listing_id text primary key references listings.listings(listing_id) on delete cascade,
  reviewer_id text not null references listings.staff(reviewer_id),
  assigned_at timestamptz not null default now()
);
alter table listings.queue_assignments enable row level security;
revoke all on listings.queue_assignments from public, anon, authenticated;

create function public.staff_queue_assignments(staff_user uuid)
returns table (listing_id text, reviewer_id text, assigned_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.listing_id, a.reviewer_id, a.assigned_at from listings.queue_assignments a
  where exists (select 1 from listings.staff where user_id = staff_user);
$$;

-- assignee null clears the assignment. Returns false when the caller is not staff or the reviewer is unknown.
create function public.staff_assign(staff_user uuid, target_id text, assignee text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from listings.staff where user_id = staff_user) then return false; end if;
  if assignee is null then
    delete from listings.queue_assignments where listing_id = target_id;
    return true;
  end if;
  if not exists (select 1 from listings.staff where reviewer_id = assignee) then return false; end if;
  insert into listings.queue_assignments(listing_id, reviewer_id) values (target_id, assignee)
    on conflict (listing_id) do update set reviewer_id = excluded.reviewer_id, assigned_at = now();
  return true;
end;
$$;

revoke all on function public.staff_queue_assignments(uuid), public.staff_assign(uuid, text, text) from public, anon, authenticated;
grant execute on function public.staff_queue_assignments(uuid), public.staff_assign(uuid, text, text) to service_role;

commit;
