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
