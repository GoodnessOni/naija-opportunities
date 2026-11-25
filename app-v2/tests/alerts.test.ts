import { describe, expect, it } from "vitest";
import { alertSignature, validAlertSignature } from "../lib/alerts";

describe("email alert links", () => {
  const id = "c894f422-60dc-498d-8112-0ca11ffe5248";
  const secret = "test-only-secret";

  it("authenticates an unsubscribe link for its own subscription", () => {
    const signature = alertSignature(secret, "unsubscribe", id);
    expect(validAlertSignature(secret, "unsubscribe", id, signature)).toBe(true);
    expect(validAlertSignature(secret, "confirm", id, signature)).toBe(false);
    expect(validAlertSignature(secret, "unsubscribe", "other", signature)).toBe(false);
    expect(validAlertSignature(secret, "unsubscribe", id, "invalid")).toBe(false);
  });
});
