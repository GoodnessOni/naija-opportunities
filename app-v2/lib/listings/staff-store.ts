import { z } from "zod";

export class StaffRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

export async function staffRpc(name: string, input: object): Promise<unknown> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StaffRequestError(503, "staff_service_unavailable");
  const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
    method: "POST", cache: "no-store",
    headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new StaffRequestError(503, "staff_service_unavailable");
  return response.json();
}

export async function authenticateUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new StaffRequestError(401, "sign_in_required");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new StaffRequestError(503, "staff_service_unavailable");
  const response = await fetch(new URL("/auth/v1/user", url), {
    headers: { apikey: key, Authorization: authorization }, cache: "no-store",
  });
  if (!response.ok) throw new StaffRequestError(response.status < 500 ? 401 : 503, "staff_sign_in_unavailable");
  return z.object({ id: z.uuid(), email_confirmed_at: z.string().nullish() }).parse(await response.json());
}

export async function authenticateStaff(request: Request) {
  const { id } = await authenticateUser(request);
  const reviewer = await staffRpc("staff_reviewer", { staff_user: id });
  if (typeof reviewer !== "string") throw new StaffRequestError(403, "staff_only");
  return { id, reviewer };
}
