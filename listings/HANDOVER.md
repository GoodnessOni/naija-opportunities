# ogverse.listings 1.0.0 validator handover

Producer validator for `GoodnessOni/naija-opportunities` only. No merge, deploy, or upstream edit. This file is evidence for OGverse Lead review. It is not lead approval.

## Pin

`listings/contract.lock.json`

| Field | Value |
| --- | --- |
| consumer_repository | `GoodnessOni/pathsync-ai` |
| contract_path | `docs/data-contract.md` |
| git_sha | `b50440dc738d86ff3070386d8709b8faf2bc5982` |
| schema_version | `1.0.0` |

Byte copies, upstream layout, and blob SHAs are in `listings/reference/pathsync-ai/MANIFEST.json`. Tests compare those bytes to `git hash-object` and do not fetch the pin. Section 21 samples `invalid-missing-title`, `invalid-revision-type`, and `invalid-expired-open` are extracted under `listings/tests/fixtures/` and compared back to the vendored contract.

Section 24 of that pinned file still shows **Approved corrected pin** blank and says no card starts while it is blank. The contract also says it does not name its own SHA. This lock uses the SHA the card said the user approved. The upstream file was not edited.

## What was checked by hand

All five `docs/listings/fixtures` records and the three section 21 negative objects were read field by field against sections 9–16: kind, deadline, lifecycle, verification, identity, award, employment, and the stored digests. The five stored digests match a fresh run of the vendored `compute_listing_hashes.py` (Python 3.12.3, tzdata 2026e).

## Functions

`listings/validator.py`

- `validate_record(listing)` — stages 1 and 2
- `validate_active_feed(listing, evaluation_time)` — stage 3 active
- `validate_historical(listing, evaluation_time)` — stage 3 historical

Errors use `code + ": " + field`. Stage 3 adds `evaluation_time` after the argument parses. An invalid evaluation time is `invalid_constraint` on `$evaluation_time` and stops. Results are sorted by raw UTF-8 `(field, code)`. The listing is not rewritten. There is no clock, network, or randomness.

## Card results at `2026-11-08T12:00:00Z`

| Fixture | record | active | historical |
| --- | --- | --- | --- |
| valid-scholarship, valid-internship, valid-job | pass | pass | pass |
| valid-historical-expired, valid-tombstone | pass | `not_on_active_feed` on `lifecycle.status` | pass |
| invalid-missing-title | only `missing_required_field` / `title` | same | same |
| invalid-revision-type | only `invalid_type` / `revision`, expected `integer`, actual `string` | same | same |
| invalid-expired-open | pass | `expired_deadline` / `deadline.fixed_at` | same |

Stage 1 stops before either digest. The zero `content_hash` on the two type/presence samples is not reported.

## Measured digests

| Fixture | dedupe_key | content_hash |
| --- | --- | --- |
| valid-scholarship | `f18f8da3972c4d1932d54f31f674ec259d4b939fb38b184876341d978895e96f` | `64b7f2a8104bb0600312e75af20769ea4d78e47250f8c19396e9fce585680653` |
| valid-internship | `695c935abed9b17a0774037c5c74101395f73462836a7116d69040237f73a58c` | `3fbfadf0f3208ac0591f3c91b4e9103705d9e4e25041870a8f139432ea8065a1` |
| valid-job | `2803f370604f5557da4817c2197a5035d9ee966a99f5bfbfb7ef6e52bee73c41` | `7b0feda2e51ec39b8a18ff91b0e9f2081114b9896bead2309c02dbdf0748b537` |
| valid-historical-expired | `65941874416207509e0b39022e94b84e6ac4b780cf92d6c45d356db44934eda4` | `1a9c667969f8fc7a83776750d01cab23243c7dc8994435a9e6174285bc225044` |
| valid-tombstone | `7eb7658492e0e678f476dcc16e5830feb49afc1e13ee480b6d218f07f2d4d6a3` | `6a664c2050a125fbee1e56590467fd3d48d48c9963ed3f121c60a35ca57ab9ab` |

## Runtime

- Python 3.12.3
- tzdata `version 2026e` (`/usr/share/zoneinfo/tzdata.zi`)
- Same pair printed by the pinned `hash-output.txt`

## Test command

From the repository root:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest listings.tests.test_listings_validator -v
```

Observed on this implementation run: `Ran 17 tests` / `OK`. The suite also runs the vendored hash script from a temporary copy and compares stdout to `docs/listings/hash-output.txt`.

## Section-to-test matrix

| Section | Test |
| --- | --- |
| 6 schema | `test_schema_version_listing_id_and_revision_bounds` |
| 7 clocks | `test_evaluation_time_and_timestamp_future_boundary` |
| 8 shape, types, duplicate keys | `test_stage1_shape_stops_before_hashes` |
| 9 fields and card samples | `test_valid_modes_and_negative_samples` |
| 9.5 and 11 eligibility metadata, no matcher | `test_eligibility_metadata_is_not_matching` |
| 9.6 award, 9.8 employment, tombstone pairs | `test_award_employment_and_lifecycle_pairs` |
| 9.9 and +24h updated time | `test_evaluation_time_and_timestamp_future_boundary` |
| 10 deadlines, four zone oracles, fold=0, gap | `test_timezone_oracles_fold_gap_and_deadline_equality` |
| 12.1 URL acceptance on source, application, provider, verification URL | `test_url_acceptance_oracles_do_not_rewrite` |
| 12.2 normalisation is not validation | `test_normalise_url_is_not_part_of_validation` |
| 13 freshness, failed attempt, no 90-day human window, never verified | `test_freshness_failed_attempt_human_and_never_verified` |
| 14 active versus historical, short-circuit, status/deadline mismatch | `test_historical_mismatch_and_short_circuit` |
| 15 identity: URL mutable, new round, no store | `test_identity_url_is_not_dedupe` |
| 16 NFC, null versus absent, array order, both mismatches | `test_measured_digests_nfc_null_order_and_mismatch` |
| 17 personal data and placeholders | `test_personal_data_placeholder_and_string_hygiene` |
| 18 repeatability, no mutation, offline | `test_repeatable_immutable_and_offline` |
| 20 pin | `test_pin_manifest_and_offline_reference_script` |
| 19 sync | not this card |

## Boundaries the tests lock

- Fixed deadline equality stays open; the next second is `expired_deadline` on active and historical.
- `fresh_until` equality stays active; the next second is `stale_listing` on active only.
- `updated_at` exactly 24 hours after evaluation time is allowed; one second later is `timestamp_in_future`.
- Non-open lifecycle emits `not_on_active_feed` and does not also emit expiry or staleness.
- Expired status at or before `fixed_at` is `status_deadline_mismatch` on historical.
- Rolling and unknown never emit `expired_deadline`.
- A later `failed` attempt does not move `fresh_until`. A human success uses the same 168 hours.
- Never verified is `not_verified` on active and is retainable historically.
- Pinned URL accept/reject reasons match `accept_url` in the vendored script. Public code is only `non_canonical_url`. The stored string is not rewritten.
- `normalise_url` stays in the reference script. The validator does not define it.
- Application URL change keeps `dedupe_key`. A new `round_key` changes it even when the URL stays. No second record is stored, so there is no URL reservation error.
- Africa/Lagos date-only `2027-03-31` → `2027-03-31T22:59:59Z`.
- Europe/London date-only `2026-10-31` → `2026-10-31T23:59:59Z`.
- No-zone date-only `2026-01-15` → `2026-01-15T22:59:59Z`.
- Europe/Paris `2027-06-01` `15:00:00` → `2027-06-01T13:00:00Z`.
- Europe/Paris `2026-10-25` `02:30:00` uses fold 0 → `2026-10-25T00:30:00Z`. The fold-1 instant is rejected.
- Europe/Paris `2027-03-28` `02:30:00` is `invalid_constraint` on `deadline.local_time` and is not shifted.

## Out of scope, left unchanged

No student match, onboarding, UI, scraper, migration, storage, revision store, retention clock, sync API, or URL-normalisation feature. `app/`, `scraper/`, and `.github/` are untouched. `main` was not updated.

## Limitations for review

- One listing at a time. `duplicate_listing` and `revision_conflict` need a stored revision and are not emitted.
- The 730-day tombstone window is not enforced.
- `schema_version` other than `1.0.0` is `invalid_constraint` on `schema_version`. `unsupported_schema_version` is the reader/sync code from section 19.
- `confirmed_open` `source_checked_url` must equal `provider.url` or `application.url` when `url_kind` is `direct_application` or `official_programme_page`.
- Evidence must be 1..2000 characters. The whole string is rejected when it is only an HTTP status line. An explicit `HTTP`, `HTTP/1.1`, `HTTP/2`, or `Status` / `Status:` line is status-only for any reason phrase, including `HTTP/1.1 200 Fine`, `HTTP/1.1 200Fine`, `HTTP/2 504 gateway time out`, `Status: 200 students were admitted`, and `Status:200 Fine`. Letter case, repeated spaces, a missing space after `Status:` or between the code and the reason, and a trailing `.`, `!`, or `?` do not change that. Without that prefix, only a bare `1xx`–`5xx` code or one of 69 known reason phrases is status-only: 62 phrases from Python 3.12 `http.HTTPStatus` and 7 earlier RFC spellings. `200 level students only`, `200 students were admitted`, and `200 OK. The form was open.` stay accepted. A second sentence after `.`, `!`, or `?`, such as `HTTP/1.1 200 Fine. The form was open.`, is not status-only. `418 I'm a Teapot` is the standard-library phrase from RFC 2324; RFC 9110 marks 418 unused, and this check does not call it a current IANA assignment. This does not decide whether other text truly names the page that was read.
- A successful verification requires the attempt bundle (`method`, `reviewed_by`, `source_checked_url`, `evidence`, `last_attempt_at`, `last_attempt_outcome`). `reviewer_id` stays null for automation and is required only when `reviewed_by` is `human`. A never-verified row with no attempt stays valid as a record and on the historical feed.
- Unknown education uses `Not stated by the source.` off a tombstone. On a tombstone the same requirement uses `[withdrawn]`, with the education arrays empty.
- Country codes are the 249 assigned ISO 3166-1 alpha-2 codes embedded from iso-codes on this machine, plus `ZZ`. Citizenship lists do not accept `ZZ`.
- `contact_email` is syntax only. A role mailbox cannot be distinguished from a personal one.
- Audience tags and education wording are checked as metadata. Nothing infers a student match or converts CGPA across scales.
- IANA conversion uses the machine tzdata. The pinned samples were measured with 2026e, which is what this run used.

## Correction after lead review

Commit `3f07678310b1d2a4b1106f6afc6dbe156d8cc183` was not accepted. Three measured defects were fixed on `rebuild/listings-validator`. The pin, vendored contract, fixtures, hash script, `hash-output.txt`, manifest, and lock were not edited. No pull request and no merge.

New tests were run on that commit before the validator change:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  listings.tests.test_listings_validator.ListingsValidatorTest.test_confirmed_open_requires_the_attempt_bundle \
  listings.tests.test_listings_validator.ListingsValidatorTest.test_unknown_education_tombstone_uses_withdrawn_wording \
  listings.tests.test_listings_validator.ListingsValidatorTest.test_http_status_line_is_not_evidence -v
```

Result: `Ran 3 tests` / `FAILED (failures=3)`.

- All-null attempt fields on a verified `confirmed_open` scholarship, hash `511e03282b9437093e3f7e31ddfcb2380102a28d5d2fd0531052476fa1210e4c`, returned `[]` for record, active, and historical.
- Unknown-education tombstone with `[withdrawn]` wording returned `invalid_constraint` on `eligibility.education.source_wording`.
- Evidence `200 OK` returned `[]`.

After the validator change the same three tests return `OK`, and the full suite is `Ran 20 tests` / `OK` on Python 3.12.3 and tzdata `version 2026e`. A temp-copy run of `compute_listing_hashes.py` still matches the vendored `hash-output.txt` (`python: 3.12.3`, `tzdata: version 2026e`). This correction is for lead recheck. It is not approval.

The first status check used a word-count pattern. Recheck measured four failures on `valid-scholarship` with only `verification.evidence` changed and the hash recomputed: `200 OK.` and `HTTP/1.1 200 OK.` were accepted, and `200 level students only` and `200 students were admitted` were rejected. Those four are now in `test_http_status_line_is_not_evidence`, together with the earlier status controls and `404 Not Found`. Before this phrase change that test failed on `200 OK.`. After it, the same test is `OK`, the full suite is again `Ran 20 tests` / `OK`, and the temp-copy hash script still matches the vendored output. No pull request and no merge.

A later recheck still accepted two status lines: `504 Gateway Time-out` (including a trailing period and an `HTTP/1.1` prefix) and Python 3.12 `HTTPStatus` `418 I'm a Teapot` (including case, punctuation, `HTTP/1.1`, and `Status:`). `test_every_known_http_status_line_is_rejected` was added first. On the previous commit it checked 731 lines and missed those 14 forms. Reason phrases now come from `http.HTTPStatus` (62) plus 7 earlier RFC aliases, 69 in total. The same test is `OK` (`HTTP_STATUS_LINES_CHECKED 731`). The full suite is `Ran 21 tests` / `OK` on Python 3.12.3 and tzdata `version 2026e`. The temp-copy hash script still matches the vendored output. No pull request and no merge.

The phrase list still accepted a standalone line whose reason was not one of those 69: `HTTP/1.1 200 Fine`, `HTTP/1.1 200 Fine.`, `HTTP/2 504 gateway time out`, and `Status: 200 students were admitted`. An explicit `HTTP` or `Status` line is the status line itself, so the reason text does not have to be in the list. `test_explicit_status_line_rejects_custom_reason` failed on those lines first, then passed. `200 level students only`, `200 students were admitted`, and `200 OK. The form was open.` stay accepted, as does `HTTP/1.1 200 Fine. The form was open.` because a sentence follows the status line. The 731-line matrix stays green. The full suite is `Ran 22 tests` / `OK`. The temp-copy hash script still matches. No pull request and no merge.

A missing space in that same explicit line was still accepted: `Status:200 Fine` and `HTTP/1.1 200Fine`, on all five fixtures, while `Status: 200 Fine` and `HTTP/1.1 200 Fine` were already rejected. `test_explicit_status_line_missing_space` failed on the unspaced forms first (75 mode results: 5 fixtures, 5 unspaced lines, record, active, and historical). The explicit-line syntax now allows the space after `Status:` and between the code and the reason to be absent. Spaced twins still reject. `200 level students only`, `200 students were admitted`, `200 OK. The form was open.`, and `HTTP/1.1 200Fine. The form was open.` stay accepted. The 731-line matrix stays green. The full suite is `Ran 23 tests` / `OK`. The temp-copy hash script still matches. No pull request and no merge.


## Verification attempt gate

This card adds one offline function that decides whether a proposed verification attempt may establish or renew success. It is evidence for review. It is not lead approval, not a release, and not a production-complete claim. No merge, no pull request, and no deploy.

The branch head at the start was `36bfd66f3875ca0796b000b0339cdc06ad9a71da`, the same commit as the reviewed base. No earlier commit on this branch was rewritten. The pin in `listings/contract.lock.json` stays `b50440dc738d86ff3070386d8709b8faf2bc5982`. PathSync commit `d8b57290eb08fe96fd4140a234436cb1556f77a1` is decision context for that external approval. It is not a contract amendment, and this card does not edit that repository.

`decide_attempt(candidate, assessment)` in `listings/verification_gate.py` is the function. `assessment` is a `SourceAssessment` from the producer caller. It is not a listing field and not a user attestation. The result is an `AttemptDecision`. `permitted` is true only for a clear or human-resolved assessment when this attempt is a successful confirmation under the pinned vocabulary and `validate_record` returns no errors. The permitted candidate is the same object. Every other result has `candidate` None. The function does not mutate the listing and does not move `fresh_until`.

There is no source inspection, no caller authentication, no reviewer authorisation, no queue, and no publication integration. Active eligibility stays `validate_active_feed` at an explicit evaluation time. Permission for an attempt to succeed is not active-feed permission and not publication permission.

### Decision matrix

Sections 5, 13, 14, and 18. The fixed evaluation instant in the new tests is `2026-11-08T12:00:00Z`. The gate does not take that instant and does not read a clock.

| Order | Condition | Disposition | Reason | Contract tie |
| --- | --- | --- | --- | --- |
| 1 | Candidate is not a JSON object. A JSON string is included, even when `validate_record` would accept it. | `input_error` | `candidate_type` | Section 18 input shape. Fail closed. Not stored. |
| 1 | Assessment is absent (`None`). | `input_error` | `assessment_missing` | Section 5. Clear is not inferred. |
| 1 | Assessment is not a `SourceAssessment`. A dict or the string `clear` does not qualify. | `input_error` | `assessment_type` | Caller value is typed. Not a listing field. |
| 1 | `category` is not a string. | `input_error` | `category_type` | Wrong type fails closed. |
| 1 | `category` is not one of the eight names below. `human`, `verified`, `permit`, and `CLEAR` are unknown. | `input_error` | `category_unknown` | Unknown context is not clear and not human-resolved. |
| 2 | `ambiguous`, `inaccessible`, `changed`, `conflicting`, or `unresolved`. | `review` | that category | Section 5. These are human review. A valid record that claims `verified` or `human_review` still does not succeed. `validate_record` is not consulted. |
| 2 | `failed`. | `reject` | `failed` | Sections 5 and 13. A failed attempt does not establish or renew success. Old `last_success_at` and `fresh_until` stay put and are not returned. |
| 3 | `clear` without `method` `automated_review`, `reviewed_by` `automation`, `reviewer_id` null, and string attempt-bundle fields. | `reject` | `metadata` | Section 13 automation pair. Section 5: no mandatory human review only when that automation metadata is present. |
| 3 | `human_resolved` without `method` `human_review`, `reviewed_by` `human`, an opaque slug of length 1..64, and the same bundle strings. | `reject` | `metadata` | Sections 5 and 13. Missing or wrong human metadata blocks. A slug is not an allow-list. |
| 4 | Bundle is present, but this latest attempt is not a successful confirmation. That includes unverified, `failed`, `inconclusive`, a success time that is not this attempt, and a `fresh_until` that is not a UTC timestamp. | `reject` | `attempt_not_successful` | Section 13. An older success kept on the record does not renew. The exact 168-hour gap is the next row. |
| 5 | The attempt looks successful, and `validate_record` returns any stage 1 or stage 2 error. | `reject` | `record_invalid` | Section 18. `record_errors` are those contract errors, copied. The decision reason is not a contract code. A 90-day human window fails here. `fresh_until` is not corrected. |
| 6 | `clear` passes rows 3 to 5. | `permit` | `clear` | Section 5 routine automation. The same 168 hours as a human success. |
| 6 | `human_resolved` passes rows 3 to 5. | `permit` | `human_resolved` | Section 5 human review after a genuine resolution supplied by the caller. Same 168 hours. No 90-day window. |

`200 Fine`, `404 Nope`, and `HTTP/1.1 200 Fine. The form was open.` are not classified by this function. With a caller assessment of `ambiguous` they are review. With `clear` or `human_resolved` and a record `validate_record` accepts, the attempt can be permitted. `HTTP/1.1 200 Fine` is `record_invalid` because the existing validator rejects that status line. This card adds no phrase list and no `Read:` marker.

### Active feed is separate (sections 13 and 14)

`decide_attempt` does not call `validate_active_feed` or `validate_historical`. A closed, expired, or stale row that passes `validate_record` is not labelled invalid verification because it is off the active feed.

| Record | Evaluation time | Attempt | Active feed |
| --- | --- | --- | --- |
| `valid-scholarship`, clear automation, `fresh_until` `2026-11-15T09:00:00Z` | `2026-11-15T09:00:00Z` | permit `clear` | no errors. Equality with the 168-hour instant stays active. |
| same | `2026-11-15T09:00:01Z` | permit `clear` | `stale_listing` on `verification.fresh_until` only. `lifecycle.status` stays `open`. Historical mode has no errors. |
| same timestamps, human metadata, `human_resolved` | equality and the next second | permit `human_resolved` | same active results as automation. |
| human metadata with `fresh_until` 90 days after `last_success_at` | not used | `record_invalid` on `verification.fresh_until` | not the decision. |
| scholarship whose success is `2027-03-24T22:59:59Z` and whose `fresh_until` equals `fixed_at` `2027-03-31T22:59:59Z` | `2027-03-31T22:59:59Z` | permit `clear` | no errors. Deadline equality stays open. |
| same | `2027-03-31T23:00:00Z` | permit `clear` | `expired_deadline` and `stale_listing`. Historical mode is `expired_deadline` only. |
| `invalid-expired-open` | `2026-11-08T12:00:00Z` | permit `clear` | `expired_deadline` on `deadline.fixed_at`. Record validation passed. |
| `valid-historical-expired` clear, `valid-tombstone` human-resolved, and a `provider_closed` / `confirmed_closed` scholarship | `2026-11-08T12:00:00Z` | permit on the matching path | `not_on_active_feed` on `lifecycle.status` only. |
| `valid-internship` and `valid-job` | `2028-01-01T00:00:00Z` | permit `clear` | `stale_listing` only. No `expired_deadline`. |
| draft with no attempt | `2026-11-08T12:00:00Z` | `metadata` | `not_on_active_feed`. That code is not the gate reason. |
| open scholarship, any permitted attempt | `not-a-timestamp` | unchanged permit | `invalid_constraint` on `$evaluation_time`. |

An old success with a later `failed` or `inconclusive` attempt still passes `validate_record` and can still be inside the old freshness window on the active feed. `decide_attempt` does not permit it for `clear`, `failed`, or `ambiguous`, and it does not move `last_success_at` or `fresh_until`. A new confirmation whose own `last_success_at` equals `last_attempt_at`, with `fresh_until` exactly 168 hours later, can be permitted without a stored previous record. The function has no previous-record argument.

### Runtime

- Python 3.12.3
- tzdata `version 2026e` (`/usr/share/zoneinfo/tzdata.zi`)
- Same pair printed by the pinned `hash-output.txt`

### Commands and results

From the repository root, before any file in this card existed, at `36bfd66f3875ca0796b000b0339cdc06ad9a71da`:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest listings.tests.test_listings_validator -v
```

`Ran 23 tests in 0.568s` / `OK`. Printed markers: `HTTP_REASON_COVERAGE stdlib=62 historical_aliases=7 total=69`, `HTTP_STATUS_LINES_CHECKED 731`, and the five `MEASURED_DIGESTS` lines already recorded above. The new gate suite was not present, so it was not run.

Pinned reference output, from a temporary copy of `listings/reference/pathsync-ai/docs`, command `python3 docs/listings/compute_listing_hashes.py`: exit code 0, empty stderr, stdout equal to `listings/reference/pathsync-ai/docs/listings/hash-output.txt`, including `python: 3.12.3`, `tzdata: version 2026e`, and `result: ok`.

After `listings/verification_gate.py` and `listings/tests/test_verification_gate.py` were added, the same validator command returned `Ran 23 tests in 0.559s` / `OK`, with the same `HTTP_STATUS_LINES_CHECKED 731` and the same five measured digests. The validator file and its test file were not edited.

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest listings.tests.test_verification_gate -v
```

`Ran 11 tests in 0.053s` / `OK`. Every test passed:

- `test_absent_or_invalid_context_fails_closed`
- `test_clear_automation_success`
- `test_every_decision_branch`
- `test_freshness_deadline_and_lifecycle_stay_separate`
- `test_human_resolved_metadata`
- `test_old_success_cannot_promote`
- `test_phrase_examples_follow_the_caller_assessment`
- `test_record_claims_do_not_bypass`
- `test_record_invalid_uses_full_validate_record`
- `test_repeatable_immutable_and_offline`
- `test_unresolved_categories_block`

Printed marker: `GATE_DECISIONS ambiguous assessment_missing assessment_type attempt_not_successful candidate_type category_type category_unknown changed clear conflicting failed human_resolved inaccessible metadata record_invalid unresolved`.

The same temporary-copy reference command after the change: exit code 0, empty stderr, stdout still equal to the vendored `hash-output.txt`, `python: 3.12.3`, `tzdata: version 2026e`, `result: ok`.

### Unchanged pin, lock, and reference

`listings/contract.lock.json` `git_sha` is still `b50440dc738d86ff3070386d8709b8faf2bc5982`. `git hash-object listings/contract.lock.json` is `6436035af5b4e1707b47a6d16b7acf6ff589b5d6`. `listings/validator.py` is `d2ea96543c40c2966e11b740e735d06a2203b71d`. `listings/tests/test_listings_validator.py` is `496eb0572d91491c2c5680f623e453825a7764b0`. Those three hashes are the blobs at the reviewed base. The vendored contract, fixtures, hash script, `hash-output.txt`, manifest, and lock were not edited.

### Changed paths

- `listings/verification_gate.py` (new)
- `listings/tests/test_verification_gate.py` (new)
- `listings/HANDOVER.md` (this appendix only)

### Limitations

- Caller trust is not implemented. A SourceAssessment is a typed value supplied by the producer caller. This function does not authenticate that caller.
- Source inspection is not implemented. This function does not fetch a URL, open a page, or decide whether evidence text is clear.
- Reviewer authorisation is not implemented. reviewer_id is checked as an opaque slug. It is not an allow-list and it does not prove a person acted.
- No queue, storage, previous-record policy, revocation, or publication integration. Permission for this attempt to succeed is not active-feed or publication permission. Active eligibility is validate_active_feed at an explicit evaluation time.

No source-inspection, auth, queue, or publication integration is included. This appendix does not say the validator or this gate is approved, released, or production-complete.
