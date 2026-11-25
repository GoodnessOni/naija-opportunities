import Link from "next/link";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return <article className="browse">
    <h1>Privacy</h1>
    <p>OGverse operates NaijaOpportunities. You can browse public listings without signing in.</p>
    <h2>What we use</h2>
    <p>We use organisation account details and listing submissions to manage access and review opportunities. Staff review records document verification and publication decisions. If you contact us, we use your email address and message to respond.</p>
    <p>Our hosting, database, authentication and email providers process the information needed to run those services.</p>
    <h2>Your Interested and Applied records</h2>
    <p>If you sign in, you can mark a listing as Interested or report that you Applied. We store only your own records: the listing, the status and when you set it. They are shared with PathSync, our sister app, which uses the same sign-in, so the same records appear there. Only you can see or change them; staff and organisations cannot. Applied means you told us you applied yourself. We never submit applications for you, and we do not record which provider links you open. You can remove a record at any time from the listing page.</p>
    <h2>Applying for opportunities</h2>
    <p>Apply on the provider’s official site. Keep CVs, transcripts and identity documents out of messages and listing submissions.</p>
    <h2>Questions and requests</h2>
    <p>Use our <Link href="/contact">contact page</Link> to ask about your information or request a correction.</p>
  </article>;
}
