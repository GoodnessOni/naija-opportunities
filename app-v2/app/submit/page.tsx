"use client";

import { useState, type FormEvent } from "react";

export default function SubmitOpportunity() {
  const [signup, setSignup] = useState(false);
  const [submissions, setSubmissions] = useState<{listing_id: string; title: string; state: string}[]>([]);
  const [token, setToken] = useState("");
  const [deadline, setDeadline] = useState("unknown");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadStatus(accessToken: string) {
    const response = await fetch("/api/submissions", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error("Could not load submission status.");
    setSubmissions((await response.json()).submissions);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(token ? "/api/submissions" : signup ? "/api/submissions/signup" : "/api/staff/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(token ? { deadlineDate: "", timezone: "", ...data } : data),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) setToken("");
        const messages: Record<string, string> = {
          possible_duplicate: "This opportunity may already have been submitted.",
          confirm_email: "Confirm your email address before submitting.",
          invalid_listing_fields: "Check the source link, deadline, and listing text. Leave out personal contact details.",
        };
        setNotice(messages[result.error] ?? (token ? "The submission could not be saved. Sign in again if your session expired." : "Could not sign in."));
        return;
      }
      if (!token && signup) {
        setSignup(false);
        setNotice("Check your email for a confirmation link, then sign in.");
        return;
      }
      if (!token) {
        setToken(result.access_token);
        await loadStatus(result.access_token);
      }
      else {
        setNotice(`Received for staff review. Reference: ${result.listing_id}`);
        await loadStatus(token).catch(() => undefined);
      }
    } catch {
      setNotice("The service is unavailable. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="browse">
    <h1>Submit an opportunity</h1>
    <p>Staff check submissions against the official source before publishing.</p>
    <p role="status">{notice}</p>
    {!token ? <form key="signin" className="review-form" onSubmit={send}>
      <p>{signup ? "Create an organisation account." : "Sign in with your confirmed organisation account."}</p>
      <label>Email <input name="email" type="email" required autoComplete="username" /></label>
      <label>Password <input name="password" type="password" required minLength={signup ? 12 : 1} autoComplete={signup ? "new-password" : "current-password"} /></label>
      <button className="button" disabled={busy}>{signup ? "Create account" : "Sign in"}</button>
      <button type="button" onClick={() => setSignup(!signup)}>{signup ? "Back to sign in" : "Create an account"}</button>
    </form> : <form key="listing" className="review-form" onSubmit={send}>
      <label>Opportunity type <select name="kind"><option value="job">Job</option><option value="internship">Internship</option><option value="scholarship">Scholarship</option></select></label>
      <label>Title <input name="title" required maxLength={180} /></label>
      <label>Provider <input name="provider" required maxLength={160} /></label>
      <label>Official source <input name="source" type="url" required placeholder="https://" /></label>
      <label>Application URL <input name="apply" type="url" required placeholder="https://" /></label>
      <label>Short summary <textarea name="summary" required maxLength={400} /></label>
      <label>Description <textarea name="description" required maxLength={8000} /></label>
      <label>Eligibility from the source <textarea name="criteria" maxLength={4000} /></label>
      <label>Deadline <select name="deadlineKind" value={deadline} onChange={event => setDeadline(event.target.value)}>
        <option value="unknown">Not stated</option><option value="rolling">Rolling</option><option value="fixed">Fixed date</option>
      </select></label>
      {deadline === "fixed" && <>
        <label>Date <input name="deadlineDate" type="date" required /></label>
        <label>Time zone if stated <input name="timezone" placeholder="Africa/Lagos" maxLength={100} /></label>
      </>}
      <label>Round or intake if stated <input name="round" maxLength={100} /></label>
      <button className="button" disabled={busy}>Send for review</button>
    </form>}
    {token && <section><h2>Your submissions</h2>{submissions.length ? <ul>{submissions.map(item => <li key={item.listing_id}>{item.title} · {item.state.replaceAll("_", " ")}</li>)}</ul> : <p>No submissions yet.</p>}</section>}
  </section>;
}
