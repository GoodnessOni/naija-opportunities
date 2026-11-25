"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auditLabel, type AuditEvent } from "../../../lib/listings/audit";

const sessionKey = "naijaopportunities.staff.access";

export default function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed_out" | "error">("loading");
  const [more, setMore] = useState(false);

  async function load(before?: string) {
    const token = sessionStorage.getItem(sessionKey);
    if (!token) return setStatus("signed_out");
    const query = new URLSearchParams({ limit: "100", ...(before && { before }) });
    const response = await fetch(`/api/staff/audit?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 || response.status === 403) return setStatus("signed_out");
    if (!response.ok) return setStatus("error");
    const page: { events: AuditEvent[] } = await response.json();
    setEvents(current => before ? [...current, ...page.events] : page.events);
    setMore(page.events.length === 100);
    setStatus("ready");
  }

  useEffect(() => { void load(); }, []);

  if (status === "signed_out") return <p><Link href="/admin">Sign in on the staff page</Link> first.</p>;
  if (status === "error") return <p role="alert">The audit log is not available right now.</p>;
  if (status === "loading") return <p>Loading...</p>;
  if (!events.length) return <p>No staff actions recorded yet.</p>;
  const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
  return <>
    <table className="audit-table">
      <thead><tr><th scope="col">When (Lagos)</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Listing</th><th scope="col">Note</th></tr></thead>
      <tbody>{events.map((event, index) => <tr key={`${event.at}-${index}`}>
        <td><time dateTime={event.at}>{time.format(new Date(event.at))}</time></td>
        <td>{event.actor}</td><td>{auditLabel(event.action)}</td>
        <td>{event.title ?? event.listing_id}<br /><small>{event.listing_id}</small></td><td>{event.note}</td>
      </tr>)}</tbody>
    </table>
    {more && <button className="button" onClick={() => load(events[events.length - 1].at)}>Show older</button>}
  </>;
}
