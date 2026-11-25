/**
 * One sign-in shared with PathSync (pathsync-ai.naijaopportunities.live).
 * Only in production on naijaopportunities.live or a subdomain is the Supabase auth cookie set on the
 * parent domain. Localhost, Vercel preview URLs and any other host keep the browser default.
 */
export const SHARED_COOKIE_DOMAIN = ".naijaopportunities.live";

export function authCookieDomain(
  host: string | null | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string | undefined {
  if (nodeEnv !== "production" || !host) return undefined;
  const hostname = host.split(":")[0].trim().toLowerCase().replace(/\.$/, "");
  if (hostname === "naijaopportunities.live" || hostname.endsWith(".naijaopportunities.live")) return SHARED_COOKIE_DOMAIN;
  return undefined;
}
