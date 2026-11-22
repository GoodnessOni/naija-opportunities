begin;
create table listings.organisations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create table listings.submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references listings.organisations(id) on delete set null,
  listing_id text unique not null references listings.listings(listing_id),
  state text not null default 'received' check (state in ('received', 'in_review', 'needs_info', 'published', 'declined')),
  created_at timestamptz not null default now()
);
alter table listings.organisations enable row level security;
alter table listings.submissions enable row level security;

create function public.submit_opportunity(owner_user uuid, submitted_record jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  organisation_id uuid;
  new_id text;
begin
  if not exists (select from auth.users where id = owner_user and email_confirmed_at is not null) then
    raise insufficient_privilege;
  end if;
  if submitted_record #>> '{lifecycle,publication_status}' is distinct from 'draft'
     or submitted_record #>> '{verification,state}' is distinct from 'unverified'
     or submitted_record->'synthetic' is distinct from 'false'::jsonb
     or (submitted_record->>'revision')::integer is distinct from 1 then
    raise check_violation;
  end if;
  insert into listings.listings(record) values (submitted_record)
    on conflict (dedupe_key) do nothing returning listing_id into new_id;
  if new_id is null then return false; end if;
  insert into listings.organisations(auth_user_id, name)
    values (owner_user, submitted_record #>> '{provider,name}')
    on conflict (auth_user_id) do update set name = excluded.name returning id into organisation_id;
  insert into listings.submissions(org_id, listing_id) values (organisation_id, new_id);
  return true;
end;
$$;

create function listings.sync_submission_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.record #>> '{lifecycle,status}' = 'closed' then
    update listings.submissions set state = 'declined' where listing_id = new.listing_id;
  elsif new.record #>> '{lifecycle,publication_status}' = 'published' then
    update listings.submissions set state = 'published' where listing_id = new.listing_id;
  else
    update listings.submissions set state = 'in_review' where listing_id = new.listing_id and state = 'received';
  end if;
  return new;
end;
$$;

create trigger sync_submission_state after update of record on listings.listings
for each row execute function listings.sync_submission_state();

revoke all on function public.submit_opportunity(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_opportunity(uuid, jsonb) to service_role;
commit;
