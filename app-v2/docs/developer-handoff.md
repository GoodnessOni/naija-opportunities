# Developer handoff

## What has shipped on this branch

The v2 scaffold provides the root layout and homepage in `app/`, brand tokens in
`app/globals.css`, and active-feed eligibility in `lib/listings/active-feed.ts`.
The feed helper takes a caller-supplied clock and trusted verification decisions.
It expects records that have already passed the full listing validator. Read the
tests in `tests/active-feed.test.ts` for examples of inclusive cutoff times.

## Implementation sequence

1. Complete the schema 1.0.0 validator and canonical JSON fixtures before enabling
   staff or ingestion writes. Confirm omitted nested contract key names and
   content hash rules with the PathSync consumer.
2. Add Supabase migrations and enforce the same feed conditions at the database
   boundary. Test the migration using anonymous, organisation, staff, and server
   credentials. Use an isolated project for preview.
3. Build browse, stable detail routes, URL filters and sharing metadata against
   the active feed. Use the same deadline evaluation across the site and the API.
4. Add authenticated organisation submissions and staff verification in a
   transaction. Keep failed rechecks from renewing the last successful window.
5. Add the authenticated PathSync API, then the scheduled freshness worker and
   confirmed email alerts. A crawler only drafts a candidate unless a trusted
   check records evidence for all four required official-source facts.
6. Verify keyboard and screen-reader journeys, CI, preview deployment and
   rollback. Capture the deployed commit before switching the public domain.

## Extending the worker

Use one adapter per provider family. Prefer the provider’s published API or
feed, then HTML, then browser rendering for sources requiring JavaScript.
Keep each adapter's sample responses in test fixtures where permitted. Track
attempts, accepted candidates, duplicates, and errors by source. An empty result
after a source changes markup should surface for review.

## PathSync preview API

Apply `002_partner_feed.sql` after the first migration. Set the service role
key on the server and set `FEED_API_KEY_HASHES` to comma-separated lowercase
SHA-256 digests of independently generated high-entropy keys. Give PathSync
the corresponding raw key through its server environment. No key belongs in
client code or Git.

- `GET /api/v1/feed/active?page_size=25` accepts a bearer key and returns
  `evaluation_time`, `listings`, and an opaque `cursor`. Pass the cursor to
  request another page. Pagination pins evaluation time but reads current
  row state, so a withdrawal takes effect during paging.
- `GET /api/v1/listings/{listing_id}` returns the active record or a reason
  with HTTP 404. Draft and synthetic lookups return `not_found`.

Test both routes in a staging environment with real verified and inactive
rows. The current branch does not implement distributed rate limits.

## Staff review preview

Apply `003_review.sql` in staging after the feed migrations. Create a password
account using Supabase Auth and insert that user's UUID into `listings.staff`
with a unique reviewer slug and role `reviewer`. Visit `/admin` to sign in.
The browser keeps the signed-in user's access token in page memory. The server
checks the identity with Supabase Auth and checks staff membership before
returning any queue data. Only the server holds the service role key.

Review candidates come from the listings table. The preview queues drafts and
published open records with a recent failed or inconclusive check or a freshness
cutoff within 24 hours. Passing an open review requires notes on open status,
deadline, eligibility, and application. The database saves the decision and
its evidence in one transaction and rejects stale edits by revision. A failed
or inconclusive attempt preserves the last successful check and does not renew
its freshness deadline. Confirming a closure hides the listing immediately.

Organisation submission and automatic candidate import still need to supply
the queue. Verify with staff and non-staff accounts in staging before rollout.

## Organisation intake preview

Apply `004_submissions.sql` after the review migration. The `/submit` form
uses existing verified Supabase password accounts provisioned for staging.
Submissions enter as unverified drafts. Review decisions update the submission
record in the same transaction. Round, provider, kind, and title form the
preview deduplication key. The content digest is provisional pending the
PathSync canonical hash contract. This preview covers date-only deadlines
and free-text eligibility. Self-service signup, a status portal, and email
notifications are still pending.

### Local verification

The four migrations were applied to an isolated embedded PostgreSQL database
with a minimal Supabase auth/role stub. The smoke test checked anonymous
access denial, duplicate submission handling, draft invisibility, the
staff audit insert, optimistic revision conflicts, and public visibility
after approval. A real staging project is still needed to exercise
GoTrue sign-in, PostgREST, staff provisioning, and deployment credentials.
