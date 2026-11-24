import { afterEach, expect, it, vi } from "vitest";
import { readPublicListings } from "../lib/listings/public-store";
import { authenticateUser, staffRpc } from "../lib/listings/staff-store";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([
  ["legacy.jwt.key", "Bearer legacy.jwt.key"],
  ["sb_publishable_test", null],
])("authenticates public listing requests with %s", async (key, authorization) => {
  vi.stubEnv("SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_ANON_KEY", key);
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));
  vi.stubGlobal("fetch", fetchMock);

  await expect(readPublicListings()).resolves.toEqual([]);
  const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
  expect(headers.get("apikey")).toBe(key);
  expect(headers.get("authorization")).toBe(authorization);
});

it("uses the new secret for server RPCs and preserves the user token for Auth", async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_ANON_KEY", "sb_publishable_test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_test");
  const id = "b42c159b-2ca1-41ed-9731-4cac07e099b2";
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(true))
    .mockResolvedValueOnce(Response.json({ id }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(staffRpc("submit_opportunity", {})).resolves.toBe(true);
  await expect(authenticateUser(new Request("https://example.invalid", {
    headers: { Authorization: "Bearer user-token" },
  }))).resolves.toMatchObject({ id });

  const [rpc, auth] = fetchMock.mock.calls.map(([, options]) => new Headers(options?.headers));
  expect(rpc.get("apikey")).toBe("sb_secret_test");
  expect(rpc.has("authorization")).toBe(false);
  expect(auth.get("apikey")).toBe("sb_publishable_test");
  expect(auth.get("authorization")).toBe("Bearer user-token");
});
