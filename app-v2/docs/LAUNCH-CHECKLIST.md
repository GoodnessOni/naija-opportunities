# Launch checklist: v3 on naijaopportunities.live and PathSync on its subdomain

Code is on branch `feat/pathsync-bridge`. Steps marked **Goodness** need a sign-in, a key or an approval.

## 1. Database (Goodness approves, Claude runs in the SQL editor)
- [x] Apply `supabase/migrations/016_staff_audit.sql` (applied 25 Nov 2026, approved by Goodness).
- [x] Apply `supabase/migrations/017_queue_assignment.sql` (applied 25 Nov 2026; table and 3 functions verified, anon cannot run them).
- [ ] Rerun `scripts/check-migrations.sql`; extend it with 016 and 017.

## 2. Merge and deploy to the v3 Vercel project
- [x] Merged `feat/pathsync-bridge` into `v2/rebuild` (fast-forward to 19c36bb, 25 Nov 2026, approved by Goodness).
- [ ] Vercel deploys v3 at naija-opportunities-v3.vercel.app. Note the deployed commit here: ________

## 3. Vercel variables, NaijaOpportunities project (Goodness pastes values)
- [x] SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_URL, FEED_API_KEY_HASHES
- [ ] CRON_SECRET (random, 32+ characters; also stored in Supabase Vault as `naija_v3_alert_cron_secret`)
- [ ] ALERT_SIGNING_SECRET (random, 32+ characters)
- [ ] RESEND_API_KEY, CONTACT_FROM_EMAIL (a verified sender on the domain), CONTACT_EMAIL (staff inbox)
- [ ] SITE_URL=https://naijaopportunities.live (at cutover)
- [ ] PATHSYNC_URL=https://pathsync-ai.naijaopportunities.live (once PathSync is live there)

## 4. Acceptance with real accounts (Goodness signs in, Claude drives the browser)
- [ ] One real verified scholarship, internship and job are on the public board and in the feed.
- [ ] Organisation A cannot see organisation B's submissions; drafts never appear publicly or in the feed.
- [ ] Withdraw a test listing: it leaves the board at once, the feed lookup returns `withdrawn`, the audit log shows who, when and the note.
- [ ] Alerts: create, confirm by email, receive a digest with only active listings, unsubscribe from the email without signing in.
- [ ] Contact form reaches the staff inbox.
- [ ] Keyboard only: find a scholarship and reach Apply. Screen reader pass on the same path.

## 5. Domains (Goodness approves each step; these change the public site)
- [ ] Record the current naijaopportunities.live deployment (project, commit) as the rollback target.
- [ ] Vercel v3 project: add `naijaopportunities.live` and `www`. Update DNS at the registrar as Vercel shows.
- [ ] Vercel PathSync project: add `pathsync-ai.naijaopportunities.live` (CNAME to Vercel).
- [ ] Supabase Auth, URL configuration: Site URL https://naijaopportunities.live; redirect URLs for both domains.
- [ ] Set SITE_URL and PATHSYNC_URL above, redeploy both.

## 6. Joint test with PathSync (handoff page 3)
- [ ] Page the live feed, fetch one listing, try a wrong key (401), check the 168-hour boundary.
- [ ] Sign in on NaijaOpportunities, open a scholarship, follow "See if you qualify", land signed in on PathSync on the same listing.
- [ ] Mark Interested twice: one record. Applied only after the box. Second account sees none of it.
- [ ] Withdraw the test listing: gone from discovery, tracker keeps it as Withdrawn.
- [ ] Sign out on one app signs out on both.
