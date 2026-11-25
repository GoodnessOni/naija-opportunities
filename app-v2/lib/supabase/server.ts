import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { authCookieDomain } from "./cookie-domain";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Supabase client acting as the signed-in visitor (RLS applies). Uses the public key only. */
export async function createUserClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  const domain = authCookieDomain((await headers()).get("host"));
  return createServerClient(url, key, {
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: CookieToSet[]) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, ...(domain && { domain }) }));
        } catch {
          // Server components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
