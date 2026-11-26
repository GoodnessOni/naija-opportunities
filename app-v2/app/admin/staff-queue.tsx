"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import StaffEditor from "./staff-editor";
import CitizenshipSuggestions from "./citizenship-suggestions";
import type { Listing } from "../../lib/listings/schema";
import { filterQueue, needsOfficialUrl, type QueueFilters } from "../../lib/listings/queue-filters";

const sessionKey = "naijaopportunities.staff.access";

export default function StaffQueue() {
  const [token, setToken] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [overview, setOverview] = useState<{ pending: number; ambiguous: number; stale: number; closingSoon: number; published: number }>();
  const [selected, setSelected] = useState<Listing | null>(null);
  const [outcome, setOutcome] = useState("confirmed_open");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [reviewer, setReviewer] = useState("");
  const [filters, setFilters] = useState<QueueFilters>({ kind: "all", state: "all", owner: "all" });

  const refresh = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/staff/review", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(sessionKey);
        setToken("");
        setSelected(null);
        setListings([]);
      }
      throw new Error(response.status === 403 ? "This account does not have staff access." : "The review queue is unavailable.");
    }
    const result: { listings: Listing[]; overview: typeof overview; assignments?: Record<string, string>; reviewer?: string } = await response.json();
    setListings(result.listings);
    setAssignments(result.assignments ?? {});
    setReviewer(result.reviewer ?? "");
    setOverview(result.overview);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(sessionKey);
    if (!saved) return;
    const restore = window.setTimeout(() => {
      refresh(saved).then(() => setToken(saved)).catch(error => setNotice(error.message));
    }, 0);
    return () => window.clearTimeout(restore);
  }, [refresh]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/staff/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      if (!response.ok) throw new Error("Sign-in failed. Check your details and try again.");
      const result: { access_token: string } = await response.json();
      await refresh(result.access_token);
      sessionStorage.setItem(sessionKey, result.access_token);
      setToken(result.access_token);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const evidence = outcome === "confirmed_open"
      ? { open: data.get("open"), deadline: data.get("deadline"), eligibility: data.get("eligibility"), application: data.get("application") }
      : { note: data.get("note") };
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/staff/review", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: selected.listing_id, revision: selected.revision, review: { outcome, evidence } }),
      });
      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem(sessionKey);
        setToken("");
        setSelected(null);
        setListings([]);
      }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(response.status === 409 ? "Another reviewer changed this listing. Refresh the queue." :
          response.status === 422 ? result.error : "Could not save the review.");
      }
      setSelected(null);
      setNotice("Review saved.");
      await refresh(token).catch(() => setNotice("Review saved. The queue could not be refreshed."));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  async function assign(listingId: string, reviewerId: string | null) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/staff/assign", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, reviewer_id: reviewerId }),
      });
      if (!response.ok) throw new Error("Could not change the assignment.");
      await refresh(token);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not change the assignment.");
    } finally {
      setBusy(false);
    }
  }

  const visible = filterQueue(listings, filters, assignments, reviewer);
  const setFilter = (key: keyof QueueFilters) => (event: { target: { value: string } }) =>
    setFilters(current => ({ ...current, [key]: event.target.value }));

  return <>
    <p role="status">{notice}</p>
    {!token ? <form className="search-form" onSubmit={signIn}>
      <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <button className="button" disabled={busy}>Sign in</button>
    </form> : <>
      <button className="button-outline" disabled={busy} onClick={() => refresh(token).catch(error => setNotice(error.message))}>Refresh queue</button>
      <button className="button-outline" disabled={busy} onClick={() => { sessionStorage.removeItem(sessionKey); setToken(""); setSelected(null); setListings([]); }}>Sign out</button>
      {overview && <dl className="search-form">
        <div><dt>Pending</dt><dd>{overview.pending}</dd></div>
        <div><dt>Ambiguous</dt><dd>{overview.ambiguous}</dd></div>
        <div><dt>Stale</dt><dd>{overview.stale}</dd></div>
        <div><dt>Closing in seven days</dt><dd>{overview.closingSoon}</dd></div>
        <div><dt>Published</dt><dd>{overview.published}</dd></div>
      </dl>}
      <StaffEditor token={token} onSaved={() => refresh(token)} />
      <CitizenshipSuggestions token={token} />
      <fieldset className="search-form queue-filters"><legend>Filter the queue</legend>
        <div><label htmlFor="filter-kind">Type</label><select id="filter-kind" value={filters.kind} onChange={setFilter("kind")}>
          <option value="all">All types</option><option value="scholarship">Scholarships</option>
          <option value="internship">Internships</option><option value="job">Jobs</option></select></div>
        <div><label htmlFor="filter-state">State</label><select id="filter-state" value={filters.state} onChange={setFilter("state")}>
          <option value="all">All states</option><option value="draft">New drafts</option><option value="due">Due for recheck</option>
          <option value="inconclusive">Inconclusive or failed check</option><option value="needs_official_url">Needs official URL</option></select></div>
        <div><label htmlFor="filter-owner">Assigned</label><select id="filter-owner" value={filters.owner} onChange={setFilter("owner")}>
          <option value="all">Anyone</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select></div>
      </fieldset>
      <p>{visible.length} of {listings.length} shown</p>
      <ul className="listing-list">
        {visible.map(listing => <li key={listing.listing_id}>
          <h2>{listing.title}</h2><p>{listing.provider.name}</p>
          {needsOfficialUrl(listing) && <p className="queue-tag">Needs official URL</p>}
          <p>{assignments[listing.listing_id] ? `Assigned to ${assignments[listing.listing_id]}` : "Unassigned"}</p>
          {reviewer && assignments[listing.listing_id] !== reviewer &&
            <button className="button-outline" disabled={busy} onClick={() => assign(listing.listing_id, reviewer)}>Assign to me</button>}
          {assignments[listing.listing_id] &&
            <button className="button-outline" disabled={busy} onClick={() => assign(listing.listing_id, null)}>Unassign</button>}
          <button className="button-outline" disabled={busy} onClick={() => { setSelected(listing); setOutcome("confirmed_open"); }}>Review listing</button>
        </li>)}
      </ul>
      {listings.length === 0 && <p>No listings waiting for review.</p>}
      {selected && <form key={selected.listing_id} onSubmit={submitReview} className="review-form">
        <h2>Review {selected.title}</h2>
        <p>{selected.summary}</p>
        <p><a href={selected.source.url} target="_blank" rel="noreferrer">Open source in a new tab</a></p>
        <label htmlFor="outcome">Decision</label>
        <select id="outcome" value={outcome} onChange={event => setOutcome(event.target.value)}>
          <option value="confirmed_open">Confirm open and publish</option>
          <option value="confirmed_closed">Confirm closed</option>
          <option value="ambiguous">Inconclusive</option>
          <option value="failed">Check failed</option>
        </select>
        {outcome === "confirmed_open" ? [
          ["open", "Open status"], ["deadline", "Deadline"], ["eligibility", "Eligibility"], ["application", "Application link"],
        ].map(([id, label]) => <div key={id}><label htmlFor={id}>{label} evidence</label><textarea id={id} name={id} required maxLength={1000} /></div>)
          : <div><label htmlFor="note">Evidence or reason</label><textarea id="note" name="note" required maxLength={1000} /></div>}
        <button className="button" disabled={busy}>Save review</button>
      </form>}
    </>}
  </>;
}
