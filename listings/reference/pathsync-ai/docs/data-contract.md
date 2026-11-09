# Listings data contract

## Plain-English summary

This document is the listings agreement between PathSync and NaijaOpportunities. Goodness approved the policies in commit `34969abca843462beb7b96ca1a7f3b4ffc723485` on 9 November 2026 (WAT). This correction keeps those policies and only repairs contradictions in the wording. The corrected commit is not the approved pin until section 24 names its SHA. No planner card starts before that.

Jobs stay in student matching, including jobs with no degree requirement. Onboarding will ask for nationality, institution, qualification, level or year, course, and expected graduation, and those answers can be updated. The screen is not built here. Citizenship withholds a listing only when an explicit nationality list omits the student's nationality. Unconstrained citizenship can be included. Unknown citizenship stays discoverable as Check eligibility and is not called a match. Provider country and the word international are not a mismatch. A named time zone is used as stated. A date-only deadline ends at 23:59:59 in that zone. West Africa Time applies only when no zone was given. Rolling and unknown deadlines have no invented date.

Freshness is agreed. Every active listing must be successfully rechecked at least every seven days, by automation or a person. There is no 90-day exception. Seven days means 168 elapsed hours: still active at that exact second, stale on the next. Stale is not expired. Never-verified listings stay off the active feed. Success means the official provider source was read for open status, deadline, eligibility, and the application link. HTTP success alone does not count. Failed or inconclusive attempts are recorded and do not renew the window. Closed, withdrawn, or expired evidence hides the listing immediately. NaijaOpportunities checks and PathSync enforces the same rule. An unreachable source may hide a genuine listing. Ambiguous evidence goes to a person, and a bot check is never labelled human. A stale listing returns only after a new success.

Education is agreed. Each listing is unrestricted, restricted, or unknown, with the source words kept. A confirmed fit is matched. A confirmed mismatch is left out of that student's matches, with the reason. Unknown rules or an incomplete profile stay discoverable as Check education eligibility. They are not called eligible and they are not hidden. Listings with no stated restriction can be included. Secondary-school-only awards are excluded from university students' matches. If several stages are allowed, any fitting stage is enough. Nothing is inferred from the title or provider.

Demographics and marks are agreed. Hard requirements differ from preferences. A confirmed demographic mismatch is excluded from personalised matches, with an explanation. An unanswered question is unknown, not a no, and stays discoverable as Check eligibility. Those questions are optional, their purpose is explained, and nothing is inferred from a name or photo. A minimum grade applies only on the same stated scale. Unlike scales are not converted. A confirmed grade or course mismatch is excluded with a reason. Missing or ambiguous facts stay discoverable and are not called eligible. Preferences never hard-exclude. A match is guidance, not a guarantee.

Withdrawals are agreed. A withdrawn listing leaves active matching and keeps its id, history, reason, and time. Saved listings say Withdrawn. The same round keeps that id if it is restored or if the provider's real application link changes, and the revision increases. A new round gets a new id even if the link is reused, and confirmed rounds are linked. The link alone does not decide identity. A minimal withdrawal record is kept 730 days so saved copies can be updated and the same round is not imported twice. That period does not reserve the link and does not keep sensitive text.

The five samples are synthetic. Hashes come from docs/listings/compute_listing_hashes.py. Preference ranking is not defined and is not agreed.

| Item | Value |
| --- | --- |
| Document | `docs/data-contract.md` |
| Owner repository | `GoodnessOni/pathsync-ai` |
| Author role | OGverse Lead |
| Status | Policies approved in `34969abca843462beb7b96ca1a7f3b4ffc723485`. This correction awaits approval of the pin. |
| Schema | `ogverse.listings` `1.0.0` |
| Authored | 8 November 2026 |
| Pinned evaluation instant used by every sample | `2026-11-08T12:00:00Z` (13:00 Africa/Lagos, WAT, UTC+1) |
| Approved policy commit | `34969abca843462beb7b96ca1a7f3b4ffc723485` |
| Approved corrected pin | Not granted. This correction does not name its own SHA as approved. |

This is the lead's contract for listings. It is not a planner card, not a validator, and not product code. Goodness approved the policies in `34969abca843462beb7b96ca1a7f3b4ffc723485`. This correction does not change those policies. No card may start until Goodness approves the corrected pin in section 24. That approval is not implied by this file.

The first card after approval, and not before, is a listings validator in the NaijaOpportunities repository against a pinned SHA of this file. That card is done when the valid samples in this document pass and a missing required field, an invalid type, and an expired deadline each fail with an error that names the field. This document does not start that card and does not change the NaijaOpportunities repository.

`docs/changelog.md` on this branch is not updated here, because this task may change only this file. The changelog therefore does not mention this contract.

## 1. How to read this document

Three labels are used whenever a sentence could be mistaken for a fact:

- **Fact.** Observed in a named file in this repository, or in the public `GoodnessOni/naija-opportunities` tree at the SHA named in section 4. Facts are not a promise that the live Supabase projects still match those files.
- **Proposed.** A rule this contract would impose if approved. Samples, field tables, and the validator are proposed.
- **Uncertain.** Something this lead could not verify. Uncertainties are collected again in section 22. They are not filled in with guesses.

Normative words "MUST", "MUST NOT", "SHOULD", and "MAY" apply only to proposed rules. Examples are synthetic. Hosts under the `.example` TLD are documentation names (RFC 2606). They are not claims that a programme, employer, or URL exists.

The producer validator and the PathSync student-surface filter are different functions. A listing can be schema-valid and still be withheld from students.

## 2. Purpose and scope

### Purpose

**Fact.** The PathSync README describes PathSync AI as an AI-powered scholarship discovery, matching, and application system for Nigerian university students. It names a discovery interview, a hidden-achievement reading of everyday student language, scholarship matching, an application letter, a CV, a deadline tracker, and a privacy gateway that is supposed to keep identifiers away from the model. The same README's product sentence says the system finds scholarships, writes the letter, builds the CV, and tracks deadlines, and that it does not submit the application.

**Proposed.** Priority 1 of the OGverse rebuild is PathSync for Nigerian university students who are finding and applying for scholarships, internships, and jobs. Jobs stay in student matching. PathSync reads listings that NaijaOpportunities publishes. Priority 2 is a NaijaOpportunities rebuild that keeps scholarships, internships, and jobs accurate and current, and that publishes them under this consumer contract. The two products stay in separate repositories. This file is the contract between them. The README fact above describes the product as shipped: scholarships. Jobs in matching is the settled rebuild instruction.

The contract exists so a student is not shown a closed listing, a fabricated deadline, or a placeholder provider, and so a job stays a job inside matching. A later validator must be able to accept or reject a listing without calling the wall clock.

### In scope

One JSON listing shape for `scholarship`, `internship`, and `job`. Identity, eligibility, provenance, URLs, freshness, lifecycle, deduplication, update, withdrawal, timestamps, schema versions, a proposed sync shape, privacy of listing text, deterministic validation, and the PathSync filter that decides which valid listings reach match, letter, and deadline-tracker surfaces.

### Out of scope

Matching scores, embeddings, model choice, hosting, the student-profile database, chat, CV and letter prompts, scraper implementation, and HTTP servers. The hash script and synthetic fixtures in section 16 are documentation for this contract, not a product validator. Architecture decision 0001 (hosting) and architecture decision 0002 (embeddings) are not settled here. `docs/data-model.md` on this branch is still a placeholder and is not this contract. Onboarding nationality is specified as consumer policy and is not implemented.

## 3. Parties and responsibilities

| Party | Repository | Proposed responsibility |
| --- | --- | --- |
| Producer | `GoodnessOni/naija-opportunities` | Create and update listings. Assign stable ids. Classify kind, eligibility, deadline kind, and URL kind honestly. Run the producer validator before a listing is published. Retain expired and withdrawn history. Never invent a date. |
| Consumer | `GoodnessOni/pathsync-ai` | Read listings. Re-validate before showing them. Apply the student-surface filter. Generate letters, CVs, and deadline plans only from listings that pass that filter. Never write student personal data back into a listing. |
| Owner | Goodness | Approve, amend, or reject this contract. No planner card starts without that approval. |
| Lead | This document's author | Write the contract. Do not implement it in this change. |
| Planner | Later, other task | Turn an approved contract into ordered cards with done tests. The planner does not rewrite the contract and does not write product code. |

**Proposed.** The producer is the source of listing facts. PathSync may store a local copy and a local surrogate key, but the sync key is `listing_id`. PathSync MUST NOT treat its `scholarships` table, its seed rows, or a model paraphrase as a second source of truth.

**Proposed.** PathSync does not submit applications. A URL is a link the student may open. Publishing a listing is not an endorsement beyond the verification state printed on the record.

## 4. Current state versus this proposal

### 4.1 What the PathSync README and this repository actually do

**Fact.** README product features are scholarships, not internships and not jobs. The dashboard copy in `frontend/src/pages/Dashboard.jsx` tells the student that NaijaOpportunities "updates daily with new scholarships and jobs" and links to `https://naija-opportunities.vercel.app/scholarships`. `frontend/src/components/Header.jsx` and `frontend/src/pages/Landing.jsx` link to `https://naija-opportunities.vercel.app`. Those are outbound links, not a listings client.

**Fact.** There is no checked-in HTTP client that fetches a NaijaOpportunities listings API. `POST /api/v1/scholarships/ingest` (`backend/app/api/scholarships.py`) accepts a local body and `ingest_scholarship` inserts into the local `scholarships` table. A comment in that file says matches are fetched "from NaijaOpportunities", but the SQL reads local `scholarships`. Commit `5807fbe` ("indexing from naija opportunities", 8 May 2026) changes match ranking and the result limit. It does not add a remote fetch.

**Fact.** `backend/schema.sql` defines `scholarships` as: `id` UUID default `gen_random_uuid()`, required `title`, `provider`, `description`, `eligibility_criteria`, nullable `min_cgpa` `NUMERIC(3,2)`, nullable `eligible_majors` `TEXT[]`, nullable `amount` text, nullable `deadline` `DATE`, nullable `application_url`, `embedding vector(1536)`, `created_at`, `updated_at`. There is no kind, no source URL, no verification time, no publication status, and no external stable id. The SQL function `match_scholarships` does not filter on `deadline`. The four seed rows use calendar dates `2026-06-30`, `2026-07-31`, `2026-08-01`, and `2026-09-15`. All four are before 8 November 2026. Whether those rows exist in the live database was not checked. The seed URLs were not opened.

**Fact.** The same repository does not agree with that schema. `backend/app/api/matches.py` selects `country`, `level`, `eligibility`, `benefits`, `apply_url`, `documents_needed`, and `duration` from `scholarships`. `backend/app/api/scholarships.py` and `backend/app/services/rag_service.py` write `eligibility_criteria` and `application_url`. Those are different names for the same product.

**Fact.** Deadline checks that do exist call the clock and treat a missing deadline as still open. `matches.py` and `scholarships.py` use `datetime.now().date()` with `deadline IS NULL OR deadline >= that date`. `frontend/src/pages/Matches.jsx` keeps a match when `deadline` is missing, and otherwise compares `new Date(deadline)` with `new Date()`. Deduping in that page is `title` plus `provider`, not an id. `docs/audit/rag_service.md` (1 Nov 2026) records that the RAG match path's only hard post-filter is CGPA and that an expired scholarship can be returned.

**Fact.** Onboarding in `frontend/src/pages/Onboard.jsx` asks for university, course, level (`100L`, `200L`, `300L`, `400L`, `500L`, `Postgraduate`), CGPA on a 5.0 or 4.0 scale, optional demographics (female student, disability, first-generation, low-income, Northern Nigeria, Niger Delta, rural), leadership, projects, goal (`fund_education`, `study_abroad`, `build_career`), and a free-text about. Several of those columns are used by the app and are not in `schema.sql`. The live column list was not queried.

**Fact.** `docs/decisions/0002-embedding-model.md` records, on 1 Nov 2026, that the scholarships table then held 72 vectors of 1024 dimensions and that a jobs table had no embedding column. This lead did not re-query Supabase. The README architecture diagram still says `vector(1536)`. That conflict is untouched. This contract does not carry embeddings.

**Fact.** `docs/runbook.md` says the NaijaOpportunities scraper schedule has been disabled since 19 August 2026 and points at an inventory that is not in this repository. The public workflow file still contains a 6-hour cron (section 4.2). Which of those describes production on 8 November 2026 is **uncertain**.

### 4.2 What the public NaijaOpportunities repository actually publishes

Observed 8 November 2026, read-only, default-branch tip commit `c737b4f` (20 June 2026). Scraper blob SHA `2255543243fa42e6f2dfabed8da94fa3de11689d`. This task did not modify that repository, did not run the scraper, and did not query its database.

**Fact.** The README describes jobs and scholarships updated by a scraper, Next.js, Supabase, and GitHub Actions. It names two public hosts: `naija-opportunities.vercel.app` and `www.naijaopportunities.live`. It does not describe an internships feed or a listings JSON API. The checked-in `app/api` routes found were contact and image-proxy only.

**Fact.** `scraper/scraper.py` upserts jobs on `apply_url` into table `jobs` and scholarships on `apply_url` into table `scholarships`. There is no separate internship table. The word "internship" appears in an enrichment prompt as a benefit, not as a listing kind. Job builders that were inspected set `deadline` to `None`. Jobberman, WeWorkRemotely, and the Google News jobs builder set `company` to `See listing`. RemoteOK uses the payload company or the fallback `Remote`. The scholarship builders set `provider` to `Various`, `level` to `various`, and `country` to `International` or `Nigeria`.

**Fact.** Enrichment asks a model for `deadline` as `YYYY-MM-DD` or null, then turns the strings `Not specified`, `Not available`, `Varies`, and `null`, and any string whose length is not 10, into `None`. Unknown, rolling, and unparsed deadlines therefore become the same database null. A null is not a stated rolling deadline, and it is not evidence that a human checked the page.

**Fact.** `app/scholarships/page.tsx` selects scholarships with `deadline IS NULL OR deadline >= today`, where `today` is `new Date().toISOString().split('T')[0]` (the UTC calendar date), and orders by `created_at` descending. A null deadline stays on that page. Urgency uses `Date.now()`. The TypeScript `Scholarship` interface lists `id`, `short_id` (number), `title`, `provider`, `country`, `level`, `source`, `apply_url`, `deadline`, `description`, `amount`, `slug`, and `image_url`. `short_id` and `slug` are not keys in the scraper dictionaries that were inspected. How they are assigned is **uncertain**. Page links are built with `makeSlug(title, short_id)`, which lowercases the title, drops non-alphanumerics, cuts to 40 characters, and appends `short_id`. That slug changes when the title changes. It is not a stable id.

**Fact.** `app/jobs/page.tsx` selects all jobs ordered by `created_at` descending. The inspected query does not filter `deadline`. The `Job` interface lists `id`, `short_id`, `title`, `company`, `location`, `type`, `source`, `deadline`, `description`, `salary`, and `image_url`.

**Fact.** `.github/workflows/scraper.yml` at that commit declares `cron: '0 */6 * * *'` and `workflow_dispatch`. A cron entry in git is not proof that GitHub is running it. No SQL schema file was in the repository, so database nullability and primary keys are **uncertain** beyond the TypeScript interfaces and the scraper payloads.

### 4.3 Proposed decisions that replace those behaviours

| Current behaviour | Proposed rule |
| --- | --- |
| URL or title+provider identifies a row | `listing_id` is stable. `apply_url` is not the id. Title slugs are display-only. |
| One scholarships table and a separate jobs shape | One listing object. `kind` is `scholarship`, `internship`, or `job`. |
| Null deadline means several different things | `deadline.kind` is `fixed`, `rolling`, or `unknown`. No fabricated date. |
| `DATE` plus the server clock or the browser clock | A caller-supplied `evaluation_time`. A date-only deadline ends at 23:59:59 in the source's stated zone. Africa/Lagos is used only when the source states no zone. |
| Expired rows can remain in match results | Active feed rejects an open listing whose fixed deadline has passed. Historical feed keeps the same facts once `status` is `expired`. |
| Upsert on URL, no tombstone | Revisioned updates. Withdrawal is a tombstone. Ids are not reused. |
| `Various`, `See listing`, free-text amount | Named provider, structured award, honest `url_kind`. |
| No schema version | `schema_version` `1.0.0` and the compatibility rules in section 6. |
| No sync API | Section 19 is a proposed logical operation. It is not a live endpoint. |

## 5. Decision register

The plain-English summary is the owner-facing account. This section is the same register in the words the rest of the contract uses.

Policies 1 to 4 were agreed by Goodness on 9 November 2026 (WAT) and are approved in commit `34969abca843462beb7b96ca1a7f3b4ffc723485`. They replace the four proposals in `cb68a3c7e32121681f4bae04d661fd3fad735b27`. This later correction does not reopen them. It is not itself the approved pin. No card starts until section 24 names the corrected SHA.

### Settled — jobs stay in student matching

**Settled instruction.** `scholarship`, `internship`, and `job` are all eligible for PathSync match, letter, and deadline tracker when the rest of section 11 passes. A job with no degree requirement stays in matching. A job is shown as a job.

### Settled — nationality and citizenship

**Settled instruction.** Onboarding asks for `nationality`, one ISO 3166-1 alpha-2 code. The current screen does not ask it. This contract does not build the screen.

| Meaning | Where it lives | Effect |
| --- | --- | --- |
| Nationality | Student profile | The country the student states |
| Explicit citizenship requirement | `citizenship.requirement` = `explicit` | Exclude from that student's matches only when their nationality is present and is not in `countries`. Say why. |
| Unconstrained | `requirement` = `unconstrained` and `countries` is `["*"]` | Citizenship does not exclude |
| Unknown listing metadata | `requirement` = `unknown` and `countries` is `[]` | Keep discoverable, label `Check eligibility`. Do not claim a match. Do not hide the listing for this reason. |

Provider country, location, audience tags, and words such as "international" are not a citizenship requirement. A missing student nationality is unknown, not a mismatch.

### Settled — stated time zone

**Settled instruction.** Section 10. A date-only deadline ends at 23:59:59 in the stated IANA zone. `Africa/Lagos` is used only when `stated_timezone` is null. An explicit clock time is not rewritten to end of day. Open through `fixed_at`, expired on the next second.

### Agreed 1 — Freshness, 9 November 2026 WAT

**Agreed policy.** Every listing on the active feed must have been successfully rechecked at least every seven days. Seven days means exactly 168 elapsed UTC hours after `verification.last_success_at`, not seven local midnights. `fresh_until` is that instant. The listing remains active when `evaluation_time` equals `fresh_until` and is stale when `evaluation_time` is greater. There is no 90-day human exception. A human success and an automated success start the same 168-hour window.

A listing with no successful verification (`last_success_at` null) is unverified and stays out of the active feed. A successful check reads the official provider source and records open status, the deadline, eligibility, and the application link. HTTP success alone is not a successful check. `verification.evidence` must say what was read. An inconclusive or failed attempt is stored in `last_attempt_at` and `last_attempt_outcome` and does not change `last_success_at` or `fresh_until`.

Explicit evidence of closed, withdrawn, or expired changes `lifecycle` immediately. That hide does not wait for `fresh_until`. Stale means the window passed while the listing is otherwise still open. Stale hides it from matching and keeps the history. It does not set `status` to `expired`.

NaijaOpportunities performs verification. PathSync applies the same freshness rule when it reads and matches. Automation does the routine check. Ambiguous, inaccessible, changed, or conflicting evidence is a human review. `reviewed_by` is `automation` or `human`. `reviewer_id` is set only for a human, and it is an opaque slug, not a student's name. A bot review must not be stored as `human`.

A stale listing returns to the active feed only after a new successful check whose outcome is `confirmed_open` and whose facts are still accurate. That success starts a new 168-hour window.

Trade-off: if the official source cannot be reached, a genuine listing can stay hidden. That is accepted so an unchecked listing is not shown as current.

### Agreed 2 — Education, 9 November 2026 WAT

**Agreed policy.** Onboarding collects institution, qualification studied, current level or year, course, and expected graduation date. The student can update them. This contract does not build that screen. The producer records `education.requirement` as `unrestricted`, `restricted`, or `unknown`, plus the stages, qualifications, courses, years, institutions, and `source_wording`. PathSync compares that record with the student profile. It does not invent a restriction from the title or the provider name.

A confirmed fit is included. A confirmed mismatch is excluded from that student's matches, with a reason. Unknown listing rules, or an incomplete student answer on a restricted point, stay discoverable with the label `Check education eligibility`. They are not called eligible and they are not hidden. `unrestricted` does not exclude, for scholarships, internships, and jobs. A job with no degree requirement is `unrestricted` and stays in matching. `stages` of exactly `["secondary"]` is excluded from university students' matches. If several stages are listed, the student is included when any one of them fits.

### Agreed 3 — Demographics and academics, 9 November 2026 WAT

**Agreed policy.** `demographics.requirements` are hard. `demographics.preferences` are not. A confirmed mismatch with a hard requirement is excluded from personalised matches, with an explanation. An unanswered demographic question is unknown, not "no", and the listing stays discoverable with `Check eligibility`. Sensitive demographic questions are optional and the product explains why they are asked. Nothing is inferred from a name or a photo.

`grade.requirement` of `explicit` is applied only when the student supplies a grade on the same `scale`. Unlike scales are not converted. A confirmed shortfall on that same scale, or a confirmed course mismatch, is excluded with a reason. A missing or ambiguous grade, scale, course, or requirement stays discoverable with `Check eligibility`, with no eligibility claim and no automatic hide. Preferences may affect ranking and never hard-exclude. The ranking formula is not defined in this contract and is not an agreed rule. A match is guidance, not a guarantee of an award or a job.

Citizenship in the settled rule above uses the same three outcomes: include, exclude on a confirmed mismatch, or leave discoverable when the fact is unknown.

### Agreed 4 — Withdrawal and identity, 9 November 2026 WAT

**Agreed policy.** A withdrawn listing leaves active matching and keeps its `listing_id`, history, reason, and `withdrawn_at`. A saved PathSync row displays Withdrawn rather than a broken reference. Withdrawn, expired, and stale stay different, as defined above.

The same round restored or reopened keeps the same `listing_id` after a successful verification, and `revision` increases. A new annual or application round is a new `listing_id` even if `application.url` is reused. When the producer confirms the link between rounds, `previous_round_id` names the earlier id.

`dedupe_key` is the hash of kind, provider, opportunity, and round. The application URL is not part of it and must not block a new round or force two rounds into one id. Section 16.

For 730 × 24 hours after `withdrawn_at`, the producer keeps a minimal tombstone in the historical feed so a consumer can mark saved copies Withdrawn and so the same round is not imported again as a second id. That retention is not a 730-day reservation of the URL. A new `round_key` may be published at once. The tombstone does not keep sensitive or personal text.

After those 730 days the tombstone may leave the feed. Reconciliation then uses kind, `provider_key`, `opportunity_key`, and `round_key`. If either side still knows the old `listing_id` for that round, the restore uses that id. A new id is only a last resort when nobody still has the id, and it must not be minted merely because the URL looks familiar.

## 6. Schema identity, versioning, and compatibility

**Proposed.**

- The schema name is `ogverse.listings`. This version is the string `1.0.0`. `schema_version` MUST equal `1.0.0` on every listing that claims to follow this document.
- Versions are `MAJOR.MINOR.PATCH`, numeric components, no prefix.
- PATCH may correct wording that does not make a previously valid listing invalid and does not make a previously invalid listing valid.
- MINOR may add optional fields. This 1.0.0 document has no optional top-level fields. A minor version is how a later optional field appears.
- Adding a required field, removing a field, renaming a field, or tightening a constraint is a MAJOR bump.
- The producer validator for 1.0.0 MUST reject unknown fields (`unknown_field`). That keeps the producer from drifting.
- The PathSync reader MUST ignore unknown fields and MUST accept any `1.x.y` listing that satisfies the 1.0.0 required fields and constraints. The reader MUST reject a different major with `unsupported_schema_version` on `schema_version`.
- A pinned SHA identifies the text. A branch name does not. Section 20 says how the pin works.

## 7. Clocks, timestamps, and evaluation time

**Proposed.** Every timestamp in a listing is a JSON string matching

`^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$`

and is a real UTC instant (Gregorian calendar, leap days included, hour 00–23, minute and second 00–59). Offsets other than `Z`, fractional seconds, and naive datetimes are invalid. Because the form is fixed width, chronological order is the same as byte order.

`evaluation_time` is an argument to the active-feed and historical validators and to the PathSync filter. It uses the same timestamp form. Expiry compares that instant with the stored `fixed_at`. Those comparisons MUST NOT read the wall clock or the network. Resolving a local date or clock time into `fixed_at` uses the IANA timezone database through Python `zoneinfo`. The measured samples in this revision used tzdata `2026e`, which is what `docs/listings/compute_listing_hashes.py` prints. The samples are defined at

`CONTRACT_EVALUATION_TIME = 2026-11-08T12:00:00Z`

Africa/Lagos in that timezone data is a fixed UTC+1 offset. It is not the zone for every listing. It is the default only when the source names no zone.

Adding hours means the unique UTC timestamp that many elapsed seconds later. Sample oracles:

| Start | Hours | Result |
| --- | ---: | --- |
| `2026-11-08T09:00:00Z` | 168 | `2026-11-15T09:00:00Z` |
| `2026-11-01T00:00:00Z` | 168 | `2026-11-08T00:00:00Z` |
| `2026-11-08T09:00:00Z` | 168 | `2026-11-15T09:00:00Z` |

Worked deadlines, each instant measured by the script in section 16:

No zone, date only. The source says "Closes 31 March 2027" and gives no clock time and no zone.

- `form` = `date_only`
- `stated_timezone` = null
- `resolved_timezone` = `Africa/Lagos`
- `local_time` = `23:59:59`
- `boundary` = `inclusive_end_of_local_day`
- `fixed_at` = `2027-03-31T22:59:59Z`
- Open when `evaluation_time` is `2027-03-31T22:59:59Z`
- Expired when `evaluation_time` is `2027-03-31T23:00:00Z`

Stated zone, date only. The source says "Closes 31 October 2026 (United Kingdom)."

- `form` = `date_only`
- `stated_timezone` = `Europe/London`
- `resolved_timezone` = `Europe/London`
- `local_time` = `23:59:59`
- `fixed_at` = `2026-10-31T23:59:59Z`
- On this date Britain is on GMT (UTC+0). The same calendar date with no zone would have been `2026-10-31T22:59:59Z` in Africa/Lagos. Those instants are not interchangeable.

Explicit clock time. A source that says 15:00 in Paris on 1 June 2027, which is Central European Summer Time (UTC+2) in tzdata 2026e:

- `form` = `instant`
- `stated_timezone` = `Europe/Paris`
- `resolved_timezone` = `Europe/Paris`
- `local_time` = `15:00:00`
- `boundary` = `instant`
- `display_date` = `2027-06-01`
- `fixed_at` = `2027-06-01T13:00:00Z`

This last row is an oracle in the script output. It is not one of the five full samples.

`timestamps.updated_at` more than 24 hours after `evaluation_time` is `timestamp_in_future` on `timestamps.updated_at`. That check uses the supplied instant, not the clock. 24 hours after `2026-11-08T12:00:00Z` is `2026-11-09T12:00:00Z`.

## 8. Listing object

**Proposed.** A listing is one JSON object. Encodings are UTF-8. Duplicate JSON keys MUST be rejected (`invalid_json` on `$`). Integers are JSON numbers with no fraction, in the safe range `-(2^53-1) .. 2^53-1`. Booleans are `true` or `false`, not `0` or `1`. Strings MUST NOT have leading or trailing whitespace, MUST NOT contain ASCII controls (`U+0000`–`U+001F`), and MUST NOT contain `<` or `>`. This version does not rewrite strings. Bad input is an error, not a cleaned value.

There are no optional keys in version 1.0.0. A nullable value is present as JSON `null`. An absent required key is `missing_required_field`. A present `null` where null is forbidden is `invalid_type`.

`synthetic` MUST be `true` on every sample in this document and on any fixture. Production rows that real students could see MUST use `false`. The record validator accepts both. PathSync student surfaces MUST drop `synthetic: true`.

## 9. Field tables

Constraints that need more than a cell are in sections 10–16. "Required" means the key MUST be present. "Null" means JSON `null` is allowed.

### 9.1 Top level

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `schema_version` | string | yes | no | Exactly `1.0.0` |
| `listing_id` | string | yes | no | `^lst_[0-9A-HJKMNP-TV-Z]{26}$` (Crockford base32, no I, L, O, U) |
| `kind` | string | yes | no | `scholarship`, `internship`, `job` |
| `synthetic` | boolean | yes | no | `true` fixture, `false` production |
| `revision` | integer | yes | no | `1` .. `1000000` |
| `title` | string | yes | no | 1..180. Not a placeholder (section 12) |
| `summary` | string | yes | no | 1..400, or exactly `[withdrawn]` on a tombstone |
| `description` | string | yes | no | 1..8000, or exactly `[withdrawn]` on a tombstone |
| `provider` | object | yes | no | Section 9.2 |
| `source` | object | yes | no | Section 9.3 |
| `application` | object | yes | no | Section 9.4 |
| `eligibility` | object | yes | no | Section 9.5 |
| `deadline` | object | yes | no | Section 10 |
| `award` | object | yes | no | Section 9.6 |
| `location` | object | yes | no | Section 9.7 |
| `employment` | object | yes | yes | Null if and only if `kind` is `scholarship`. Section 9.8 |
| `documents_required` | array of string | yes | no | 0..20 items, each 1..160, unique, sorted by UTF-8 bytes. Empty means not stated |
| `how_to_apply` | string | yes | no | 1..4000, or exactly `[withdrawn]`, or exactly `Not stated by the source.` |
| `lifecycle` | object | yes | no | Section 14 |
| `verification` | object | yes | no | Section 13 |
| `timestamps` | object | yes | no | Section 9.9 |
| `identity` | object | yes | no | Provider, opportunity, and round. Section 15 |
| `dedupe_key` | string | yes | no | 64 lowercase hex of that identity. Section 16 |
| `content_hash` | string | yes | no | 64 lowercase hex. Section 16 |
| `previous_round_id` | string | yes | yes | Null, or the `listing_id` of the previous confirmed round |

### 9.2 `provider`

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `name` | string | yes | no | 1..160. Not a placeholder |
| `type` | string | yes | no | `government`, `tertiary_institution`, `company`, `foundation`, `ngo`, `multilateral`, `unknown` |
| `country` | string | yes | no | ISO 3166-1 alpha-2, or `ZZ` when the source does not say |
| `url` | string | yes | yes | Accepted `https` URL, section 12, or null |

`provider.country` `ZZ` is allowed. It MUST NOT be used as proof that Nigerian students are eligible.

### 9.3 `source`

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `name` | string | yes | no | 1..80, `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `kind` | string | yes | no | `official`, `aggregator`, `news`, `manual`, `unknown` |
| `url` | string | yes | no | Accepted `https` URL, section 12, of the page the facts were taken from |
| `retrieved_at` | string | yes | no | UTC timestamp. Not after `timestamps.updated_at` |

`source.kind` is the producer's classification of that page. `news` is allowed and MUST NOT be labelled `official`. `unknown` is allowed and PathSync MUST NOT render it as the funder's own site.

### 9.4 `application`

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `url` | string | yes | no | Accepted `https` URL, section 12. Not an identity. The same round may change it on a later revision |
| `url_kind` | string | yes | no | `direct_application`, `official_programme_page`, `aggregator_page`, `unknown` |
| `contact_email` | string | yes | yes | Null, or one address, syntax only, length 1..120 |

**Agreed policy.** `application.url` may change on a later revision of the same round. A changed link does not by itself create a new `listing_id`. A new round does, even when the link is unchanged.

PathSync MUST use an "Apply" label only when `url_kind` is `direct_application` or `official_programme_page`. For `aggregator_page` and `unknown` the label is "Source page".

`contact_email` MAY be null. When set, it MUST match `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` and MUST be a role mailbox from the source, not a student's address. Free-text fields MUST NOT contain an email address. The record validator checks the pattern. It cannot know whether the mailbox is a role.

### 9.5 `eligibility`

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `citizenship` | object | yes | no | `requirement` plus `countries`. This is not the student's nationality |
| `education` | object | yes | no | `unrestricted`, `restricted`, or `unknown`, plus source wording |
| `grade` | object | yes | no | Explicit minimum, none, or unknown. No cross-scale conversion |
| `demographics` | object | yes | no | `requirements` are hard. `preferences` are not |
| `audience_tags` | array of string | yes | no | 0..6 descriptive labels, unique, sorted. Not a hard gate |
| `criteria_stated` | boolean | yes | no | `false` requires a fixed sentence, except tombstones |
| `criteria_text` | string | yes | no | 1..4000 |

`citizenship` fields:

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `requirement` | string | yes | no | `explicit`, `unconstrained`, `unknown` |
| `countries` | array of string | yes | no | See the pairs below. Unique, sorted by UTF-8 |

Pairs, all stage 2, no clock:

- `explicit`: `countries` is 1..20 ISO 3166-1 alpha-2 codes. `*` is forbidden. This is an explicit citizenship requirement.
- `unconstrained`: `countries` is exactly `["*"]`. The source says nationality is not a limit.
- `unknown`: `countries` is exactly `[]`. The source does not say. This is unknown metadata, not a ban and not an open invitation written as fact.
- Any other pair is `invalid_constraint` on `eligibility.citizenship.requirement`.

`education`:

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `requirement` | string | yes | no | `unrestricted`, `restricted`, `unknown` |
| `stages` | array of string | yes | no | `secondary`, `undergraduate`, `postgraduate`. Empty unless `restricted`. Unique, sorted |
| `qualifications` | array of string | yes | no | `secondary_school`, `bachelor`, `master`, `doctorate`. Empty unless `restricted`. Unique, sorted |
| `courses` | array of string | yes | no | Tokens below, empty unless `restricted`. Unique, sorted |
| `years` | array of string | yes | no | `100`, `200`, `300`, `400`, `500`, `postgraduate`. Empty unless `restricted`. Unique, sorted |
| `institutions` | object | yes | no | `requirement` is `unrestricted`, `restricted`, or `unknown`. `names` is empty unless `restricted`, then 1..30 strings |
| `source_wording` | string | yes | no | 1..4000. The source sentence, or `Not stated by the source.` when unknown, or `[withdrawn]` on a tombstone |

`restricted` requires at least one of `stages`, `qualifications`, `courses`, `years`, or `institutions.names` to be non-empty. `unrestricted` and `unknown` require those arrays to be empty and `institutions.requirement` to match `education.requirement`.

Course tokens: `agriculture`, `architecture`, `arts`, `business`, `computer_science`, `education`, `engineering`, `health`, `humanities`, `law`, `mathematics`, `medicine`, `natural_sciences`, `social_sciences`, `other`.

`grade`:

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `requirement` | string | yes | no | `explicit`, `none`, `unknown` |
| `scale` | string | yes | yes | `4.0` or `5.0` when `explicit`, otherwise null |
| `minimum_hundredths` | integer | yes | yes | 1..400 on `4.0`, 1..500 on `5.0`, otherwise null. 350 means 3.50 |
| `source_wording` | string | yes | no | 1..400 |

Do not convert a 4.0 grade into a 5.0 grade, or a degree class into a CGPA. Hundredths only avoid binary floats on a stated scale.

`demographics.requirements` and `demographics.preferences` are arrays of `female`, `disability`, `first_generation`, `low_income`, `northern_nigeria`, `niger_delta`, `rural`. Each is unique and sorted. A token must not appear in both arrays.

`audience_tags` tokens: `nigerian_university_student`, `nigerian_postgraduate`, `nigerian_secondary`, `african_student`, `open_international`. They describe audience. They are not citizenship and they are not a hard education rule.

When `criteria_stated` is `false` and the row is not withdrawn, `criteria_text` MUST be exactly `Not stated by the source.` When `criteria_stated` is `true`, `criteria_text` MUST NOT be that sentence and MUST NOT be `[withdrawn]`. Withdrawn rows are specified in section 15.

### 9.6 `award`

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `kind` | string | yes | no | `cash`, `full_tuition`, `stipend`, `unpaid`, `mixed`, `not_stated` |
| `summary` | string | yes | yes | 1..200, or null |
| `currency` | string | yes | yes | `NGN`, `USD`, `GBP`, `EUR`, `OTHER`, or null |
| `amount_minor` | integer | yes | yes | Null, or `0` .. `2^53-1` minor units (kobo, cents) |
| `period` | string | yes | yes | `one_off`, `per_year`, `per_month`, `full_programme`, or null |

**Proposed.** `not_stated` requires `summary`, `currency`, `amount_minor`, and `period` all null. The producer MUST NOT write `0` to mean "not stated".

`unpaid` requires a summary, null `currency`, and null `amount_minor`. `period` may be null or one of the period tokens.

`cash`, `stipend`, `full_tuition`, and `mixed` require a summary. `amount_minor` may be null when the source gives no single figure. When `amount_minor` is set, `currency` MUST be `NGN`, `USD`, `GBP`, or `EUR` (not `OTHER`) and `period` MUST be set. `OTHER` requires `amount_minor` null.

`employment.paid` `true` forbids `award.kind` `unpaid` and `not_stated`. `employment.paid` `false` requires `award.kind` `unpaid`. `paid` null leaves the award free, including `not_stated`.

### 9.7 `location`

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `country` | string | yes | no | ISO alpha-2 or `ZZ` |
| `locality` | string | yes | yes | Null, or 1..120 (a city or campus, not a country name repeated) |
| `arrangement` | string | yes | no | `on_site`, `remote`, `hybrid`, `unknown` |

### 9.8 `employment`

The key is always present. The value is null for `scholarship`. For `internship` and `job` it is an object:

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `employment_type` | string | yes | no | Internship: exactly `internship`. Job: `full_time`, `part_time`, `contract`, `temporary`, `unspecified`. A job MUST NOT use `internship` |
| `duration_text` | string | yes | yes | Null or 1..120 |
| `paid` | boolean | yes | yes | Null means the source did not say |

### 9.9 `timestamps`

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `created_at` | string | yes | no | UTC timestamp |
| `updated_at` | string | yes | no | `>= created_at` |
| `published_at` | string | yes | yes | Null only while `publication_status` is `draft` |
| `expired_at` | string | yes | yes | Non-null if and only if `lifecycle.status` is `expired` |
| `closed_at` | string | yes | yes | Non-null if and only if `lifecycle.status` is `closed` and `publication_status` is `published` |
| `withdrawn_at` | string | yes | yes | Non-null if and only if `publication_status` is `withdrawn`. Then it equals `updated_at` |

When set, `published_at`, `expired_at`, and `closed_at` are `>= created_at` and `<= updated_at`. `expired_at` on an expired fixed deadline MUST be greater than `deadline.fixed_at` (the listing is still open at `fixed_at`).

## 10. Deadline rules

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `kind` | string | yes | no | `fixed`, `rolling`, `unknown` |
| `form` | string | yes | yes | `date_only` or `instant` when `kind` is `fixed`, otherwise null |
| `stated_timezone` | string | yes | yes | Canonical IANA name when the source names a zone, otherwise null |
| `resolved_timezone` | string | yes | yes | The IANA name used to compute `fixed_at`. Null when `kind` is not `fixed` |
| `display_date` | string | yes | yes | `YYYY-MM-DD` when `kind` is `fixed`, otherwise null |
| `local_time` | string | yes | yes | `HH:MM:SS` in `resolved_timezone` when `kind` is `fixed`, otherwise null |
| `boundary` | string | yes | yes | `inclusive_end_of_local_day` or `instant` when `kind` is `fixed`, otherwise null |
| `fixed_at` | string | yes | yes | UTC timestamp of `display_date` plus `local_time` in `resolved_timezone` when `kind` is `fixed`, otherwise null |
| `raw_text` | string | yes | yes | Source words. Required for `fixed` and `rolling`. Null for `unknown` |

**Settled instruction.**

- `date_only` sets `local_time` to `23:59:59` and `boundary` to `inclusive_end_of_local_day`. End of day is 23:59:59 in `resolved_timezone`, not a fixed UTC offset chosen in advance.
- If the source names a zone, `stated_timezone` and `resolved_timezone` are that zone's canonical IANA name (`ZoneInfo(name).key == name`).
- If the source does not name a zone, `stated_timezone` is null and `resolved_timezone` is `Africa/Lagos`. That is the only use of West Africa Time as a default.
- `instant` means the source gave a clock time. `boundary` is `instant` and `local_time` is that clock time, not forced to `23:59:59`. A stated zone is stored when the source gave one. If an explicit clock time has no zone, `stated_timezone` is null and `resolved_timezone` is `Africa/Lagos`, and the clock time is kept. It is not rewritten to end of day.
- `fixed_at` is that local civil time converted with the IANA data. The conversion attaches the zone with `fold=0` (the earlier occurrence when a clock time happens twice). If the local time does not exist because clocks sprang forward, the record is `invalid_constraint` on `deadline.local_time`. Do not move it to the next valid minute.
- `display_date` is the civil date in `resolved_timezone`, which is the date the source stated for a date-only deadline.
- `raw_text` is 1..300 characters copied from the source for `fixed` and `rolling`.
- `rolling` sets `form`, `stated_timezone`, `resolved_timezone`, `display_date`, `local_time`, `boundary`, and `fixed_at` to null.
- `unknown` sets those fields and `raw_text` to null.
- Forbidden stand-ins, when they are the whole of `raw_text` or are written into a date field: `Not specified`, `Not available`, `Varies`, `TBC`, `TBA`, `null`, `2099-12-31`, `1970-01-01`, `9999-12-31`. The current scraper maps several of these to SQL null. This schema does not.

A fixed deadline is expired at `evaluation_time` when `evaluation_time` > `fixed_at`. Equality is still open. Rolling and unknown are never expired. The expiry test reads `fixed_at`. It does not apply a second timezone conversion.

## 11. Eligibility and the PathSync consumer filter

### 11.1 Producer duties

**Proposed.** The producer MUST set citizenship and education from the source text, not from the scraper host and not from a model guess. Hardcoded `Various`, `International`, and `various` in the current scholarship payload are not acceptable values for `provider.name`, a country, or an education level.

`audience_tags` MUST include `nigerian_university_student` only when the source covers Nigerian university students (undergraduates, or undergraduates and postgraduates together). `nigerian_postgraduate` is for postgraduate-only calls. `open_international` and `african_student` describe audience. They are not a citizenship requirement. A headline that says "international" or "Africa" does not set `citizenship.requirement` to `explicit` and does not put `NG` in `countries`. The producer sets `explicit` only from an actual nationality list, `unconstrained` only when the source says there is no nationality limit, and `unknown` when the source does not say.

### 11.2 Student match

**Agreed policy.** This function is PathSync's. It is not the NaijaOpportunities record validator. No card implements it yet.

`pathsync_student_match(listing, student, evaluation_time) -> include | exclude(reason) | needs_check(label)`

The result is guidance. `include` does not promise an award or a job. `needs_check` stays discoverable and must not be labelled eligible.

Onboarding, when built, collects and lets the student update: `nationality`, institution, qualification studied, current level or year, course, and expected graduation date (`YYYY-MM-DD`). CGPA and its scale are used only when both exist. Demographic answers are optional. The current screen does not collect nationality, qualification, or expected graduation. This contract does not change that screen. Free text must not be copied onto a listing. Nothing about eligibility is inferred from a name or a photo.

Outcomes, first match wins:

| Order | Condition | Result |
| --- | --- | --- |
| 1 | `synthetic` is true | `exclude(synthetic)` |
| 2 | Active-feed checks fail | `exclude(not_active)` |
| 3 | `kind` is not `scholarship`, `internship`, or `job` | `exclude(kind)` |
| 4 | Citizenship `explicit`, nationality present, and not in `countries` | `exclude(citizenship_mismatch)` |
| 5 | Citizenship `unknown`, or nationality missing on an `explicit` list | `needs_check(Check eligibility)` |
| 6 | `education.requirement` is `unknown` | `needs_check(Check education eligibility)` |
| 7 | `education.stages` is exactly `["secondary"]` | `exclude(education_stage)` |
| 8 | Education is `restricted` and the student answered every restricted point, and none of the allowed stages, qualifications, courses, years, or institutions fits | `exclude` with `education_stage`, `education_course`, `education_year`, `education_qualification`, or `education_institution` |
| 9 | Education is `restricted` and the student has not answered a restricted point | `needs_check(Check education eligibility)` |
| 10 | A demographic token is in `requirements`, and the student answered and does not have it | `exclude(demographic_requirement)` |
| 11 | A demographic token is in `requirements`, and the student did not answer | `needs_check(Check eligibility)` |
| 12 | `grade.requirement` is `explicit`, the scales match, and the student's hundredths are below `minimum_hundredths` | `exclude(grade)` |
| 13 | `grade.requirement` is `explicit` and the scale or the student's grade is missing or different | `needs_check(Check eligibility)` |
| 14 | `grade.requirement` is `unknown` | `needs_check(Check eligibility)` |
| 15 | Otherwise | `include` |

`education.requirement` `unrestricted` and `grade.requirement` `none` do not exclude. A job with those values stays in matching. Several stages mean a fit when any one stage matches. `preferences` never produce `exclude`. `audience_tags` never produce `exclude`.

Level tokens: `100L`→`100`, `200L`→`200`, `300L`→`300`, `400L`→`400`, `500L`→`500`, `Postgraduate`→`postgraduate`.

Course tokens for the current onboard list: Computer Science → `computer_science`; every Engineering row and Systems Engineering → `engineering`; Medicine & Surgery → `medicine`; Pharmacy and Nursing → `health`; Law → `law`; Economics, Accounting, and Business Administration → `business`; Mass Communication → `humanities`; Political Science, Sociology, and Psychology → `social_sciences`; Education → `education`; Agriculture and the current label `fishery` → `agriculture`; Architecture → `architecture`; Mathematics → `mathematics`; Physics, Chemistry, Biology, Biochemistry, and Microbiology → `natural_sciences`. `Other`, or a course that is not in this list, is not a confirmed mismatch. `fishery` mapped to `agriculture` is a reading of the current control, not a claim about faculties.

Level map: `100L`→`100`, `200L`→`200`, `300L`→`300`, `400L`→`400`, `500L`→`500`, `Postgraduate`→`postgraduate`.

Course map from the current `COURSES` list in `frontend/src/pages/Onboard.jsx`. This map is part of the proposal:

| Onboard string | Token |
| --- | --- |
| Computer Science | `computer_science` |
| Systems Engineering | `engineering` |
| Engineering (Electrical) | `engineering` |
| Engineering (Mechanical) | `engineering` |
| Engineering (Civil) | `engineering` |
| Engineering (Chemical) | `engineering` |
| Engineering (Petroleum) | `engineering` |
| Medicine & Surgery | `medicine` |
| Pharmacy | `health` |
| Nursing | `health` |
| Law | `law` |
| Economics | `business` |
| Accounting | `business` |
| Business Administration | `business` |
| Mass Communication | `humanities` |
| Political Science | `social_sciences` |
| Sociology | `social_sciences` |
| Psychology | `social_sciences` |
| Education | `education` |
| Agriculture | `agriculture` |
| fishery | `agriculture` |
| Architecture | `architecture` |
| Mathematics | `mathematics` |
| Physics | `natural_sciences` |
| Chemistry | `natural_sciences` |
| Biology | `natural_sciences` |
| Biochemistry | `natural_sciences` |
| Microbiology | `natural_sciences` |
| Other | no field exclude |

The string `fishery` is the current UI value. Mapping it to `agriculture` is a reading of that control, not a claim about university faculties.

A grade comparison uses the hundredths already recorded on one stated scale. 3.50 on a 5.0 scale is 350. There is no conversion into another scale, and a degree class is not turned into a CGPA.

- Listing `scale` `5.0` and `minimum_hundredths` 350, student 360 hundredths on `5.0`: the grade rule does not exclude.
- Same listing, student 300 hundredths on `5.0`: `exclude(grade)`.
- Same listing, student 320 hundredths on `4.0`: `needs_check(Check eligibility)`. Do not multiply by 5/4. Do not treat 320 as 400. Do not call the student eligible.

Demographic answers map as `Female student`→`female`, `Student with disability`→`disability`, `First-generation student`→`first_generation`, `From a low-income family`→`low_income`, `From Northern Nigeria`→`northern_nigeria`, `From Niger Delta region`→`niger_delta`, `From rural area`→`rural`. `None of these`, or a skipped question, stores no token. A skipped question is unknown, not a no.

Deadline-tracker labels for an included listing:

- `fixed`: show `display_date` and `resolved_timezone`. Day count is that zone's calendar date of `evaluation_time` subtracted from `display_date`. `0` means "closes today". No negative numbers, because an expired listing is not included.
- `rolling`: the words `Rolling admission`. No day count and no invented end date.
- `unknown`: the words `Deadline not stated`. No day count and no invented end date.

If `synthetic` were ignored, at `CONTRACT_EVALUATION_TIME` the open scholarship and the rolling internship can be `include` for a student who meets their explicit rules. The job stays in matching and is `needs_check(Check eligibility)` because its citizenship metadata is unknown, not because it is a job. The historical scholarship and the tombstone are `exclude(not_active)`. With `synthetic: true`, all five are `exclude(synthetic)`. They are fixtures, not a live feed.

## 12. Source provenance and URLs

`source.url` is the page the facts were taken from. `application.url` is the best next page for the student. They MAY differ. Neither is the listing's identity. `source.kind` and `application.url_kind` record what sort of page it is. The checks below do not resolve DNS and do not fetch the URL.

There are two operations. They are not interchangeable.

### 12.1 Record acceptance

A stored `source.url`, `application.url`, non-null `provider.url`, and non-null `verification.source_checked_url` MUST already be an accepted URL. The check returns `non_canonical_url` on that field. It does not rewrite the string. `docs/listings/compute_listing_hashes.py` function `accept_url` is this check for the fixtures. It is not a product validator.

An accepted URL:

1. Contains no ASCII whitespace.
2. Starts with `https://` and has no second scheme.
3. Has no userinfo (`user:pass@`), no fragment (`#`), and no port, including `:443`.
4. Has a lowercase host of dot-separated labels. Each label matches `^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`. The host is not an IPv4 literal. It is not `localhost` or a name ending `.localhost`. It is not `example.com`, `example.org`, or `example.net`, and it does not end with `.example.com`, `.example.org`, or `.example.net`.
5. A host ending `.example` is accepted syntax so these synthetic fixtures have a legal string. A production row must still be the host that was fetched. Acceptance does not check that duty.
6. The path is empty, written with no slash after the host (`https://rivertrust.example`), or one or more segments of `/` plus `[A-Za-z0-9._~-]+`. No trailing slash, no empty segment, and no `.` or `..` segment. Path case is kept.
7. A query, if present, is `?` plus `key=value` pairs separated by `&`. Keys match `^[a-z0-9._~-]+$`. Values are empty or match `[A-Za-z0-9._~-]` and `%` plus two uppercase hex digits. Pairs are sorted by key, then value, and keys are unique. These keys are rejected: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id`, `fbclid`, `gclid`, `mc_cid`, `mc_eid`, `igshid`, `ref`.

Accepted strings, measured by `accept_url` as `ok`:

- `https://apply.rivertrust.example/2027`
- `https://rivertrust.example`
- `https://apply.rivertrust.example/Path?a=1&b=2`

Rejected strings, measured by `accept_url`. The stored record stays the rejected string. The check does not replace it:

| String | Reason |
| --- | --- |
| `http://apply.rivertrust.example/2027` | `scheme` |
| `https://user:pass@apply.rivertrust.example/2027` | `userinfo` |
| `https://apply.rivertrust.example/2027#form` | `fragment` |
| `https://apply.rivertrust.example:443/2027` | `host` |
| `https://Apply.Rivertrust.example/2027` | `host` |
| `https://apply.rivertrust.example/2027/` | `path` |
| `https://localhost/2027` | `placeholder_host` |
| `https://example.com/2027` | `placeholder_host` |
| `https://apply.example.com/2027` | `placeholder_host` |
| `https://apply.rivertrust.example/2027?utm_source=x` | `tracking_query` |
| `https://apply.rivertrust.example/2027?b=1&a=2` | `query_order` |
| `https://apply.rivertrust.example/2027?B=1` | `query_key` |
| `https://apply.rivertrust.example/2027?q=%2f` | `query_value` |

### 12.2 Normalisation is not acceptance

A producer may prepare a raw link before storing it. `normalise_url` in the same script is that helper. It lowercases the host, drops a trailing slash, drops the tracking keys above, sorts the query, and removes a fragment. It does not accept the input. If someone stores the raw string, `accept_url` still rejects it.

Measured oracle, not a stored listing:

- Input `https://Apply.River.Example/Path/?utm_source=x&b=2&a=1` is rejected.
- `normalise_url` returns `https://apply.river.example/Path?a=1&b=2`.
- That output passes `accept_url`. The input does not become the record by being normalised.

Placeholder `provider.name` and `title`, compared after trimming and ASCII lowercasing, are `placeholder_name` on that field. Names: `various`, `see listing`, `see the listing`, `n/a`, `na`, `tbc`, `tba`, `unknown`, `test`, `none`, `null`, `not specified`, `not available`, `provider`, `company`, `remote`. Title-only additions to that test: `untitled`, `scholarship`, `job`, `internship`. The current scraper values `Various`, `See listing`, and `Remote` fail this rule on purpose.

`provider.type` `unknown` and `source.kind` `unknown` are honest values. They are not placeholders.

## 13. Verification and freshness

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `state` | string | yes | no | `unverified` or `verified` |
| `outcome` | string | yes | yes | Null only when `state` is `unverified`. Otherwise `confirmed_open`, `confirmed_closed`, `confirmed_expired`, `confirmed_withdrawn` |
| `method` | string | yes | yes | Null only when there has been no attempt. Otherwise `automated_review` or `human_review` |
| `reviewed_by` | string | yes | yes | `automation` or `human`, null only when `method` is null |
| `reviewer_id` | string | yes | yes | Null when `reviewed_by` is not `human`. Otherwise a slug `^[a-z0-9]+(?:-[a-z0-9]+)*$`, length 1..64. Never a bot, and never a student name |
| `source_checked_url` | string | yes | yes | Accepted `https` URL, section 12, of the official provider source when a check was attempted, else null |
| `evidence` | string | yes | yes | 1..2000 when a check was attempted, else null. Must name what was read. An HTTP status alone is not evidence |
| `last_attempt_at` | string | yes | yes | UTC timestamp of the latest attempt, including a failure |
| `last_attempt_outcome` | string | yes | yes | `confirmed_open`, `confirmed_closed`, `confirmed_expired`, `confirmed_withdrawn`, `inconclusive`, or `failed` |
| `last_success_at` | string | yes | yes | UTC timestamp of the latest successful confirmation, else null |
| `fresh_until` | string | yes | yes | Exactly 168 hours after `last_success_at`, else null |

**Agreed policy.**

- `fresh_until` is null if and only if `last_success_at` is null. When both are set, the gap is exactly 168 hours.
- `reviewed_by` `automation` requires `method` `automated_review` and `reviewer_id` null. `reviewed_by` `human` requires `method` `human_review` and a `reviewer_id`.
- `outcome` `confirmed_open` requires `lifecycle` published and open. `confirmed_expired` requires `status` `expired`. `confirmed_withdrawn` requires `publication_status` `withdrawn`. `confirmed_closed` requires `status` `closed`.
- `last_success_at`, when set, is `>= created_at` and `<= updated_at`. `source_checked_url` on a successful open check is the official provider or official application URL, not an aggregator page used as a substitute.
- A later `failed` or `inconclusive` attempt updates `last_attempt_at` and `last_attempt_outcome` only.
- Active feed, after the lifecycle and deadline checks: if `state` is not `verified` or `outcome` is not `confirmed_open`, error `not_verified` on `verification.state`. If it is `confirmed_open` and `evaluation_time` > `fresh_until`, error `stale_listing` on `verification.fresh_until`. Do not change `status` to `expired` for that case.
- Equality with `fresh_until` is still active. The next second is stale. The script's freshness oracle measures `2026-11-08T09:00:00Z` plus 168 hours as `2026-11-15T09:00:00Z`, still active at that instant, and stale at `2026-11-15T09:00:01Z`.
- Historical validation does not reject a stale row. The historical sample is expired, and its `fresh_until` `2026-11-08T00:00:00Z` is also before the pinned evaluation instant. Expiry is why it is off the active feed.

## 14. Lifecycle, active feed, and historical retention

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `publication_status` | string | yes | no | `draft`, `published`, `withdrawn` |
| `status` | string | yes | no | `open`, `closed`, `expired` |
| `closed_reason` | string | yes | yes | Null, or `deadline_passed`, `provider_closed`, `duplicate`, `untrusted`, `removed_by_producer`, `superseded` |

**Proposed stage-2 combinations, before any evaluation instant:**

| `publication_status` | `status` | `closed_reason` | Timestamp rules |
| --- | --- | --- | --- |
| `draft` | `open` | null | `published_at`, `expired_at`, `closed_at`, `withdrawn_at` all null |
| `published` | `open` | null | `published_at` set. `expired_at`, `closed_at`, `withdrawn_at` null |
| `published` | `expired` | `deadline_passed` | `expired_at` set and `> deadline.fixed_at`. `deadline.kind` is `fixed`. `closed_at` and `withdrawn_at` null |
| `published` | `closed` | `provider_closed`, `duplicate`, or `untrusted` | `closed_at` set. `expired_at` and `withdrawn_at` null |
| `withdrawn` | `closed` | `removed_by_producer` or `superseded` | Tombstone rules in section 15 |

Any other combination is `invalid_constraint` on `lifecycle.status`.

### Active feed versus historical record

Two functions share stages 1 and 2 (section 18) and then apply a different stage 3.

`validate_active_feed(listing, evaluation_time)` is what an active student feed must pass:

- If `publication_status` is not `published` or `status` is not `open`: one error, `not_on_active_feed` on `lifecycle.status`. Do not also emit `expired_deadline` or `stale_listing`. Withdrawn, closed, and expired hide here, which is sooner than the seven-day window.
- If it is published and open, and `deadline.kind` is `fixed`, and `evaluation_time` > `fixed_at`: `expired_deadline` on `deadline.fixed_at`.
- If it is published and open, and verification is not `verified` with `outcome` `confirmed_open`: `not_verified` on `verification.state`.
- If it is published, open, and successfully verified, and `evaluation_time` > `fresh_until`: `stale_listing` on `verification.fresh_until`. Leave `status` as `open`.
- Rolling and unknown do not produce `expired_deadline`.

`validate_historical(listing, evaluation_time)` is what a retained row must pass:

- A published open listing whose fixed deadline is already past is still an error: `expired_deadline` on `deadline.fixed_at`. History is not a way to store a contradiction. The producer marks it `expired` and then it can be retained.
- If `status` is `expired` and `evaluation_time` <= `fixed_at`: `status_deadline_mismatch` on `lifecycle.status` (it was marked expired too early).
- Draft, withdrawn, closed, expired-and-actually-past, and open-and-not-yet-past rows are retainable. Staleness does not reject them.

The invalid sample `invalid-expired-open` is the active-feed failure. The valid sample `valid-historical-expired` is the same kind of past deadline after the producer has marked it expired. Both keep the original `fixed_at`. Neither moves the date.

## 15. Identity, deduplication, update, and deletion

`identity`:

| Field | Type | Required | Null | Constraints |
| --- | --- | --- | --- | --- |
| `provider_key` | string | yes | no | Slug, 1..80 |
| `opportunity_key` | string | yes | no | Slug, 1..80. The programme, not the year |
| `round_key` | string | yes | no | Slug, 1..40. The application round. `unspecified` only when the source names none |
| `round_evidence` | string | yes | no | 1..300. The source words, or a sentence that the source named no round |

A slug matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

**Agreed policy.**

- `listing_id` is assigned once for one round and is never reused, including after withdrawal.
- PathSync may keep a local UUID. That UUID is not `listing_id`.
- `dedupe_key` is SHA-256 hex of UTF-8 `kind`, newline, `provider_key`, newline, `opportunity_key`, newline, `round_key`. The application URL is not an input.
- The same `dedupe_key` is the same round. A second `listing_id` is `duplicate_listing` on `dedupe_key`.
- A different `round_key` is a new `listing_id` even when `application.url` is unchanged. `previous_round_id` is set only when the producer confirms that the new round continues an earlier one.
- Restoring the same round keeps the id and increments `revision` after a successful verification.
- An update is the same id. `revision` becomes `stored + 1`. `updated_at` increases. `content_hash` changes. The same revision and the same hash is an idempotent replay. The same revision and a different hash is `revision_conflict` on `revision`.
- The single-record check does not know the stored revision. The store does. No card implements the store.
- Withdrawal is a new revision with `publication_status` `withdrawn`, `status` `closed`, and `closed_reason` `removed_by_producer` or `superseded`. The id remains. PathSync shows Withdrawn on a saved row.
- For 730 × 24 hours after `withdrawn_at` the historical feed keeps the minimal tombstone. That stops accidental reimport of the same round. It does not reserve the URL. Sensitive prose is already replaced by `[withdrawn]`.
- Tombstone text: `summary`, `description`, `how_to_apply`, and `eligibility.criteria_text` are exactly `[withdrawn]`. `education.source_wording` is `[withdrawn]`. `criteria_stated` is false. `documents_required` is `[]`. `award` is `not_stated`. `contact_email` is null. Title, provider, deadline facts, ids, and URLs stay. `title` is not `[withdrawn]`.
- After 730 days, reconciliation follows section 5. The tombstone sample passes `validate_record` and `validate_historical`, and fails `validate_active_feed` with `not_on_active_feed` on `lifecycle.status`.

## 16. Canonical JSON, dedupe key, and content hash

**Settled instruction for the digest algorithm.** The runnable copy is `docs/listings/compute_listing_hashes.py`. It uses the Python standard library only (`hashlib`, `json`, `unicodedata`, `zoneinfo`, `urllib.parse`).

From the repository root:

```text
python3 docs/listings/compute_listing_hashes.py
```

Inputs are the five synthetic fixtures:

- `docs/listings/fixtures/valid-scholarship.json`
- `docs/listings/fixtures/valid-internship.json`
- `docs/listings/fixtures/valid-job.json`
- `docs/listings/fixtures/valid-historical-expired.json`
- `docs/listings/fixtures/valid-tombstone.json`

The same five objects are embedded in section 21. The script refuses to pass if a fixture and the embedded object differ. The measured run is also stored at `docs/listings/hash-output.txt`. These files are documentation. They are not a product validator.

Algorithm, which the script performs and then checks:

1. Parse the JSON object. Duplicate keys are invalid. Pretty printing does not matter.
2. Apply Unicode NFC to every string. The hash is of those strings, encoded as UTF-8. Non-ASCII characters are not forced into `\u` escapes. `/` is not escaped.
3. Designated arrays must already be unique and sorted by UTF-8 bytes: `citizenship.countries`, `education.stages`, `education.qualifications`, `education.courses`, `education.years`, `education.institutions.names`, `demographics.requirements`, `demographics.preferences`, `audience_tags`, and `documents_required`. The hash does not silently reorder them. A different order is a different hash.
4. `application.url`, `source.url`, a non-null `provider.url`, and a non-null `verification.source_checked_url` must already pass section 12.1 `accept_url`. The script does not run `normalise_url` on a stored fixture and then treat that rewrite as acceptance. `listing_id` matches `^lst_[0-9A-HJKMNP-TV-Z]{26}$`.
5. JSON null is kept. An absent key is not the same value and is not invented before hashing.
6. `dedupe_key` is SHA-256, lowercase hex, of the UTF-8 bytes of `kind`, a newline, `identity.provider_key`, a newline, `identity.opportunity_key`, a newline, and `identity.round_key`. Each of those four values is a slug. The application URL is not included. The stored field must already equal that digest. A new round changes the digest even when the URL does not. The same round keeps the digest even when the URL changes.
7. `content_hash` is SHA-256, lowercase hex, of the UTF-8 JSON Canonicalization Scheme (RFC 8785) encoding of the object with `content_hash` removed and every other field kept, including `dedupe_key` and JSON null. This version has no fractional numbers, so sorted keys and no insignificant whitespace match JCS for these values.
8. A fixed `fixed_at` must equal the `zoneinfo` conversion of `display_date` and `local_time` in `resolved_timezone`, using `fold=0`. The script measures that. It does not accept a hand-typed offset.
9. Among the five fixtures, `listing_id` values must differ and `dedupe_key` values must differ. The same `dedupe_key` on another id is a duplicate of that round. The same `listing_id` and `revision` with a different `content_hash` is `revision_conflict`. The script also checks that `fresh_until` is exactly 168 hours after `last_success_at`.

Stage 2 of a future validator recomputes both digests. Error codes: `hash_mismatch` on `content_hash`, `dedupe_mismatch` on `dedupe_key`. Stage 1 does not compute them. The missing-field and bad-type samples set `content_hash` to 64 zeroes on purpose. Implementations that stop after stage 1 MUST NOT report a hash error for them.

Measured output of the command above, tzdata `2026e`, Python 3.12.3. This block is the script's stdout, not a hand-written hash:

```text
synthetic: true
not_production_data: true
command: python3 docs/listings/compute_listing_hashes.py
python: 3.12.3
tzdata: version 2026e
hash_excludes: content_hash
hash_includes: dedupe_key and every other stored field, including JSON null
collision_rule: same dedupe_key with a different listing_id is a duplicate of that round
url_rule: application URL is not dedupe material and does not block a new round
version_rule: same listing_id and revision with a different content_hash is revision_conflict
self_check_null_vs_absent: null=d091f9c83c091f79652fe8786375b3fe4ce0861a56f5bfbafedbe431877ff0e8 absent=44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a
self_check_unicode_nfc: composed=86028b41ba792eaf82aa26a45b218f6734f7f1096a86f1746c8296e088a0ccb4
self_check_array_order: GH before NG differs from NG before GH
url_accept: https://apply.rivertrust.example/2027 ok
url_accept: https://rivertrust.example ok
url_accept: https://apply.rivertrust.example/Path?a=1&b=2 ok
url_reject: http://apply.rivertrust.example/2027 scheme
url_reject: https://user:pass@apply.rivertrust.example/2027 userinfo
url_reject: https://apply.rivertrust.example/2027#form fragment
url_reject: https://apply.rivertrust.example:443/2027 host
url_reject: https://Apply.Rivertrust.example/2027 host
url_reject: https://apply.rivertrust.example/2027/ path
url_reject: https://localhost/2027 placeholder_host
url_reject: https://example.com/2027 placeholder_host
url_reject: https://apply.example.com/2027 placeholder_host
url_reject: https://apply.rivertrust.example/2027?utm_source=x tracking_query
url_reject: https://apply.rivertrust.example/2027?b=1&a=2 query_order
url_reject: https://apply.rivertrust.example/2027?B=1 query_key
url_reject: https://apply.rivertrust.example/2027?q=%2f query_value
url_normalise_not_acceptance: input=https://Apply.River.Example/Path/?utm_source=x&b=2&a=1
url_normalise_not_acceptance: input_accepted=no
url_normalise_not_acceptance: output=https://apply.river.example/Path?a=1&b=2
url_normalise_not_acceptance: output_accepted=yes
self_check_identity: crockford listing_id accepted; I rejected
self_check_round: same_round=65941874416207509e0b39022e94b84e6ac4b780cf92d6c45d356db44934eda4
self_check_new_round: next_round=9c2f233946856cda8a68c3429c69b3d5d89a532240fc438f6923b89c104e5682
self_check_url_not_in_dedupe: application URL is not dedupe material
fixture: docs/listings/fixtures/valid-scholarship.json
listing_id: lst_01ARZ3NDEKTSV4RRFFQ69G5FAV
kind: scholarship
revision: 1
dedupe_key: f18f8da3972c4d1932d54f31f674ec259d4b939fb38b184876341d978895e96f
content_hash: 64b7f2a8104bb0600312e75af20769ea4d78e47250f8c19396e9fce585680653
deadline_fixed_at: 2027-03-31T22:59:59Z
assert: match
fixture: docs/listings/fixtures/valid-internship.json
listing_id: lst_01ARZ3NDEKTSV4RRFFQ69G5FAW
kind: internship
revision: 1
dedupe_key: 695c935abed9b17a0774037c5c74101395f73462836a7116d69040237f73a58c
content_hash: 3fbfadf0f3208ac0591f3c91b4e9103705d9e4e25041870a8f139432ea8065a1
deadline_fixed_at: n/a
assert: match
fixture: docs/listings/fixtures/valid-job.json
listing_id: lst_01ARZ3NDEKTSV4RRFFQ69G5FAX
kind: job
revision: 1
dedupe_key: 2803f370604f5557da4817c2197a5035d9ee966a99f5bfbfb7ef6e52bee73c41
content_hash: 7b0feda2e51ec39b8a18ff91b0e9f2081114b9896bead2309c02dbdf0748b537
deadline_fixed_at: n/a
assert: match
fixture: docs/listings/fixtures/valid-historical-expired.json
listing_id: lst_01ARZ3NDEKTSV4RRFFQ69G5FAY
kind: scholarship
revision: 2
dedupe_key: 65941874416207509e0b39022e94b84e6ac4b780cf92d6c45d356db44934eda4
content_hash: 1a9c667969f8fc7a83776750d01cab23243c7dc8994435a9e6174285bc225044
deadline_fixed_at: 2026-10-31T23:59:59Z
assert: match
fixture: docs/listings/fixtures/valid-tombstone.json
listing_id: lst_01ARZ3NDEKTSV4RRFFQ69G5FB3
kind: scholarship
revision: 2
dedupe_key: 7eb7658492e0e678f476dcc16e5830feb49afc1e13ee480b6d218f07f2d4d6a3
content_hash: 6a664c2050a125fbee1e56590467fd3d48d48c9963ed3f121c60a35ca57ab9ab
deadline_fixed_at: 2027-03-31T22:59:59Z
assert: match
oracle: date_only_no_zone stated=none resolved=Africa/Lagos local=2027-03-31T23:59:59 fixed_at=2027-03-31T22:59:59Z
oracle: date_only_europe_london stated=Europe/London resolved=Europe/London local=2026-10-31T23:59:59 fixed_at=2026-10-31T23:59:59Z
oracle: date_only_wat_default_check stated=none resolved=Africa/Lagos local=2026-01-15T23:59:59 fixed_at=2026-01-15T22:59:59Z
oracle: instant_europe_paris stated=Europe/Paris resolved=Europe/Paris local=2027-06-01T15:00:00 fixed_at=2027-06-01T13:00:00Z
oracle_freshness: success=2026-11-08T09:00:00Z fresh_until=2026-11-15T09:00:00Z still_active_at=2026-11-15T09:00:00Z stale_at=2026-11-15T09:00:01Z
fixtures_checked: 5
result: ok
```

## 17. Privacy and sanitisation

**Fact.** The README says student input passes a regex layer and a spaCy NER layer before any LLM, and that only academic facts reach the model. `backend/app/middleware/privacy.py` redacts Nigerian phone numbers, NIN-shaped and BVN-shaped 11-digit runs, emails, street-like addresses, and spaCy `PERSON`, `GPE`, `LOC`, `FAC`, and `ORG` entities outside a short allow-list. That middleware is for student text. It is the wrong tool for listings: redacting `ORG` and `GPE` would destroy providers and places.

**Proposed.**

- A listing MUST NOT contain a student's name, NIN, BVN, phone, home address, bank account, transcript, or PathSync profile. Chat text, `student_profiles`, and onboard free text stay in PathSync.
- The record validator rejects, with `forbidden_personal_data` on the field, any free-text field that matches `\b\d{11}\b` (NIN/BVN-shaped), `\b(?:\+?234|0)[789]\d{9}\b` (Nigerian phone), or an email address. Free-text fields are `title`, `summary`, `description`, `how_to_apply`, `criteria_text`, `deadline.raw_text`, `provider.name`, `location.locality`, `award.summary`, `employment.duration_text`, `institutions.names[]`, and `documents_required[]`. `contact_email` is the only email field.
- HTML is rejected (`<` and `>`), not stripped, so two producers cannot sanitise differently.
- The validator does not call spaCy and does not call a model. Those calls are not deterministic.
- Image URLs are not a 1.0.0 field. The current `image_url` column is out of this contract. A later minor version may add one. It would still have to be a canonical `https` URL.
- PathSync MUST NOT send listing text through `redact_pii` before validation. Validation sees the producer strings. Letter generation continues to redact student input before a model call. That path is existing product behaviour, not redefined here.

## 18. Validator

**Proposed.** Three pure functions:

```text
validate_record(listing) -> list[Error]
validate_active_feed(listing, evaluation_time) -> list[Error]
validate_historical(listing, evaluation_time) -> list[Error]
```

```text
Error = {
  code: string,
  field: string,
  message: string,
  expected: string or absent,
  actual: string or absent,
  evaluation_time: string or absent
}
```

`message` MUST equal `code + ": " + field`. Example: `expired_deadline: deadline.fixed_at`. Tests assert `code`, `field`, and that the message contains the field path.

`field` is a dot path. Array indexes use `[0]`. The evaluation argument uses `$evaluation_time`. The whole document uses `$`.

No function reads the wall clock, the network, or a random source. Checking that `fixed_at` matches `resolved_timezone` reads the IANA timezone data, the same way section 16 does. No function rewrites the listing.

### Stage 1 — presence, types, unknown keys

Walk objects. The allowed keys are exactly the tables in sections 9, 10, 13, and 14. For each allowed key: missing → `missing_required_field`; present null where null is forbidden, or present with the wrong JSON type → `invalid_type` with `expected` and `actual`. Do not walk into a missing or wrongly typed parent. Unknown keys → `unknown_field`. Then stop if stage 1 produced any error. Sort by `(field, code)` using raw UTF-8 bytes.

The first card's missing-field sample omits `title`. The only stage-1 error is `missing_required_field` on `title`.

The first card's bad-type sample sets `revision` to the JSON string `"1"`. The only stage-1 error is `invalid_type` on `revision`, `expected` `integer`, `actual` `string`.

### Stage 2 — constraints that do not use `evaluation_time`

Apply sections 6 and 8–16, except the bullets that mention `evaluation_time`. Enums, patterns, lengths, sorts, uniqueness, citizenship consistency, deadline shape, lifecycle table, tombstone text, award consistency, employment-by-kind, canonical URLs, placeholder names, personal-data patterns, `dedupe_key`, and `content_hash`. Also `listing_id` alphabet and `previous_round_id` shape. Errors use `invalid_constraint`, `invalid_enum`, `placeholder_name`, `non_canonical_url`, `forbidden_personal_data`, `hash_mismatch`, or `dedupe_mismatch`, each with its field. Stop if any stage-2 error exists.

### Stage 3 — mode

Only if stages 1 and 2 are clean.

Shared preamble: if `evaluation_time` is not a valid UTC timestamp, return `invalid_constraint` on `$evaluation_time` and stop.

Active mode and historical mode then follow section 14. Also, in both modes, if `timestamps.updated_at` is more than 24 hours after `evaluation_time`, add `timestamp_in_future` on `timestamps.updated_at`.

Return stage-3 errors sorted by `(field, code)`.

### What the first card measures

After approval, the validator card in NaijaOpportunities is measured against this document at `CONTRACT_EVALUATION_TIME`:

| Fixture | Function | Result |
| --- | --- | --- |
| `valid-scholarship` | `validate_record`, `validate_active_feed`, `validate_historical` | no errors |
| `valid-internship` | all three | no errors |
| `valid-job` | all three | no errors. With `synthetic` false it stays discoverable. Unknown citizenship is Check eligibility, not a hide |
| `valid-historical-expired` | `validate_record`, `validate_historical` | no errors |
| `valid-historical-expired` | `validate_active_feed` | `not_on_active_feed` on `lifecycle.status` |
| `valid-tombstone` | `validate_record`, `validate_historical` | no errors |
| `valid-tombstone` | `validate_active_feed` | `not_on_active_feed` on `lifecycle.status` |
| `invalid-missing-title` | `validate_record` | `missing_required_field` on `title` |
| `invalid-revision-type` | `validate_record` | `invalid_type` on `revision` |
| `invalid-expired-open` | `validate_record` | no errors |
| `invalid-expired-open` | `validate_active_feed` and `validate_historical` | `expired_deadline` on `deadline.fixed_at` |

"Valid samples pass" means the five valid fixtures pass `validate_record`. The expired-deadline failure is `validate_active_feed` on `invalid-expired-open`, whose message names `deadline.fixed_at`.

## 19. Proposed sync, pagination, and errors

**Uncertain / not an endpoint.** Neither repository contains a listings sync route. PathSync ingest is a local insert. NaijaOpportunities' checked-in routes at the observed commit are contact and image-proxy. The operation below is a logical contract for a later card. It assigns no scheme, host, or path. A later card that binds it to HTTPS must name the base URL in its own approved note. This document does not reserve `/api/v1/listings` or any other path, because inventing one would look like a live API.

**Proposed logical operation.**

```text
ListingsSync(
  feed,                "active" or "historical"
  schema_version,      "1.0.0"
  updated_after,       UTC timestamp or null
  limit,               integer 1..100, default 50
  cursor,              string or null
  evaluation_time      UTC timestamp
) -> page or error
```

`feed=active` returns only listings that pass `validate_active_feed` at `evaluation_time`, with `synthetic=false`. `feed=historical` returns listings that pass `validate_historical`, including expired and withdrawn rows, with `synthetic=false`.

Order is `timestamps.updated_at` ascending, then `listing_id` ascending. `updated_after` excludes rows whose `updated_at` is less than or equal to that instant. The cursor is the unpadded base64url encoding of `updated_at + "\n" + listing_id` of the last row returned. Clients treat it as opaque. Implementers use this encoding so tests do not need a secret.

Oracle: `updated_at` `2026-11-08T09:00:00Z` and `listing_id` `lst_01ARZ3NDEKTSV4RRFFQ69G5FAV` encode to

`MjAyNi0xMS0wOFQwOTowMDowMFoKbHN0XzAxQVJaM05ERUtUU1Y0UlJGRlE2OUc1RkFW`

A page is a JSON object:

```json
{
  "schema_version": "1.0.0",
  "feed": "active",
  "evaluation_time": "2026-11-08T12:00:00Z",
  "listings": [],
  "next_cursor": null
}
```

`next_cursor` is null on the last page. `listings` has at most `limit` items.

If one listing inside a page fails validation, the producer MUST NOT include it. The consumer, defending itself, skips a bad listing and records the error. It does not fail the whole page, except when `schema_version` has a different major, which fails the page with `unsupported_schema_version` on `schema_version`.

Page-level error object, the same shape as a validator error plus optional `listing_id`:

```json
{
  "code": "expired_deadline",
  "field": "deadline.fixed_at",
  "message": "expired_deadline: deadline.fixed_at",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FB2"
}
```

Logical codes for the sync and store, beyond the validator codes: `invalid_cursor` on `cursor`, `invalid_limit` on `limit`, `duplicate_listing` on `dedupe_key`, `revision_conflict` on `revision`, `unsupported_schema_version` on `schema_version`.

If a later card chooses HTTPS, this proposal's status mapping is: a page is success; a bad cursor or limit is a client error; a duplicate or revision conflict is a conflict; a single-listing validate call that fails stage 1 or 2 is a validation error. Status numbers are not assigned here, because there is no transport yet.

The consumer's sync cursor is per feed. PathSync does not assume the producer's `created_at` column order. The current Naija pages order by `created_at` descending. That is a website sort, not this sync order.

## 20. Distribution pin

This path, `docs/data-contract.md` in `GoodnessOni/pathsync-ai`, is the only editable source of the contract. NaijaOpportunities does not keep a drifting copy of the prose.

Goodness approved the policies in commit `34969abca843462beb7b96ca1a7f3b4ffc723485`. That commit is the policy decision. It is not the pin for this corrected text. The first validator card pins the corrected commit only after section 24 names that SHA. It does not pin branch `rebuild/pathsync-v2`, and it does not pin `main`. Until then the lock's `git_sha` stays null. Nobody should point a validator at this file's moving branch tip.

The pin the future card adds in the NaijaOpportunities repository, and not in this task, is a lock of this shape:

```json
{
  "consumer_repository": "GoodnessOni/pathsync-ai",
  "contract_path": "docs/data-contract.md",
  "git_sha": null,
  "schema_version": "1.0.0"
}
```

`git_sha` will be the 40-character lowercase SHA of the approved commit. The validator's test reads the file at that SHA (a checkout of that commit, or a byte-for-byte vendored copy accompanied by the same SHA). A test that fetches "latest" is a failed pin. When this contract changes, the same card that changes the validator updates the SHA. The previous SHA remains the definition of the previous version.

This task does not add that lock, does not open a pull request in the other repository, and does not merge this branch.

## 21. Synthetic samples

All seven fixtures use `synthetic: true`. Hosts end in `.example`. They are not live programmes. Hashes below are properties of the JSON objects, recomputed by the algorithm in section 16. Pretty printing is not significant. Key order in these blocks is for reading.

The two stage-1 failures set `content_hash` to 64 zeroes. `dedupe_key` is the real digest of kind, provider, opportunity, and round. Those fields are not the defect. Stage 1 must stop before hashing.

`CONTRACT_EVALUATION_TIME` for every judgement in this section is `2026-11-08T12:00:00Z`.

### 21.1 Valid scholarship — fixed deadline, still open

Passes all three validator functions. The source date has no zone, so the resolved zone is Africa/Lagos and `fixed_at` is the measured instant `2027-03-31T22:59:59Z`. Citizenship is an explicit `NG` requirement. Ignoring `synthetic`, a student whose nationality is `NG`, whose stage and course fit, and whose CGPA is on the 5.0 scale and at least 3.50 would be included. A 4.0-scale grade is not converted. Fresh until `2026-11-15T09:00:00Z`.

<!-- sample:valid-scholarship -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "kind": "scholarship",
  "synthetic": true,
  "revision": 1,
  "title": "River Trust Undergraduate Engineering Award 2027",
  "summary": "Synthetic award for Nigerian undergraduates in engineering and computer science.",
  "description": "A fictional foundation offers a one-year award for Nigerian university undergraduates studying engineering or computer science. This record is synthetic and is not a real scholarship.",
  "provider": {
    "name": "River Trust",
    "type": "foundation",
    "country": "NG",
    "url": "https://rivertrust.example"
  },
  "source": {
    "name": "synthetic-directory",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-trust-2027",
    "retrieved_at": "2026-11-08T09:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/2027",
    "url_kind": "official_programme_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [
      "nigerian_university_student"
    ],
    "criteria_stated": true,
    "criteria_text": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale.",
    "citizenship": {
      "requirement": "explicit",
      "countries": [
        "NG"
      ]
    },
    "education": {
      "requirement": "restricted",
      "stages": [
        "undergraduate"
      ],
      "qualifications": [
        "bachelor"
      ],
      "courses": [
        "computer_science",
        "engineering"
      ],
      "years": [
        "200",
        "300",
        "400"
      ],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale."
    },
    "grade": {
      "requirement": "explicit",
      "scale": "5.0",
      "minimum_hundredths": 350,
      "source_wording": "Minimum CGPA 3.50 on a 5.0 scale."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "fixed",
    "form": "date_only",
    "stated_timezone": null,
    "resolved_timezone": "Africa/Lagos",
    "display_date": "2027-03-31",
    "local_time": "23:59:59",
    "boundary": "inclusive_end_of_local_day",
    "fixed_at": "2027-03-31T22:59:59Z",
    "raw_text": "Closes 31 March 2027."
  },
  "award": {
    "kind": "cash",
    "summary": "200000 NGN for one academic year.",
    "currency": "NGN",
    "amount_minor": 20000000,
    "period": "per_year"
  },
  "location": {
    "country": "NG",
    "locality": null,
    "arrangement": "on_site"
  },
  "employment": null,
  "documents_required": [
    "CGPA transcript",
    "University ID"
  ],
  "how_to_apply": "Submit the synthetic form on the programme page.",
  "lifecycle": {
    "publication_status": "published",
    "status": "open",
    "closed_reason": null
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_open",
    "method": "automated_review",
    "reviewed_by": "automation",
    "reviewer_id": null,
    "source_checked_url": "https://apply.rivertrust.example/2027",
    "evidence": "Official provider page checked for open status, deadline, eligibility, and the application link. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-08T09:00:00Z",
    "last_attempt_outcome": "confirmed_open",
    "last_success_at": "2026-11-08T09:00:00Z",
    "fresh_until": "2026-11-15T09:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-10-01T08:00:00Z",
    "updated_at": "2026-11-08T09:00:00Z",
    "published_at": "2026-10-01T08:00:00Z",
    "expired_at": null,
    "closed_at": null,
    "withdrawn_at": null
  },
  "dedupe_key": "f18f8da3972c4d1932d54f31f674ec259d4b939fb38b184876341d978895e96f",
  "content_hash": "64b7f2a8104bb0600312e75af20769ea4d78e47250f8c19396e9fce585680653",
  "identity": {
    "provider_key": "river-trust",
    "opportunity_key": "undergraduate-engineering-award",
    "round_key": "2027",
    "round_evidence": "The source names the 2027 award."
  },
  "previous_round_id": null
}
```

### 21.2 Valid internship — rolling deadline

Passes all three functions. `deadline.kind` is `rolling`. No date was invented. Citizenship is unconstrained and the grade requirement is none. Education is restricted to computer science at undergraduate or postgraduate stage, so a student in either stage can match. Ignoring `synthetic`, nationality does not exclude anyone.

<!-- sample:valid-internship -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  "kind": "internship",
  "synthetic": true,
  "revision": 1,
  "title": "River Trust Campus Internship 2027",
  "summary": "Synthetic 12-week paid internship for Nigerian university students in computer science.",
  "description": "A fictional Lagos host offers a 12-week paid internship. Applications stay open on a rolling basis. This record is synthetic and is not a real internship.",
  "provider": {
    "name": "River Trust",
    "type": "foundation",
    "country": "NG",
    "url": "https://rivertrust.example"
  },
  "source": {
    "name": "synthetic-directory",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-trust-intern-2027",
    "retrieved_at": "2026-11-08T09:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/interns/2027",
    "url_kind": "official_programme_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [
      "nigerian_university_student",
      "open_international"
    ],
    "criteria_stated": true,
    "criteria_text": "Open to university students in computer science. No nationality limit and no minimum CGPA are stated.",
    "citizenship": {
      "requirement": "unconstrained",
      "countries": [
        "*"
      ]
    },
    "education": {
      "requirement": "restricted",
      "stages": [
        "postgraduate",
        "undergraduate"
      ],
      "qualifications": [
        "bachelor",
        "master"
      ],
      "courses": [
        "computer_science"
      ],
      "years": [],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "Open to university students in computer science. No nationality limit and no minimum CGPA are stated."
    },
    "grade": {
      "requirement": "none",
      "scale": null,
      "minimum_hundredths": null,
      "source_wording": "The source states no minimum grade."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "rolling",
    "form": null,
    "stated_timezone": null,
    "resolved_timezone": null,
    "display_date": null,
    "local_time": null,
    "boundary": null,
    "fixed_at": null,
    "raw_text": "Applications are accepted on a rolling basis until positions are filled."
  },
  "award": {
    "kind": "stipend",
    "summary": "150000 NGN per month.",
    "currency": "NGN",
    "amount_minor": 15000000,
    "period": "per_month"
  },
  "location": {
    "country": "NG",
    "locality": "Lagos",
    "arrangement": "hybrid"
  },
  "employment": {
    "employment_type": "internship",
    "duration_text": "12 weeks",
    "paid": true
  },
  "documents_required": [
    "CV",
    "University ID"
  ],
  "how_to_apply": "Submit the synthetic internship form on the programme page.",
  "lifecycle": {
    "publication_status": "published",
    "status": "open",
    "closed_reason": null
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_open",
    "method": "automated_review",
    "reviewed_by": "automation",
    "reviewer_id": null,
    "source_checked_url": "https://apply.rivertrust.example/interns/2027",
    "evidence": "Official provider page checked for open status, deadline, eligibility, and the application link. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-08T09:00:00Z",
    "last_attempt_outcome": "confirmed_open",
    "last_success_at": "2026-11-08T09:00:00Z",
    "fresh_until": "2026-11-15T09:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-10-01T08:00:00Z",
    "updated_at": "2026-11-08T09:00:00Z",
    "published_at": "2026-10-01T08:00:00Z",
    "expired_at": null,
    "closed_at": null,
    "withdrawn_at": null
  },
  "dedupe_key": "695c935abed9b17a0774037c5c74101395f73462836a7116d69040237f73a58c",
  "content_hash": "3fbfadf0f3208ac0591f3c91b4e9103705d9e4e25041870a8f139432ea8065a1",
  "identity": {
    "provider_key": "river-trust",
    "opportunity_key": "campus-internship",
    "round_key": "2027",
    "round_evidence": "The source names the 2027 internship."
  },
  "previous_round_id": null
}
```

### 21.3 Valid job — unknown deadline and unknown citizenship

Passes all three functions. The unknown deadline is not expired and is not a fabricated date. Education is unrestricted, so the lack of a degree requirement does not remove this job from matching. Citizenship is unknown, so a student sees it as Check eligibility rather than as a confirmed match. Ignoring `synthetic`, it is not hidden for being a job.

<!-- sample:valid-job -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FAX",
  "kind": "job",
  "synthetic": true,
  "revision": 1,
  "title": "River Trust Operations Analyst",
  "summary": "Synthetic full-time role. Citizenship requirements are not stated.",
  "description": "A fictional employer lists an operations analyst role in Abuja. The source does not state a closing date or a citizenship rule. This record is synthetic and is not a real job.",
  "provider": {
    "name": "River Transit Ltd",
    "type": "company",
    "country": "NG",
    "url": "https://rivertransit.example"
  },
  "source": {
    "name": "synthetic-board",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-transit-analyst",
    "retrieved_at": "2026-11-08T09:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/jobs/analyst",
    "url_kind": "aggregator_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [],
    "criteria_stated": false,
    "criteria_text": "Not stated by the source.",
    "citizenship": {
      "requirement": "unknown",
      "countries": []
    },
    "education": {
      "requirement": "unrestricted",
      "stages": [],
      "qualifications": [],
      "courses": [],
      "years": [],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "The source states no education requirement."
    },
    "grade": {
      "requirement": "none",
      "scale": null,
      "minimum_hundredths": null,
      "source_wording": "The source states no minimum grade."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "unknown",
    "form": null,
    "stated_timezone": null,
    "resolved_timezone": null,
    "display_date": null,
    "local_time": null,
    "boundary": null,
    "fixed_at": null,
    "raw_text": null
  },
  "award": {
    "kind": "not_stated",
    "summary": null,
    "currency": null,
    "amount_minor": null,
    "period": null
  },
  "location": {
    "country": "NG",
    "locality": "Abuja",
    "arrangement": "on_site"
  },
  "employment": {
    "employment_type": "full_time",
    "duration_text": null,
    "paid": null
  },
  "documents_required": [],
  "how_to_apply": "Not stated by the source.",
  "lifecycle": {
    "publication_status": "published",
    "status": "open",
    "closed_reason": null
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_open",
    "method": "automated_review",
    "reviewed_by": "automation",
    "reviewer_id": null,
    "source_checked_url": "https://rivertransit.example",
    "evidence": "Official provider page checked for open status, deadline, eligibility, and the application link. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-08T09:00:00Z",
    "last_attempt_outcome": "confirmed_open",
    "last_success_at": "2026-11-08T09:00:00Z",
    "fresh_until": "2026-11-15T09:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-10-01T08:00:00Z",
    "updated_at": "2026-11-08T09:00:00Z",
    "published_at": "2026-10-01T08:00:00Z",
    "expired_at": null,
    "closed_at": null,
    "withdrawn_at": null
  },
  "dedupe_key": "2803f370604f5557da4817c2197a5035d9ee966a99f5bfbfb7ef6e52bee73c41",
  "content_hash": "7b0feda2e51ec39b8a18ff91b0e9f2081114b9896bead2309c02dbdf0748b537",
  "identity": {
    "provider_key": "river-transit",
    "opportunity_key": "operations-analyst",
    "round_key": "unspecified",
    "round_evidence": "The source does not name an application round."
  },
  "previous_round_id": null
}
```

### 21.4 Valid historical scholarship — expired and retained

The source names the United Kingdom, so `stated_timezone` and `resolved_timezone` are `Europe/London`. End of 31 October 2026 in that zone is the measured instant `2026-10-31T23:59:59Z`, which is before the pin. The same date with no stated zone would have been `2026-10-31T22:59:59Z` in Africa/Lagos. `status` is `expired`. `expired_at` is `2026-11-01T00:00:00Z`, the next second. The row is also stale at the pin (`fresh_until` `2026-11-08T00:00:00Z`). Historical mode allows that. Active mode fails with `not_on_active_feed` on `lifecycle.status`, not with `expired_deadline`, because the producer already marked it expired.

<!-- sample:valid-historical-expired -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FAY",
  "kind": "scholarship",
  "synthetic": true,
  "revision": 2,
  "title": "River Trust Bridge Award 2026",
  "summary": "Synthetic award retained after its deadline for history. It is not open.",
  "description": "A fictional award whose closing date has passed. The source names the United Kingdom, so the deadline uses Europe/London rather than West Africa Time. The producer keeps the record and marks it expired. This record is synthetic.",
  "provider": {
    "name": "River Trust",
    "type": "foundation",
    "country": "NG",
    "url": "https://rivertrust.example"
  },
  "source": {
    "name": "synthetic-directory",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-trust-bridge-2026",
    "retrieved_at": "2026-11-01T00:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/bridge-2026",
    "url_kind": "official_programme_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [
      "nigerian_university_student"
    ],
    "criteria_stated": true,
    "criteria_text": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale.",
    "citizenship": {
      "requirement": "explicit",
      "countries": [
        "NG"
      ]
    },
    "education": {
      "requirement": "restricted",
      "stages": [
        "undergraduate"
      ],
      "qualifications": [
        "bachelor"
      ],
      "courses": [
        "computer_science",
        "engineering"
      ],
      "years": [
        "200",
        "300",
        "400"
      ],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale."
    },
    "grade": {
      "requirement": "explicit",
      "scale": "5.0",
      "minimum_hundredths": 350,
      "source_wording": "Minimum CGPA 3.50 on a 5.0 scale."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "fixed",
    "form": "date_only",
    "stated_timezone": "Europe/London",
    "resolved_timezone": "Europe/London",
    "display_date": "2026-10-31",
    "local_time": "23:59:59",
    "boundary": "inclusive_end_of_local_day",
    "fixed_at": "2026-10-31T23:59:59Z",
    "raw_text": "Closes 31 October 2026 (United Kingdom)."
  },
  "award": {
    "kind": "cash",
    "summary": "200000 NGN for one academic year.",
    "currency": "NGN",
    "amount_minor": 20000000,
    "period": "per_year"
  },
  "location": {
    "country": "NG",
    "locality": null,
    "arrangement": "on_site"
  },
  "employment": null,
  "documents_required": [
    "CGPA transcript",
    "University ID"
  ],
  "how_to_apply": "Submit the synthetic form on the programme page.",
  "lifecycle": {
    "publication_status": "published",
    "status": "expired",
    "closed_reason": "deadline_passed"
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_expired",
    "method": "automated_review",
    "reviewed_by": "automation",
    "reviewer_id": null,
    "source_checked_url": "https://apply.rivertrust.example/bridge-2026",
    "evidence": "Official provider page shows the deadline has passed. Open status, deadline, eligibility, and the application link were checked. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-01T00:00:00Z",
    "last_attempt_outcome": "confirmed_expired",
    "last_success_at": "2026-11-01T00:00:00Z",
    "fresh_until": "2026-11-08T00:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-09-01T08:00:00Z",
    "updated_at": "2026-11-01T00:00:00Z",
    "published_at": "2026-09-01T08:00:00Z",
    "expired_at": "2026-11-01T00:00:00Z",
    "closed_at": null,
    "withdrawn_at": null
  },
  "dedupe_key": "65941874416207509e0b39022e94b84e6ac4b780cf92d6c45d356db44934eda4",
  "content_hash": "1a9c667969f8fc7a83776750d01cab23243c7dc8994435a9e6174285bc225044",
  "identity": {
    "provider_key": "river-trust",
    "opportunity_key": "bridge-award",
    "round_key": "2026",
    "round_evidence": "The source names the 2026 United Kingdom round."
  },
  "previous_round_id": null
}
```

### 21.5 Valid tombstone — withdrawn, id retained

Active mode fails with `not_on_active_feed` on `lifecycle.status`. Record and historical modes pass. Prose fields are `[withdrawn]`. The title and the deadline facts remain. `award` is `not_stated`, not a fake zero.

<!-- sample:valid-tombstone -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FB3",
  "kind": "scholarship",
  "synthetic": true,
  "revision": 2,
  "title": "River Trust Withdrawn Example 2027",
  "summary": "[withdrawn]",
  "description": "[withdrawn]",
  "provider": {
    "name": "River Trust",
    "type": "foundation",
    "country": "NG",
    "url": "https://rivertrust.example"
  },
  "source": {
    "name": "synthetic-directory",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-trust-withdrawn-2027",
    "retrieved_at": "2026-11-08T09:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/withdrawn-2027",
    "url_kind": "official_programme_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [
      "nigerian_university_student"
    ],
    "criteria_stated": false,
    "criteria_text": "[withdrawn]",
    "citizenship": {
      "requirement": "explicit",
      "countries": [
        "NG"
      ]
    },
    "education": {
      "requirement": "restricted",
      "stages": [
        "undergraduate"
      ],
      "qualifications": [
        "bachelor"
      ],
      "courses": [
        "computer_science",
        "engineering"
      ],
      "years": [
        "200",
        "300",
        "400"
      ],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "[withdrawn]"
    },
    "grade": {
      "requirement": "explicit",
      "scale": "5.0",
      "minimum_hundredths": 350,
      "source_wording": "Minimum CGPA 3.50 on a 5.0 scale."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "fixed",
    "form": "date_only",
    "stated_timezone": null,
    "resolved_timezone": "Africa/Lagos",
    "display_date": "2027-03-31",
    "local_time": "23:59:59",
    "boundary": "inclusive_end_of_local_day",
    "fixed_at": "2027-03-31T22:59:59Z",
    "raw_text": "Closes 31 March 2027."
  },
  "award": {
    "kind": "not_stated",
    "summary": null,
    "currency": null,
    "amount_minor": null,
    "period": null
  },
  "location": {
    "country": "NG",
    "locality": null,
    "arrangement": "on_site"
  },
  "employment": null,
  "documents_required": [],
  "how_to_apply": "[withdrawn]",
  "lifecycle": {
    "publication_status": "withdrawn",
    "status": "closed",
    "closed_reason": "removed_by_producer"
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_withdrawn",
    "method": "human_review",
    "reviewed_by": "human",
    "reviewer_id": "editor-synthetic-01",
    "source_checked_url": "https://apply.rivertrust.example/withdrawn-2027",
    "evidence": "Official provider page says this round was withdrawn. Open status, deadline, eligibility, and the application link were checked. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-08T10:00:00Z",
    "last_attempt_outcome": "confirmed_withdrawn",
    "last_success_at": "2026-11-08T10:00:00Z",
    "fresh_until": "2026-11-15T10:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-10-01T08:00:00Z",
    "updated_at": "2026-11-08T10:00:00Z",
    "published_at": "2026-10-01T08:00:00Z",
    "expired_at": null,
    "closed_at": null,
    "withdrawn_at": "2026-11-08T10:00:00Z"
  },
  "dedupe_key": "7eb7658492e0e678f476dcc16e5830feb49afc1e13ee480b6d218f07f2d4d6a3",
  "content_hash": "6a664c2050a125fbee1e56590467fd3d48d48c9963ed3f121c60a35ca57ab9ab",
  "identity": {
    "provider_key": "river-trust",
    "opportunity_key": "withdrawn-example",
    "round_key": "2027",
    "round_evidence": "The source names the 2027 example round."
  },
  "previous_round_id": null
}
```

### 21.6 Invalid — missing required field

`title` is absent. `validate_record` fails. The error names the field.

```json
{
  "code": "missing_required_field",
  "field": "title",
  "message": "missing_required_field: title"
}
```

<!-- sample:invalid-missing-title -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FB0",
  "kind": "scholarship",
  "synthetic": true,
  "revision": 1,
  "summary": "Synthetic award for Nigerian undergraduates in engineering and computer science.",
  "description": "A fictional foundation offers a one-year award for Nigerian university undergraduates studying engineering or computer science. This record is synthetic and is not a real scholarship.",
  "provider": {
    "name": "River Trust",
    "type": "foundation",
    "country": "NG",
    "url": "https://rivertrust.example"
  },
  "source": {
    "name": "synthetic-directory",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-trust-2027",
    "retrieved_at": "2026-11-08T09:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/2027",
    "url_kind": "official_programme_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [
      "nigerian_university_student"
    ],
    "criteria_stated": true,
    "criteria_text": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale.",
    "citizenship": {
      "requirement": "explicit",
      "countries": [
        "NG"
      ]
    },
    "education": {
      "requirement": "restricted",
      "stages": [
        "undergraduate"
      ],
      "qualifications": [
        "bachelor"
      ],
      "courses": [
        "computer_science",
        "engineering"
      ],
      "years": [
        "200",
        "300",
        "400"
      ],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale."
    },
    "grade": {
      "requirement": "explicit",
      "scale": "5.0",
      "minimum_hundredths": 350,
      "source_wording": "Minimum CGPA 3.50 on a 5.0 scale."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "fixed",
    "form": "date_only",
    "stated_timezone": null,
    "resolved_timezone": "Africa/Lagos",
    "display_date": "2027-03-31",
    "local_time": "23:59:59",
    "boundary": "inclusive_end_of_local_day",
    "fixed_at": "2027-03-31T22:59:59Z",
    "raw_text": "Closes 31 March 2027."
  },
  "award": {
    "kind": "cash",
    "summary": "200000 NGN for one academic year.",
    "currency": "NGN",
    "amount_minor": 20000000,
    "period": "per_year"
  },
  "location": {
    "country": "NG",
    "locality": null,
    "arrangement": "on_site"
  },
  "employment": null,
  "documents_required": [
    "CGPA transcript",
    "University ID"
  ],
  "how_to_apply": "Submit the synthetic form on the programme page.",
  "lifecycle": {
    "publication_status": "published",
    "status": "open",
    "closed_reason": null
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_open",
    "method": "automated_review",
    "reviewed_by": "automation",
    "reviewer_id": null,
    "source_checked_url": "https://apply.rivertrust.example/2027",
    "evidence": "Official provider page checked for open status, deadline, eligibility, and the application link. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-08T09:00:00Z",
    "last_attempt_outcome": "confirmed_open",
    "last_success_at": "2026-11-08T09:00:00Z",
    "fresh_until": "2026-11-15T09:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-10-01T08:00:00Z",
    "updated_at": "2026-11-08T09:00:00Z",
    "published_at": "2026-10-01T08:00:00Z",
    "expired_at": null,
    "closed_at": null,
    "withdrawn_at": null
  },
  "dedupe_key": "f18f8da3972c4d1932d54f31f674ec259d4b939fb38b184876341d978895e96f",
  "content_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "identity": {
    "provider_key": "river-trust",
    "opportunity_key": "undergraduate-engineering-award",
    "round_key": "2027",
    "round_evidence": "The source names the 2027 award."
  },
  "previous_round_id": null
}
```

### 21.7 Invalid — wrong JSON type

`revision` is the string `"1"`, not an integer. `validate_record` fails. The error names the field.

```json
{
  "code": "invalid_type",
  "field": "revision",
  "message": "invalid_type: revision",
  "expected": "integer",
  "actual": "string"
}
```

<!-- sample:invalid-revision-type -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FB1",
  "kind": "scholarship",
  "synthetic": true,
  "revision": "1",
  "title": "River Trust Undergraduate Engineering Award 2027",
  "summary": "Synthetic award for Nigerian undergraduates in engineering and computer science.",
  "description": "A fictional foundation offers a one-year award for Nigerian university undergraduates studying engineering or computer science. This record is synthetic and is not a real scholarship.",
  "provider": {
    "name": "River Trust",
    "type": "foundation",
    "country": "NG",
    "url": "https://rivertrust.example"
  },
  "source": {
    "name": "synthetic-directory",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-trust-2027",
    "retrieved_at": "2026-11-08T09:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/2027",
    "url_kind": "official_programme_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [
      "nigerian_university_student"
    ],
    "criteria_stated": true,
    "criteria_text": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale.",
    "citizenship": {
      "requirement": "explicit",
      "countries": [
        "NG"
      ]
    },
    "education": {
      "requirement": "restricted",
      "stages": [
        "undergraduate"
      ],
      "qualifications": [
        "bachelor"
      ],
      "courses": [
        "computer_science",
        "engineering"
      ],
      "years": [
        "200",
        "300",
        "400"
      ],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale."
    },
    "grade": {
      "requirement": "explicit",
      "scale": "5.0",
      "minimum_hundredths": 350,
      "source_wording": "Minimum CGPA 3.50 on a 5.0 scale."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "fixed",
    "form": "date_only",
    "stated_timezone": null,
    "resolved_timezone": "Africa/Lagos",
    "display_date": "2027-03-31",
    "local_time": "23:59:59",
    "boundary": "inclusive_end_of_local_day",
    "fixed_at": "2027-03-31T22:59:59Z",
    "raw_text": "Closes 31 March 2027."
  },
  "award": {
    "kind": "cash",
    "summary": "200000 NGN for one academic year.",
    "currency": "NGN",
    "amount_minor": 20000000,
    "period": "per_year"
  },
  "location": {
    "country": "NG",
    "locality": null,
    "arrangement": "on_site"
  },
  "employment": null,
  "documents_required": [
    "CGPA transcript",
    "University ID"
  ],
  "how_to_apply": "Submit the synthetic form on the programme page.",
  "lifecycle": {
    "publication_status": "published",
    "status": "open",
    "closed_reason": null
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_open",
    "method": "automated_review",
    "reviewed_by": "automation",
    "reviewer_id": null,
    "source_checked_url": "https://apply.rivertrust.example/2027",
    "evidence": "Official provider page checked for open status, deadline, eligibility, and the application link. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-08T09:00:00Z",
    "last_attempt_outcome": "confirmed_open",
    "last_success_at": "2026-11-08T09:00:00Z",
    "fresh_until": "2026-11-15T09:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-10-01T08:00:00Z",
    "updated_at": "2026-11-08T09:00:00Z",
    "published_at": "2026-10-01T08:00:00Z",
    "expired_at": null,
    "closed_at": null,
    "withdrawn_at": null
  },
  "dedupe_key": "f18f8da3972c4d1932d54f31f674ec259d4b939fb38b184876341d978895e96f",
  "content_hash": "0000000000000000000000000000000000000000000000000000000000000000",
  "identity": {
    "provider_key": "river-trust",
    "opportunity_key": "undergraduate-engineering-award",
    "round_key": "2027",
    "round_evidence": "The source names the 2027 award."
  },
  "previous_round_id": null
}
```

### 21.8 Invalid — expired deadline on the active feed

Stages 1 and 2 pass. `lifecycle.status` is still `open`. `fixed_at` is `2026-01-15T22:59:59Z`. At `2026-11-08T12:00:00Z` both `validate_active_feed` and `validate_historical` fail. The error names the field. The fix is not to delete the date and not to push the date forward. The retained shape is section 21.4.

```json
{
  "code": "expired_deadline",
  "field": "deadline.fixed_at",
  "message": "expired_deadline: deadline.fixed_at",
  "evaluation_time": "2026-11-08T12:00:00Z"
}
```

<!-- sample:invalid-expired-open -->
```json
{
  "schema_version": "1.0.0",
  "listing_id": "lst_01ARZ3NDEKTSV4RRFFQ69G5FB2",
  "kind": "scholarship",
  "synthetic": true,
  "revision": 1,
  "title": "River Trust Bridge Award 2026",
  "summary": "Synthetic award still marked open after its deadline. Validators must reject it on the active feed.",
  "description": "A fictional award whose closing instant has passed while lifecycle.status is still open. This is the active-feed rejection case. It is synthetic.",
  "provider": {
    "name": "River Trust",
    "type": "foundation",
    "country": "NG",
    "url": "https://rivertrust.example"
  },
  "source": {
    "name": "synthetic-directory",
    "kind": "aggregator",
    "url": "https://directory.example/listings/river-trust-bridge-2026-open",
    "retrieved_at": "2026-11-08T09:00:00Z"
  },
  "application": {
    "url": "https://apply.rivertrust.example/bridge-2026-open",
    "url_kind": "official_programme_page",
    "contact_email": null
  },
  "eligibility": {
    "audience_tags": [
      "nigerian_university_student"
    ],
    "criteria_stated": true,
    "criteria_text": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale.",
    "citizenship": {
      "requirement": "explicit",
      "countries": [
        "NG"
      ]
    },
    "education": {
      "requirement": "restricted",
      "stages": [
        "undergraduate"
      ],
      "qualifications": [
        "bachelor"
      ],
      "courses": [
        "computer_science",
        "engineering"
      ],
      "years": [
        "200",
        "300",
        "400"
      ],
      "institutions": {
        "requirement": "unrestricted",
        "names": []
      },
      "source_wording": "Nigerian citizen. Undergraduate in 200, 300, or 400 level. Engineering or computer science. Minimum CGPA 3.50 on a 5.0 scale."
    },
    "grade": {
      "requirement": "explicit",
      "scale": "5.0",
      "minimum_hundredths": 350,
      "source_wording": "Minimum CGPA 3.50 on a 5.0 scale."
    },
    "demographics": {
      "requirements": [],
      "preferences": []
    }
  },
  "deadline": {
    "kind": "fixed",
    "form": "date_only",
    "stated_timezone": null,
    "resolved_timezone": "Africa/Lagos",
    "display_date": "2026-01-15",
    "local_time": "23:59:59",
    "boundary": "inclusive_end_of_local_day",
    "fixed_at": "2026-01-15T22:59:59Z",
    "raw_text": "Closes 15 January 2026."
  },
  "award": {
    "kind": "cash",
    "summary": "200000 NGN for one academic year.",
    "currency": "NGN",
    "amount_minor": 20000000,
    "period": "per_year"
  },
  "location": {
    "country": "NG",
    "locality": null,
    "arrangement": "on_site"
  },
  "employment": null,
  "documents_required": [
    "CGPA transcript",
    "University ID"
  ],
  "how_to_apply": "Submit the synthetic form on the programme page.",
  "lifecycle": {
    "publication_status": "published",
    "status": "open",
    "closed_reason": null
  },
  "verification": {
    "state": "verified",
    "outcome": "confirmed_open",
    "method": "automated_review",
    "reviewed_by": "automation",
    "reviewer_id": null,
    "source_checked_url": "https://apply.rivertrust.example/bridge-2026-open",
    "evidence": "Official provider page checked for open status, deadline, eligibility, and the application link. This is not an HTTP status alone.",
    "last_attempt_at": "2026-11-08T09:00:00Z",
    "last_attempt_outcome": "confirmed_open",
    "last_success_at": "2026-11-08T09:00:00Z",
    "fresh_until": "2026-11-15T09:00:00Z"
  },
  "timestamps": {
    "created_at": "2026-10-01T08:00:00Z",
    "updated_at": "2026-11-08T09:00:00Z",
    "published_at": "2026-10-01T08:00:00Z",
    "expired_at": null,
    "closed_at": null,
    "withdrawn_at": null
  },
  "dedupe_key": "16628e74dcf38ae0cda6ad4165bfe68e4b9dfa26983cb0781b93485ef6aa49bb",
  "content_hash": "410fe92ecc5237623ac290f2ba4dbb1bf895fc8c13fbc1d1532ae1f13cd5e0ab",
  "identity": {
    "provider_key": "river-trust",
    "opportunity_key": "bridge-award-open-counterexample",
    "round_key": "2026",
    "round_evidence": "Synthetic counterexample of a 2026 round left open after the deadline."
  },
  "previous_round_id": null
}
```

## 22. Uncertainties

These were not resolved by inventing a value.

1. Live Supabase contents for either product were not queried on 8 November 2026. Row counts, the real column types of the hosted `scholarships` and `jobs` tables, and whether the four SQL seed rows are loaded are unknown. The "72 vectors of 1024 dimensions" note is a 1 November 2026 decision-record observation, not a new measurement.
2. Whether the NaijaOpportunities GitHub Action is actually scheduled off is unknown. This repo's runbook says it has been disabled since 19 August 2026 and cites an inventory that is not here. The workflow YAML at commit `c737b4f` still contains a 6-hour cron.
3. Which public hostname is canonical is unknown. The Naija README names both `naija-opportunities.vercel.app` and `www.naijaopportunities.live`. PathSync's UI links only to the Vercel host.
4. No listings HTTP API was found. Section 19 is not a description of a deployed route. PathSync's ingest route writes the local schema and is not a sync client.
5. How `short_id` and `slug` are populated in NaijaOpportunities is unknown. They are on the TypeScript interfaces and not in the scraper payloads that were inspected. The page builds a slug from the title and `short_id`.
6. Internships are not a stored kind in that scraper at the observed commit. Adding `kind=internship` is proposed.
7. The seed application URLs in `backend/schema.sql` were not opened. They are not evidence of a working application form.
8. Server timezone for `datetime.now()` on the current host is unknown. That is one reason the proposal refuses wall-clock checks.
9. Architecture decision 0002's heading says accepted and its closing lines say proposed. This contract does not resolve that. Embeddings stay out of the listing.
10. The README deployment story (Render) and decision 0001 (Heroku) disagree. Hosting is out of scope.
11. Whether a person currently reviews listings before they reach students is unknown. The agreed rule sends ambiguous evidence to a human and forbids calling a bot review human. That is not a claim that a human reviews every listing today.
12. Freshness, education matching, demographic hard requirements, and round identity were agreed on 9 November 2026 (WAT). The 90-day human window and the 730-day URL block are not rules. West Africa Time remains the default only when a date has no stated zone. Sample instants were measured with tzdata 2026e.
13. No count was made of live listings that lack a citizenship value. Coverage is unknown.
14. How `demographics.preferences` change sort order is not defined. It is not an agreed ranking rule.

## 23. Out of scope and non-goals

This file does not implement a product validator, a scraper, a migration, or a sync client. `docs/listings/compute_listing_hashes.py` only recomputes the documented digests for the synthetic fixtures. This revision does not start the planner card. It does not change NaijaOpportunities, `main`, account settings, or billing. It does not authorise deployment. It does not submit applications. It does not decide embeddings, hosting, or edit the onboarding screen. Personal student data is not copied into the samples.

## 24. Approval record

| Field | Value |
| --- | --- |
| Policies 1 to 4, jobs, nationality, and time zone | Approved by Goodness in `34969abca843462beb7b96ca1a7f3b4ffc723485` on 9 November 2026 (WAT) |
| This correction | Awaiting final approval of the corrected pin. Publishing this commit does not approve it. |
| Owner | Goodness |
| Approved corrected pin | — |
| What the correction changes | Application URL is not immutable. Section 12 separates acceptance from normalisation. CGPA compares one stated scale only. No new policy. |

No planner card may start while the approved corrected pin is blank. The first card after that SHA is written here is the NaijaOpportunities listings validator described at the top. Its done test is the table in section 18. That card is not started. The policy commit `34969ab` is not a substitute pin for this corrected text.

## 25. Completeness checklist

The lead considers this document complete for approval review only when each line is true of this file:

- Purpose, scope, and producer/consumer duties are stated.
- Current README and code facts are separated from proposed rules and from uncertainties.
- Field tables give name, type, required, nullability, and constraints.
- Stable `listing_id` is defined and is not a URL or a title slug.
- Scholarship, internship, and job are specified, and the PathSync filter is separate from producer validity.
- Jobs stay in student matching. Unknown listing citizenship does not withhold a student. Only an explicit list that misses the student's nationality does.
- Source and application URLs, provenance, verification, and freshness are specified.
- Publication, closed, expired, and withdrawn states are specified.
- Deduplication uses kind, provider, opportunity, and round. The application URL does not block a new round. Updates are revisioned. Tombstones are retained for 730 days without reserving the URL.
- Timestamps are UTC to the second. A date-only deadline ends at 23:59:59 in the stated zone, or in Africa/Lagos when no zone is stated. `evaluation_time` is an argument.
- Rolling and unknown deadlines have no fabricated dates.
- Version `1.0.0` and major/minor/patch rules are specified.
- Sync and pagination are proposed and labelled as not an existing endpoint.
- Privacy limits and a non-model sanitiser are specified.
- Five synthetic valid listings and three invalid listings are embedded, including missing `title`, string `revision`, and expired `deadline.fixed_at`.
- Active-feed expiry rejection is distinguished from retained expired history.
- The approved policy commit is `34969abca843462beb7b96ca1a7f3b4ffc723485`. The corrected pin stays blank until Goodness approves it.
- Uncertainties are listed instead of invented APIs or live database facts.
