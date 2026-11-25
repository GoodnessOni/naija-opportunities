/**
 * Small fixed-window limiter for sign-in, sign-up and form routes. It runs per server instance, so it slows
 * repeated guessing from one address rather than enforcing a global quota. Supabase Auth applies its own limits too.
 */
type Window = { start: number; count: number };
const windows = new Map<string, Window>();

export function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { start: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

export function clientAddress(request: Request) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export function limitRequest(request: Request, bucket: string, limit = 10, windowMs = 10 * 60_000) {
  if (!rateLimited(`${bucket}:${clientAddress(request)}`, limit, windowMs)) return null;
  return Response.json({ error: "too_many_requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } });
}

export function resetRateLimits() {
  windows.clear();
}
