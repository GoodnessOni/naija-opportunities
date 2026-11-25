import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieDomain } from "./lib/supabase/cookie-domain";

/** Refreshes the shared Supabase session cookie on pages that read the visitor's own activity. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const domain = authCookieDomain(request.headers.get("host"));
  const supabase = createServerClient(url, key, {
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, ...(domain && { domain }) }));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/opportunities/:path+", "/account/:path*"] };
