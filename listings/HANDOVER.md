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
- Evidence must be 1..2000 characters. A string that is only an HTTP status line is rejected: a bare code, `HTTP` or `Status` plus a code, or that line plus a short alphabetic reason such as `OK`. A sentence that mentions a status is still accepted. This pattern does not decide whether the sentence truly names the page that was read.
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
