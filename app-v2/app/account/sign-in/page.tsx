import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimited } from "../../../lib/rate-limit";
import { PATHSYNC_DEV_URL } from "../../../lib/pathsync";
import { createUserClient } from "../../../lib/supabase/server";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

function safeNext(value: unknown) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/opportunities";
}

async function signIn(form: FormData) {
  "use server";
  const next = safeNext(form.get("next"));
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (rateLimited(`account-sign-in:${ip}`, 10, 10 * 60_000)) redirect(`/account/sign-in?error=busy&next=${encodeURIComponent(next)}`);
  const supabase = await createUserClient();
  if (!supabase) redirect(`/account/sign-in?error=unavailable&next=${encodeURIComponent(next)}`);
  const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  if (error) redirect(`/account/sign-in?error=invalid&next=${encodeURIComponent(next)}`);
  redirect(next);
}

async function signOut() {
  "use server";
  const supabase = await createUserClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createUserClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const pathSync = process.env.PATHSYNC_URL?.trim() || (process.env.NODE_ENV === "production" ? null : PATHSYNC_DEV_URL);
  if (user) return <section className="browse"><h1>You are signed in</h1>
    <form action={signOut}><button className="button">Sign out</button></form></section>;
  return (
    <section className="browse">
      <h1>Sign in</h1>
      <p>Use the same account as PathSync. Signing in lets you keep your own Interested and Applied records.</p>
      {error && <p role="alert">{error === "invalid" ? "That email and password did not match." : error === "busy" ? "Too many attempts. Wait ten minutes and try again." : "Sign-in is not available right now."}</p>}
      <form action={signIn} className="stack">
        <input type="hidden" name="next" value={safeNext(next)} />
        <label>Email <input type="email" name="email" autoComplete="email" required /></label>
        <label>Password <input type="password" name="password" autoComplete="current-password" required /></label>
        <button className="button">Sign in</button>
      </form>
      {pathSync && <p>No account yet? <a href={pathSync}>Create one on PathSync</a>.</p>}
    </section>
  );
}
