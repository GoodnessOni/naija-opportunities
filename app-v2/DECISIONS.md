# Decisions (branch feat/pathsync-bridge, 25 Nov 2026)

Baseline: origin/v2/rebuild at 1e7ca1d264b91b735d07e03dd9c543feaf2f38f0. npm ci, test (41), check and build passed with no fixes.
The handoff PDF mentions a local checkout at d6b448c two commits ahead of origin; those commits are not on GitHub.

- **Migrations check.** No Supabase access from this session, so `scripts/check-migrations.sql` is a read-only
  catalog query listing every object migrations 001 to 015 create, with present true or false. Nothing applied.
- **See if you qualify.** Links to `{PATHSYNC_URL}/listings/{listing_id}`. Empty `PATHSYNC_URL` means localhost:3000 in dev and
  the button is hidden in production (the PathSync subdomain is created at launch). Server-side, not NEXT_PUBLIC.
- **Shared sign-in.** Added `@supabase/ssr` and `@supabase/supabase-js` (same versions as PathSync) so both apps read
  the same `sb-<ref>-auth-token` cookie. Cookie domain `.naijaopportunities.live` only when NODE_ENV is production
  and the host is that domain or a subdomain (`lib/supabase/cookie-domain.ts`). `proxy.ts` refreshes the session
  on /opportunities and /account only. Staff sign-in is unchanged (bearer token).
- **Student sign-in** at /account/sign-in (email and password). New accounts are created on PathSync.
- **Interested and Applied.** Uses the existing `shared.opportunity_activity`; no SQL added. Interested upserts with
  ignoreDuplicates so retries and existing Applied rows are untouched. Applied needs the ticked box and sets
  applied_at. "I have not applied yet" returns to Interested. Remove deletes the row. All writes run as the user
  under RLS. Provider link clicks are not recorded.
- **Dashboard counters** already match the brief (pending, ambiguous, stale, closing soon, published). No change.
- **Inactive reasons** already come from `partner_listings` SQL. Added route tests: 401 on a bad key, 200 with the
  record, and 404 with only the reason code for withdrawn, stale, expired_deadline, closed and not_found.
- **PathSync fixtures.** `tests/fixtures/contract.ts` (five synthetic records validated by the schema) and
  `docs/pathsync-contract-fixtures.json` generated from it by a file snapshot test (`npx vitest -u` to refresh).

## Launch gaps (items 5 to 8)

- **Audit log.** `016_staff_audit.sql` adds a read-only `staff_audit` function over `staff_changes` (created, edited,
  withdrawn, with note) and `verification_attempts` (verified open or closed, inconclusive, failed). Staff see it at
  /admin/audit, newest first, 100 per page. Not applied to the live database yet.
- **Rechecks and tombstones.** Already correct, no change: failed or inconclusive checks keep the last successful
  window (tests/review.test.ts), closed evidence hides at once, and withdrawn rows are never deleted while
  `dedupe_key` is unique, so the same round cannot be imported twice. Nothing purges tombstones, which keeps them
  at least the 730 days the brief requires.
- **Staff workload.** `017_queue_assignment.sql` adds `listings.queue_assignments` plus staff-only assign
  functions. The queue has filters (type, state, assigned) and a "Needs official URL" tag when the application link
  is not an official page or the source is not official. The queue still loads if 017 is not applied yet.
- **Security.** Headers in next.config.ts (HSTS, nosniff, no framing, referrer and permissions policy). A full
  script CSP is left out until it is tested against the Next runtime. Per-instance rate limits on staff sign-in
  (10 per 10 minutes), student sign-in (10), organisation sign-up (5) and submissions (20).

## Citizenship fill-in (migration 018)

- **Why.** Every live listing had citizenship "unknown", so PathSync listed all of them under "Check these".
- **Rules, no language model.** `lib/listings/citizenship.ts` reads education source wording, criteria text, summary
  and description, sentence by sentence, for exact phrases only: "Nigerian students/citizens/nationals", "Nigerians
  only", "open to Nigerians" give `["NG"]`; "open to all nationalities", "all countries", "applicants from any
  country" give `["*"]`; other named nationalities give their ISO codes. The provider's country and the bare word
  "international" are never read as a rule.
- **Left unknown, sent to staff.** A sentence with a limit ("not open to", "except", "excluding", "non-Nigerian")
  or matches that disagree. The staff queue shows these with the suggested rule and the evidence sentence, all
  ticked, with one "Approve all" button. Staff approval is logged as human_review by that reviewer.
- **Clear matches are automatic.** Logged in `listings.citizenship_decisions` as method automated_review,
  reviewed_by automation, reviewer_id null, with the matched sentence. The listing record itself changes only
  citizenship, revision (+1), updated_at and content_hash; the SQL rejects any other difference. Freshness and
  verification are never touched.
- **Widened after the first dry run** (74 live: 1 NG, 73 no rule). The title is now read too. Added: SIWES and NYSC
  (Nigeria-only national schemes) give NG; "Nigerian undergraduates/candidates/women/..." and "applicants from
  Nigeria", "citizens of Nigeria" (and the same for the other listed countries); "all/any nationalities",
  "regardless of nationality" give `["*"]`. "African countries" and similar regions are too wide for the
  20-country field, so they go to staff review with no suggestion. A job location ("based in Nigeria") is still
  not a rule. `--explain` prints each no-rule listing's id, title and the sentences that mention nationality,
  country, citizen, resident or "international".
- **Running it.** `node --env-file=.env.local scripts/fill-citizenship.mjs` is a dry run over the active feed and
  prints counts. `--apply` writes, and needs 018 applied first. Neither has been run against the live database yet.
## Work location country for Greenhouse jobs

- **Why.** Greenhouse drafts stored location.country as ZZ even when the employer said "Lagos, Nigeria". PathSync's
  home-country rule reads this field.
- **Rule.** `lib/listings/location-country.ts` maps the employer's location text to one ISO alpha-2 code when every
  part names the same country ("Lagos, Nigeria", "Remote, Nigeria", "Abuja" give NG). Bare "Lagos", "Remote",
  regions such as EMEA, unknown places and multi-country lists give ZZ. It is a location fact only and never
  touches eligibility.citizenship or provider.country. `makeGreenhouseDraft` applies it and recomputes content_hash.
- **Live records.** `scripts/location-country-dry-run.mjs` is read-only and reports what would change. After
  approval, `import-greenhouse.mjs <board> "<employer>" --refresh-only` re-syncs through the existing
  refresh_verified_greenhouse_job (revision + 1, new content_hash). That path also renews the verification window,
  as every Greenhouse refresh does. Not run against the live database yet.

## NYSC rule tightened, and undoing a wrong automated decision (migration 019)

- **False positive.** The first --apply set "Operations Intern" to NG from "recent tertiary graduates and current
  NYSC corps members": NYSC was one allowed group, not a requirement. NYSC now gives NG only when it is required
  ("must have completed NYSC", "completed NYSC" in a requirements list, "NYSC discharge or exemption certificate").
  A bare mention of NYSC corps members matches nothing. SIWES is unchanged.
- **Undo.** `019_citizenship_revert.sql` adds a service-role-only `revert_citizenship_automation`. It works only
  when the latest decision on that listing is the automated one at that revision, sets citizenship back to unknown,
  bumps revision, updated_at and content_hash, and logs a human_review decision with the staff reviewer and reason.
  `scripts/revert-citizenship.mjs <listing_id> <reviewer_id> "<reason>"` is a dry run; `--apply` writes.
- **Revert reads by id.** The first revert attempt failed because the script read the active feed and the listing
  was not on it. `020_citizenship_listing_lookup.sql` adds a read-only, service-role-only `citizenship_listing(id)`
  for any non-synthetic, non-withdrawn listing (the same scope fill-citizenship writes to). The script now uses it
  and sets process.exitCode instead of calling process.exit, which caused a libuv assertion on Windows.
