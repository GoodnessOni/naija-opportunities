import { changeSubscription, subscribe } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email alerts" };

export default async function Alerts({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id, operation, signature, status, q, kind } = await searchParams;
  const change = typeof id === "string" && typeof signature === "string" && (operation === "confirm" || operation === "unsubscribe");
  const messages: Record<string, string> = {
    "check-email": "If this alert is new, check your email for a confirmation link.",
    invalid: "Check your details or request a new confirmation link.",
    unavailable: "Email alerts are currently unavailable. Try again later.",
    confirmed: "Your alert is confirmed.",
    unsubscribed: "You have unsubscribed from this alert.",
  };
  return <section className="browse">
    <h1>Email alerts</h1>
    {typeof status === "string" && Object.hasOwn(messages, status) && <p role="status">{messages[status]}</p>}
    {change ? <form className="review-form" action={changeSubscription}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="signature" value={signature} />
      <button className="button">{operation === "confirm" ? "Confirm alert" : "Unsubscribe"}</button>
    </form> : process.env.ALERT_SIGNING_SECRET && process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL ? (
      <form className="review-form" action={subscribe}>
        <p>Get a daily email when new opportunities match your keyword and category.</p>
        <label>Email <input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Keyword <input name="keyword" maxLength={200} defaultValue={typeof q === "string" ? q.slice(0, 200) : ""} /></label>
        <label>Category <select name="kind" defaultValue={typeof kind === "string" ? kind : ""}>
          <option value="">All</option><option value="scholarship">Scholarships</option><option value="internship">Internships</option><option value="job">Jobs</option>
        </select></label>
        <div hidden><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <button className="button">Request alert</button>
      </form>
    ) : <p>Signup opens when email delivery is configured.</p>}
  </section>;
}
