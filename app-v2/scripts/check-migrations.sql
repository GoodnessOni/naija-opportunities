-- Read-only check: which of migrations 001 to 015 are present in the connected Supabase project.
-- It only reads catalog tables. It creates, changes and deletes nothing. Paste into the SQL editor and run.
with expected(migration, kind, name) as (values
  ('001', 'table', 'listings.listings'),
  ('001', 'function', 'listings.sync_listing_dates'),
  ('001', 'index', 'listings.listings_kind_freshness'),
  ('001', 'function', 'public.active_listings'),
  ('002', 'function', 'public.partner_listings'),
  ('003', 'table', 'listings.staff'),
  ('003', 'table', 'listings.verification_attempts'),
  ('003', 'function', 'public.record_staff_review'),
  ('003', 'function', 'public.staff_review_queue'),
  ('003', 'function', 'public.staff_reviewer'),
  ('004', 'table', 'listings.organisations'),
  ('004', 'table', 'listings.submissions'),
  ('004', 'function', 'listings.sync_submission_state'),
  ('004', 'function', 'public.submit_opportunity'),
  ('005', 'table', 'listings.recheck_queue'),
  ('005', 'function', 'listings.clear_recheck_after_review'),
  ('005', 'function', 'public.enqueue_listing_rechecks'),
  ('006', 'function', 'public.insert_greenhouse_draft'),
  ('007', 'function', 'public.sync_verified_greenhouse_job'),
  ('008', 'function', 'public.reconcile_greenhouse_snapshot'),
  ('008', 'function', 'public.refresh_verified_greenhouse_job'),
  ('009', 'function', 'public.browse_active_listings'),
  ('010', 'function', 'public.filter_active_listings'),
  ('011', 'table', 'listings.staff_changes'),
  ('011', 'function', 'public.organisation_submission_status'),
  ('011', 'function', 'public.staff_listing'),
  ('011', 'function', 'public.staff_overview'),
  ('011', 'function', 'public.staff_save_listing'),
  ('012', 'table', 'listings.email_alerts'),
  ('012', 'function', 'public.change_email_alert'),
  ('012', 'function', 'public.create_email_alert'),
  ('012', 'function', 'public.email_alert_digest'),
  ('013', 'column', 'listings.email_alerts.filters'),
  ('013', 'function', 'public.create_filtered_email_alert'),
  ('014', 'column', 'listings.email_alerts.frequency'),
  ('014', 'function', 'public.create_delivery_alert'),
  ('014', 'function', 'public.email_alert_matches'),
  ('015', 'cron job', 'naija-v3-instant-alerts')
)
select migration, kind, name,
  case kind
    when 'table' then to_regclass(name) is not null
    when 'index' then to_regclass(name) is not null
    when 'function' then exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = split_part(name, '.', 1) and p.proname = split_part(name, '.', 2))
    when 'column' then exists (
      select 1 from information_schema.columns
      where table_schema = split_part(name, '.', 1) and table_name = split_part(name, '.', 2)
        and column_name = split_part(name, '.', 3))
    when 'cron job' then to_regclass('cron.job') is not null
      and (xpath('/row/c/text()', query_to_xml(
        format('select count(*) as c from cron.job where jobname = %L', name), false, true, '')))[1]::text::int > 0
  end as present
from expected
order by present, migration, name;
