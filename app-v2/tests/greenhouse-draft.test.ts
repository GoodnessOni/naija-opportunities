import { verifyGreenhouseListing } from "../lib/listings/greenhouse-verification";
import { expect, it } from "vitest";
import { makeGreenhouseDraft } from "../lib/listings/submission";

it("maps discovered jobs to unverified drafts with distinct listing identities", () => {
  const clock = new Date("2026-11-24T12:00:00Z");
  const candidate = {
    source_key: "greenhouse:example:123",
    title: "Software Engineer",
    source_url: "https://job-boards.greenhouse.io/example/jobs/123",
    location: "Lagos",
  };
  const draft = makeGreenhouseDraft("Example", candidate, clock);
  expect(draft.lifecycle.publication_status).toBe("draft");
  expect(draft.verification.state).toBe("unverified");
  expect(draft.location.country).toBe("ZZ");
  expect(draft.summary).toContain("Lagos");
  expect(makeGreenhouseDraft("Example", { ...candidate, title: "Updated title" }, clock).dedupe_key).toBe(draft.dedupe_key);
  expect(makeGreenhouseDraft("Example", { ...candidate, source_key: "greenhouse:example:124" }, clock).dedupe_key)
    .not.toBe(draft.dedupe_key);
});

it("publishes only a job whose hosted page matches the board and posting ID", () => {
  const clock = new Date("2026-11-24T12:00:00Z");
  const candidate = {
    source_key: "greenhouse:example:123",
    title: "Software Engineer",
    source_url: "https://job-boards.greenhouse.io/example/jobs/123",
    location: "Lagos",
  };
  const draft = makeGreenhouseDraft("Example", candidate, clock);
  const verified = verifyGreenhouseListing(draft, "example", 123, clock);
  expect(verified.lifecycle.publication_status).toBe("published");
  expect(verified.verification.method).toBe("automated_review");
  expect(verified.deadline.kind).toBe("unknown");
  const euDraft = makeGreenhouseDraft("Example", { ...candidate, source_url: "https://job-boards.eu.greenhouse.io/example/jobs/123" }, clock);
  expect(verifyGreenhouseListing(euDraft, "example", 123, clock).lifecycle.publication_status).toBe("published");
  expect(verifyGreenhouseListing(draft, "different", 123, clock)).toBe(draft);
  expect(verifyGreenhouseListing(draft, "example", 124, clock)).toBe(draft);
});
