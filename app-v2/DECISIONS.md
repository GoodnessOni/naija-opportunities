# Decisions (branch feat/pathsync-bridge, 25 Nov 2026)

Baseline: origin/v2/rebuild at 1e7ca1d264b91b735d07e03dd9c543feaf2f38f0. npm ci, test (41), check and build passed with no fixes.
The handoff PDF mentions a local checkout at d6b448c two commits ahead of origin; those commits are not on GitHub.

- **Migrations check.** No Supabase access from this session, so `scripts/check-migrations.sql` is a read-only
  catalog query listing every object migrations 001 to 015 create, with present true or false. Nothing applied.
- **See if you qualify.** Links to `{PATHSYNC_URL}/listings/{listing_id}`. Empty `PATHSYNC_URL` means
  localhost:3000 in dev and https://pathsync-ai.naijaopportunities.live in production. Server-side, not NEXT_PUBLIC.
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
