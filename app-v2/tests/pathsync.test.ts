import { describe, expect, it } from "vitest";
import { pathSyncListingUrl } from "../lib/pathsync";

const id = "lst_01JD2Z8Q4X7K9M3N5P6R8S0T1V";

describe("pathSyncListingUrl", () => {
  it("hides the link in production until PATHSYNC_URL is set", () => {
    expect(pathSyncListingUrl(id, undefined, "production")).toBeNull();
    expect(pathSyncListingUrl(id, "https://pathsync-ai.naijaopportunities.live", "production")).toBe(`https://pathsync-ai.naijaopportunities.live/listings/${id}`);
  });
  it("uses localhost in development", () => {
    expect(pathSyncListingUrl(id, "", "development")).toBe(`http://localhost:3000/listings/${id}`);
  });
  it("prefers the env var and trims trailing slashes", () => {
    expect(pathSyncListingUrl(id, "https://preview.example/", "production")).toBe(`https://preview.example/listings/${id}`);
  });
  it("rejects malformed listing ids", () => {
    expect(pathSyncListingUrl("lst_bad", undefined, "production")).toBeNull();
  });
});
