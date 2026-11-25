import assert from "node:assert/strict";

const base = new URL(process.argv[2] ?? "https://naija-opportunities-v3.vercel.app");
const paths = ["/", "/opportunities", "/scholarships", "/internships", "/jobs", "/about",
  "/privacy", "/terms", "/contact", "/alerts", "/submit", "/robots.txt", "/sitemap.xml"];
const privatePaths = ["/api/staff/review", "/api/submissions", "/api/alerts/digest", "/api/maintenance/rechecks"];

async function expectStatus(path, expected) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expected, path);
  console.log(`${response.status} ${path}`);
  return response;
}

for (const path of paths) await expectStatus(path, 200);
for (const path of privatePaths) await expectStatus(path, 401);

const sitemap = await (await expectStatus("/sitemap.xml", 200)).text();
assert.match(sitemap, /<loc>[^<]*\/opportunities<\/loc>/);
assert.doesNotMatch(sitemap, /<loc>[^<]*\/admin(?:<|\/)/);
