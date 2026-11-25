import { browseFilterLabel, browseFilterLabels, browseFilterOptions, parseBrowseFilters } from "../../lib/listings/browse-filters";
import { changeSubscription, subscribe } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email alerts" };

export default async function Alerts({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { id, operation, signature, status, q, kind } = params;
  const filters = parseBrowseFilters(params);
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
        <p>Get an email when new opportunities match your filters.</p>
        <label>Email <input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <label>Keyword <input name="keyword" maxLength={200} defaultValue={typeof q === "string" ? q.slice(0, 200) : ""} /></label>
        <label>Category <select name="kind" defaultValue={typeof kind === "string" ? kind : ""}>
          <option value="">All</option><option value="scholarship">Scholarships</option><option value="internship">Internships</option><option value="job">Jobs</option>
        </select></label>
        <label>Country or locality <input name="location_query" maxLength={100} defaultValue={filters.location_query} /></label>
        {Object.entries(browseFilterOptions).map(([key, values]) => {
          const name = key as keyof typeof browseFilterOptions;
          return <label key={key}>{browseFilterLabels[name]} <select name={name} defaultValue={filters[name] ?? ""}>
            <option value="">Any</option>
            {values.map(value => <option key={value} value={value}>{browseFilterLabel(key, value)}</option>)}
          </select></label>;
        })}
        <label>Delivery <select name="frequency" defaultValue="daily">
          <option value="daily">Daily digest</option>
          {process.env.INSTANT_ALERTS_ENABLED === "true" && <option value="instant">As soon as available</option>}
        </select></label>
        <div hidden><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <button className="button">Request alert</button>
      </form>
    ) : <p>Signup opens when email delivery is configured.</p>}
  </section>;
}
