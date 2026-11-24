# NaijaOpportunities v2

NaijaOpportunities helps Nigerians find scholarships, internships and jobs. This app is the v2 rebuild.

## Local development

Use Node.js 22 or 24 and npm. From this directory:

```sh
npm ci
npm run dev
npm run lint
npm run check
npm test
npm run build
```

Open http://localhost:3000. The scaffold and feed policy tests require no credentials.

## Structure

- `app/`: Next.js routes, shared layout, and design tokens.
- `lib/listings/`: framework-independent listing rules.
- `tests/`: contract and feed policy checks.

The v2 app lives in `app-v2` on the rebuild branch so it can be previewed independently. Set the preview project's root directory to `app-v2`. Promote the rebuild only after the public board, staff review, and PathSync integration pass their acceptance checks.

## Ingestion boundary

Collectors should return draft candidates with official-source evidence. They must never grant publication status or a successful verification merely because a fetch succeeds. A future worker can share the listing rules without importing Next.js routes.

### Employer board imports

From app-v2, run the importer with Node 24 and the credentials for the rebuild database.
Greenhouse descriptions are stored as plain text. The public detail page links to the
original listing so applicants can read the complete posting and apply with the employer.

    node --env-file=.env.local scripts/import-greenhouse.mjs moniepoint Moniepoint --publish-verified
    node --env-file=.env.local scripts/import-greenhouse.mjs canonical Canonical --publish-verified --nigeria-and-remote

The regional filter matches Nigeria or the exact remote locations Home based - EMEA and Home based - Worldwide. The original wording remains visible. Listings with unmatched posting
links still enter the review queue.

Add `--dry-run` to check a board, the regional filter, and publication eligibility
without Supabase credentials or database writes. The counters show which postings
would publish or enter review. In refresh mode, the dry run reports eligible source candidates; only matching published rows can be refreshed.

Run with `--refresh-only` after applying migration 008 to the rebuild database.
The refresh updates existing automatically published listings and sends a complete
board snapshot. An empty board, rejected records, or import failures prevent
reconciliation. A sudden large drop raises an error. Individual missing postings
are hidden and sent for review. If the same posting returns, refresh can restore it.

The refresh workflow targets the rebuild database at 06:27 Africa/Lagos. Put the
workflow on the default branch to activate the schedule, and set
`REBUILD_SUPABASE_SERVICE_ROLE_KEY` to the rebuild project key in GitHub Actions
secrets. The workflow checks out the rebuild branch. Verify the first manual run
in GitHub Actions before relying on the schedule.

Run `node scripts/prepare-source-pilots.mjs` to prepare three scholarship and
internship review drafts from the programme or employer pages. Confirm current
application availability, eligibility, and deadline details before publishing.
This command only emits validated JSON.

Home study hall photo from Unsplash: https://unsplash.com/photos/busy-library-reading-room-with-people-studying-PjpRF0LhBB8

For review-only AI extraction, set `OPENAI_API_KEY` and `OPENAI_MODEL` and run
`node scripts/extract-listing-evidence.mjs <official-source.txt>`. The script
checks that each suggested excerpt appears verbatim in the provided source.
Review the excerpts in context before adding them to a listing.
