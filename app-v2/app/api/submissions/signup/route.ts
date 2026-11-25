import { z } from "zod";
import { siteUrl } from "../../../../lib/site-url";

const credentials = z.object({ email: z.email().max(254), password: z.string().min(12).max(72) });

export async function POST(request: Request) {
  const input = credentials.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_credentials" }, { status: 400 });
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return Response.json({ error: "signup_unavailable" }, { status: 503 });
  const url = new URL("/auth/v1/signup", SUPABASE_URL);
  url.searchParams.set("redirect_to", new URL("/submit", siteUrl).href);
  const response = await fetch(url, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(input.data),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!response?.ok) return Response.json({ error: "signup_unavailable" }, { status: response?.status === 429 ? 429 : 503 });
  return Response.json({ status: "check_email" }, { status: 202 });
}
