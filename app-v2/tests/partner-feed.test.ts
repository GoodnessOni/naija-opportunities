import { describe, expect, it } from "vitest";
import { encodeCursor, parseFeedQuery } from "../lib/listings/partner-feed";

describe("partner feed pagination", () => {
  const id = "lst_00000000000000000000000001";
  const time = "2020-01-01T00:00:00Z";

  it("carries the evaluation time and last id into the next page", () => {
    const parameters = new URLSearchParams({ cursor: encodeCursor(id, time), page_size: "3" });
    expect(parseFeedQuery(parameters)).toEqual({ afterId: id, evaluatedAt: time, limit: 3 });
  });

  it("rejects attempts to change the evaluation time between pages", () => {
    const parameters = new URLSearchParams({ cursor: encodeCursor(id, time), evaluation_time: "2021-01-01T00:00:00Z" });
    expect(() => parseFeedQuery(parameters)).toThrow();
  });
});
