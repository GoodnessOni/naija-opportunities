import { beforeEach, describe, expect, it } from "vitest";
import { limitRequest, rateLimited, resetRateLimits } from "../lib/rate-limit";
import { securityHeaders } from "../next.config";

describe("rate limiting", () => {
  beforeEach(resetRateLimits);
  it("allows up to the limit in a window, then blocks, then resets", () => {
    for (let i = 0; i < 3; i++) expect(rateLimited("k", 3, 1000, 0)).toBe(false);
    expect(rateLimited("k", 3, 1000, 10)).toBe(true);
    expect(rateLimited("k", 3, 1000, 1000)).toBe(false);
  });
  it("keys by client address and returns 429 with Retry-After", () => {
    const from = (ip: string) => new Request("http://x", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
    expect(limitRequest(from("1.1.1.1"), "t", 1)).toBeNull();
    const blocked = limitRequest(from("1.1.1.1"), "t", 1);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBe("600");
    expect(limitRequest(from("2.2.2.2"), "t", 1)).toBeNull();
  });
});

describe("security headers", () => {
  it("blocks framing and sniffing and enforces HTTPS", () => {
    const keys = Object.fromEntries(securityHeaders.map(h => [h.key, h.value]));
    expect(keys["X-Frame-Options"]).toBe("DENY");
    expect(keys["X-Content-Type-Options"]).toBe("nosniff");
    expect(keys["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(keys["Strict-Transport-Security"]).toContain("max-age=");
  });
});
