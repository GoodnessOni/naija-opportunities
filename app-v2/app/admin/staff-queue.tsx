"use client";

import { useState, type FormEvent } from "react";
import type { Listing } from "../../lib/listings/schema";

export default function StaffQueue() {
  const [token, setToken] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [outcome, setOutcome] = useState("confirmed_open");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh(accessToken: string) {
    const response = await fetch("/api/staff/review", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) setToken("");
      throw new Error(response.status === 403 ? "This account does not have staff access." : "The review queue is unavailable.");
    }
    const result: { listings: Listing[] } = await response.json();
    setListings(result.listings);
  }

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
      if (response.status === 401 || response.status === 403) setToken("");
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

  return <>
    <p role="status">{notice}</p>
    {!token ? <form className="search-form" onSubmit={signIn}>
      <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <button className="button" disabled={busy}>Sign in</button>
    </form> : <>
      <button className="button-outline" disabled={busy} onClick={() => refresh(token).catch(error => setNotice(error.message))}>Refresh queue</button>
      <button className="button-outline" disabled={busy} onClick={() => { setToken(""); setSelected(null); setListings([]); }}>Sign out</button>
      <ul className="listing-list">
        {listings.map(listing => <li key={listing.listing_id}>
          <h2>{listing.title}</h2><p>{listing.provider.name}</p>
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
