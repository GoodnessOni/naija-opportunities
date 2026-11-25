"use client";

import { useState, type FormEvent } from "react";
import type { Listing } from "../../lib/listings/schema";

export default function StaffEditor({ token, onSaved }: { token: string; onSaved: () => Promise<void> }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = String(new FormData(event.currentTarget).get("id"));
    setBusy(true);
    try {
      const response = await fetch(`/api/staff/listings?${new URLSearchParams({ id })}`, { headers });
      if (!response.ok) throw new Error();
      setListing(await response.json());
      setNotice("");
    } catch { setNotice("Could not load that listing."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    const { note, ...fields } = data;
    const payload = listing
      ? { ...fields, action, note, id: listing.listing_id, revision: listing.revision }
      : { action: "create", note, listing: { deadlineDate: "", timezone: "", round: "", criteria: "", ...fields } };
    if (action === "withdraw" && !window.confirm("Withdraw this listing from the public feed?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/staff/listings", { method: "POST", headers, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        setNotice(response.status === 409 ? "The record changed or duplicates another listing. Reload it before retrying." : "Could not save. Check the listing fields and your session.");
        return;
      }
      form.reset();
      setListing(null);
      setNotice(`Saved ${result.listing_id}. ${action === "withdraw" ? "Listing withdrawn." : "Review is required before publication."}`);
      await onSaved().catch(() => undefined);
    } catch { setNotice("The listing service is unavailable."); }
    finally { setBusy(false); }
  }
  return <details>
    <summary>Manage listings</summary>
    <form className="search-form" onSubmit={load}>
      <label>Listing ID <input name="id" required pattern="lst_[0-9A-HJKMNP-TV-Z]{26}" /></label>
      <button className="button" disabled={busy}>Load listing</button>
      {listing && <button type="button" disabled={busy} onClick={() => setListing(null)}>Create another listing</button>}
    </form>
    <p role="status">{notice}</p>
    <form key={listing?.listing_id ?? "new"} className="review-form" onSubmit={save}>
      <h2>{listing ? "Edit listing" : "Create draft"}</h2>
      {!listing && <>
        <label>Type <select name="kind"><option value="job">Job</option><option value="internship">Internship</option><option value="scholarship">Scholarship</option></select></label>
        <label>Provider <input name="provider" required maxLength={160} /></label>
        <label>Round <input name="round" maxLength={100} /></label>

      </>}
      <label>Deadline type <select name="deadlineKind" defaultValue={listing ? "keep" : "unknown"}>
        {listing && <option value="keep">Keep existing deadline</option>}
        <option value="unknown">Not stated</option><option value="rolling">Rolling</option><option value="fixed">Set fixed date</option>
      </select></label>
      <label>Deadline date <input name="deadlineDate" type="date" /></label>
      <label>Source timezone <input name="timezone" placeholder="Africa/Lagos" maxLength={100} /></label>
      <label>Eligibility <textarea name="criteria" defaultValue={listing?.eligibility.criteria_text ?? ""} maxLength={4000} /></label>
      <label>Title <input name="title" required defaultValue={listing?.title} maxLength={180} /></label>
      <label>Summary <textarea name="summary" required defaultValue={listing?.summary} maxLength={400} /></label>
      <label>Description <textarea name="description" required defaultValue={listing?.description} maxLength={8000} /></label>
      <label>Official source <input name="source" type="url" required defaultValue={listing?.source.url} /></label>
      <label>Application URL <input name="apply" type="url" required defaultValue={listing?.application.url} /></label>
      <label>Reason for change <textarea name="note" required maxLength={1000} /></label>
      <button type="submit" value={listing ? "edit" : "create"} className="button" disabled={busy}>Save listing</button>
      {listing?.lifecycle.publication_status === "published" && <button type="submit" value="withdraw" className="button" disabled={busy}>Withdraw listing</button>}
    </form>
  </details>;
}
