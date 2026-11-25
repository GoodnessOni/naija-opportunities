import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditLabel, parseAuditQuery } from "../lib/listings/audit";

vi.mock("../lib/listings/staff-store", async (original) => ({
  ...(await original<typeof import("../lib/listings/staff-store")>()),
  authenticateStaff: vi.fn(), staffRpc: vi.fn(),
}));
const store = await import("../lib/listings/staff-store");
const { GET } = await import("../app/api/staff/audit/route");

describe("audit query", () => {
  it("accepts a page size and a before time", () => {
    expect(parseAuditQuery(new URLSearchParams({ limit: "50", before: "2027-01-01T00:00:00Z" })))
      .toEqual({ page_limit: 50, before_at: "2027-01-01T00:00:00Z" });
  });
  it("rejects bad sizes and times", () => {
    expect(parseAuditQuery(new URLSearchParams({ limit: "0" }))).toBeNull();
    expect(parseAuditQuery(new URLSearchParams({ limit: "500" }))).toBeNull();
    expect(parseAuditQuery(new URLSearchParams({ before: "yesterday" }))).toBeNull();
  });
  it("labels actions in plain English", () => {
    expect(auditLabel("withdrawn")).toBe("Withdrawn");
    expect(auditLabel("verified_confirmed_open")).toBe("Verified open");
  });
});

describe("GET /api/staff/audit", () => {
  beforeEach(() => { vi.mocked(store.authenticateStaff).mockReset(); vi.mocked(store.staffRpc).mockReset(); });

  it("is staff only", async () => {
    vi.mocked(store.authenticateStaff).mockRejectedValue(new store.StaffRequestError(403, "staff_only"));
    const response = await GET(new Request("http://x/api/staff/audit"));
    expect(response.status).toBe(403);
    expect(store.staffRpc).not.toHaveBeenCalled();
  });

  it("returns who, when, what and the note", async () => {
    vi.mocked(store.authenticateStaff).mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001", reviewer: "ada" });
    const event = { at: "2027-03-22T09:00:00+00:00", actor: "ada", action: "withdrawn", listing_id: "lst_00000000000000000000000W01", title: "Merit", note: "Provider closed the round" };
    vi.mocked(store.staffRpc).mockResolvedValue([event]);
    const response = await GET(new Request("http://x/api/staff/audit?limit=10"));
    expect(await response.json()).toEqual({ events: [event] });
    expect(store.staffRpc).toHaveBeenCalledWith("staff_audit", { staff_user: "00000000-0000-4000-8000-000000000001", page_limit: 10, before_at: null });
  });
});
