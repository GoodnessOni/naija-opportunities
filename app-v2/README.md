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
