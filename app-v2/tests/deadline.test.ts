import { describe, expect, it } from "vitest";
import { resolveDateOnlyDeadline } from "../lib/listings/deadline";

describe("date-only deadlines", () => {
  it("ends at the last second of the day in Lagos when no zone is stated", () => {
    expect(resolveDateOnlyDeadline("2027-03-31", null)).toEqual({
      kind: "fixed",
      fixed_at: "2027-03-31T22:59:59Z",
      stated_timezone: null,
      resolved_timezone: "Africa/Lagos",
      boundary: "inclusive_end_of_local_day",
    });
  });

  it("honours a named source timezone with daylight saving", () => {
    expect(resolveDateOnlyDeadline("2027-07-01", "America/New_York").fixed_at)
      .toBe("2027-07-02T03:59:59Z");
  });

  it("rejects calendar dates that roll over into the next month", () => {
    expect(() => resolveDateOnlyDeadline("2027-02-29", null)).toThrow(RangeError);
  });
});
