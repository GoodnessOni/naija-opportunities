import { z } from "zod";

const credentials = z.strictObject({ email: z.email(), password: z.string().min(1).max(256) });

export async function POST(request: Request) {
  const input = credentials.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_credentials" }, { status: 400 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: "sign_in_unavailable" }, { status: 503 });
  try {
    const response = await fetch(new URL("/auth/v1/token?grant_type=password", url), {
      method: "POST", cache: "no-store",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    });
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status >= 500 ? 503 : 401;
      return Response.json({ error: "sign_in_failed" }, { status });
    }
    const { access_token } = z.object({ access_token: z.string().min(1) }).parse(await response.json());
    return Response.json({ access_token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "sign_in_unavailable" }, { status: 503 });
  }
}
