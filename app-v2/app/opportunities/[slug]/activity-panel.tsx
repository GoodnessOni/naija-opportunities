"use client";

import { useActionState } from "react";
import { APPLIED_CONFIRMATION, type ActivityStatus } from "../../../lib/activity";
import { updateActivity, type ActivityState } from "./activity-actions";

export default function ActivityPanel({ listingId, status, signInHref }: {
  listingId: string; status: ActivityStatus | null; signInHref: string | null;
}) {
  const [state, action, pending] = useActionState<ActivityState, FormData>(updateActivity, {});
  if (signInHref) return <p className="listing-activity"><a href={signInHref}>Sign in</a> to mark this as Interested. Your record also shows in PathSync.</p>;
  const hidden = <input type="hidden" name="listing_id" value={listingId} />;
  return (
    <section className="listing-activity" aria-label="Your record">
      {status === null && <form action={action}>{hidden}
        <button className="button" name="action" value="interested" disabled={pending}>Mark as Interested</button>
      </form>}
      {status === "interested" && <>
        <p>You marked this as Interested. It also shows in PathSync.</p>
        <form action={action}>{hidden}
          <label><input type="checkbox" name="confirm_applied" value="yes" required /> {APPLIED_CONFIRMATION}</label>
          <button className="button" name="action" value="applied" disabled={pending}>Mark as Applied</button>
        </form>
        <form action={action}>{hidden}<button name="action" value="remove" disabled={pending}>Remove</button></form>
      </>}
      {status === "applied" && <>
        <p>You reported that you applied on the provider’s page.</p>
        <form action={action}>{hidden}<button name="action" value="not_applied" disabled={pending}>I have not applied yet</button></form>
      </>}
      {state.error && <p role="alert">{state.error}</p>}
    </section>
  );
}
