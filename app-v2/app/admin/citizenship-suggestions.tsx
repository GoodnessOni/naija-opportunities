"use client";

import { useCallback, useEffect, useState } from "react";

type Suggestion = {
  listing_id: string; revision: number; title: string; provider: string;
  suggestion: { requirement: string; countries: string[] }; reason: string; evidence: string;
};

const label = (value: Suggestion["suggestion"]) =>
  value.countries[0] === "*" ? "Open to all nationalities" : `Citizens of ${value.countries.join(", ")}`;

export default function CitizenshipSuggestions({ token }: { token: string }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/staff/citizenship", { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Citizenship suggestions are unavailable.");
    const result: { suggestions: Suggestion[] } = await response.json();
    setItems(result.suggestions);
    setUnticked(new Set());
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { load().catch(error => setNotice(error.message)); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const chosen = items.filter(item => !unticked.has(item.listing_id));

  async function approveAll() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/staff/citizenship", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ approve: chosen.map(({ listing_id, revision }) => ({ listing_id, revision })) }),
      });
      if (!response.ok) throw new Error("Could not save the citizenship decisions.");
      const result: { applied: string[]; skipped: string[] } = await response.json();
      setNotice(`${result.applied.length} approved.${result.skipped.length ? ` ${result.skipped.length} changed since loading and were skipped.` : ""}`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the citizenship decisions.");
    } finally {
      setBusy(false);
    }
  }

  if (!items.length && !notice) return null;
  return <section className="review-form">
    <h2>Citizenship suggestions</h2>
    <p role="status">{notice}</p>
    <p>These listings name a nationality but the wording has a limit or a conflict. Untick any you do not agree with.</p>
    <ul className="listing-list">
      {items.map(item => <li key={item.listing_id}>
        <label>
          <input type="checkbox" checked={!unticked.has(item.listing_id)} onChange={event => setUnticked(current => {
            const next = new Set(current);
            if (event.target.checked) next.delete(item.listing_id); else next.add(item.listing_id);
            return next;
          })} /> {item.title} ({item.provider})
        </label>
        <p>Suggested: {label(item.suggestion)}. {item.reason === "negation" ? "Has a limit or exclusion." : "Matches conflict."}</p>
        <blockquote>{item.evidence}</blockquote>
      </li>)}
    </ul>
    {items.length > 0 && <button className="button" disabled={busy || !chosen.length} onClick={approveAll}>
      Approve all ({chosen.length})
    </button>}
  </section>;
}
