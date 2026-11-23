import { describe, expect, it, vi } from "vitest";
import { fetchGreenhouseCandidates } from "../scripts/sources/greenhouse.mjs";

describe("Greenhouse discovery", () => {
  it("returns unique candidates for review and preserves source location wording", async () => {
    const candidate = { id: 42, title: "Engineer", absolute_url: "https://example.org/jobs/42", location: { name: "Remote, EMEA" } };
    const fetchPage = vi.fn(async () => Response.json({ jobs: [candidate, candidate, { id: 43 }] }));
    const result = await fetchGreenhouseCandidates("example", fetchPage);
    expect(fetchPage).toHaveBeenCalledWith("https://boards-api.greenhouse.io/v1/boards/example/jobs", expect.anything());
    expect(result.skipped).toBe(2);
    expect(result.candidates).toEqual([expect.objectContaining({
      source_key: "greenhouse:example:42", location: "Remote, EMEA", disposition: "needs_review",
    })]);
  });

  it("flags an unexpectedly empty board and rejects a broken response shape", async () => {
    expect((await fetchGreenhouseCandidates("example", async () => Response.json({ jobs: [] }))).needs_source_check).toBe(true);
    await expect(fetchGreenhouseCandidates("example", async () => Response.json({ data: [] })))
      .rejects.toThrow("jobs array");
  });
});
