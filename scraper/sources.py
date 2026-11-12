"""Job and scholarship sources.

Every source function takes a PoliteClient and returns a list of dicts in the
shape the Supabase tables expect. Sources never raise for a single bad item;
whole-source failures are caught by run_sources() in scraper.py.

Preference order: official public APIs / RSS / sitemaps first, HTML only when
there is no feed. Sites that forbid scraping (LinkedIn, Indeed) are not used.
"""
from __future__ import annotations

import html
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from bs4 import BeautifulSoup

from http_client import PoliteClient

# ── shared helpers ──────────────────────────────────────────

JOB_DEFAULTS = {
    'company': 'See listing', 'location': 'Nigeria', 'type': 'full-time',
    'description': '', 'image_url': None, 'eligibility': None, 'benefits': None,
    'how_to_apply': None, 'documents_needed': None, 'salary': None,
    'experience': None, 'deadline': None,
}

NIGERIA_WORDS = ('nigeria', 'lagos', 'abuja', 'port harcourt', 'ibadan', 'kano',
                 'enugu', 'kaduna', 'benin city', 'abeokuta', 'owerri', 'uyo',
                 'calabar', 'ilorin', 'jos', 'warri', 'onitsha', 'akure')
AFRICA_REMOTE_WORDS = ('africa', 'emea', 'anywhere', 'worldwide', 'global')


def make_job(**fields) -> dict:
    job = dict(JOB_DEFAULTS)
    job.update({k: v for k, v in fields.items() if v is not None or k not in job})
    job['title'] = clean_text(job.get('title', ''))[:300]
    job['description'] = clean_text(job.get('description') or '')[:600]
    return job


def clean_text(text: str) -> str:
    if not text:
        return ''
    if '<' in text and '>' in text:
        text = BeautifulSoup(text, 'html.parser').get_text(' ')
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def is_nigeria_location(location: str, allow_remote_africa: bool = True) -> bool:
    loc = (location or '').lower()
    if any(w in loc for w in NIGERIA_WORDS):
        return True
    return allow_remote_africa and 'remote' in loc and any(w in loc for w in AFRICA_REMOTE_WORDS)


def parse_feed(xml_text: str) -> list[dict]:
    """Parse RSS 2.0 or Atom into [{title, link, published, categories, summary}]."""
    items = []
    try:
        root = ET.fromstring(xml_text.encode('utf-8') if isinstance(xml_text, str) else xml_text)
    except ET.ParseError:
        soup = BeautifulSoup(xml_text, 'xml')
        for it in soup.find_all(['item', 'entry']):
            link = it.find('link')
            href = (link.get('href') or link.get_text()) if link else ''
            items.append({'title': clean_text(it.title.get_text() if it.title else ''),
                          'link': (href or '').strip(), 'published': None,
                          'categories': [c.get_text() for c in it.find_all('category')],
                          'summary': clean_text((it.find('description') or it.find('summary') or '') and
                                                (it.find('description') or it.find('summary')).get_text())})
        return items
    atom = '{http://www.w3.org/2005/Atom}'
    for it in root.iter('item'):
        pub = it.findtext('pubDate')
        try:
            published = parsedate_to_datetime(pub) if pub else None
        except (TypeError, ValueError):
            published = None
        items.append({
            'title': clean_text(it.findtext('title') or ''),
            'link': (it.findtext('link') or '').strip(),
            'published': published,
            'categories': [c.text or '' for c in it.findall('category')],
            'summary': clean_text(it.findtext('description') or ''),
        })
    for it in root.iter(atom + 'entry'):
        link_el = it.find(atom + 'link')
        items.append({
            'title': clean_text(it.findtext(atom + 'title') or ''),
            'link': link_el.get('href', '') if link_el is not None else '',
            'published': None,
            'categories': [c.get('term', '') for c in it.findall(atom + 'category')],
            'summary': clean_text(it.findtext(atom + 'summary') or ''),
        })
    return items


def parse_sitemap(xml_text: str) -> list[tuple[str, str]]:
    """Return [(loc, lastmod)] from a urlset sitemap."""
    soup = BeautifulSoup(xml_text, 'xml')
    out = []
    for url in soup.find_all('url'):
        loc = url.find('loc')
        mod = url.find('lastmod')
        if loc:
            out.append((loc.get_text().strip(), mod.get_text().strip() if mod else ''))
    return out


def og_image(page_html: str) -> str | None:
    soup = BeautifulSoup(page_html, 'html.parser')
    tag = soup.find('meta', property='og:image') or soup.find('meta', attrs={'name': 'twitter:image'})
    return tag['content'] if tag and tag.get('content') else None


# ── JOB SOURCES ─────────────────────────────────────────────

# Official, free, public ATS job-board APIs of companies hiring in Nigeria.
# Add more boards here: (ats, board_token, company display name).
ATS_BOARDS = [
    ('greenhouse', 'moniepoint', 'Moniepoint'),
    ('workable', 'kuda', 'Kuda'),
]


def fetch_ats_board(client: PoliteClient, ats: str, token: str, company: str) -> list[dict]:
    jobs = []
    if ats == 'greenhouse':
        data = client.get_json(f'https://boards-api.greenhouse.io/v1/boards/{token}/jobs', robots=False)
        for j in data.get('jobs', []):
            loc = (j.get('location') or {}).get('name', '')
            if is_nigeria_location(loc):
                jobs.append(make_job(title=j.get('title'), company=company, location=loc,
                                     apply_url=j.get('absolute_url'), source=f'greenhouse-{token}'))
    elif ats == 'lever':
        data = client.get_json(f'https://api.lever.co/v0/postings/{token}?mode=json', robots=False)
        for j in data:
            loc = (j.get('categories') or {}).get('location', '')
            if is_nigeria_location(loc):
                jobs.append(make_job(title=j.get('text'), company=company, location=loc,
                                     apply_url=j.get('hostedUrl'), source=f'lever-{token}',
                                     description=j.get('descriptionPlain', '')))
    elif ats == 'ashby':
        data = client.get_json(f'https://api.ashbyhq.com/posting-api/job-board/{token}', robots=False)
        for j in data.get('jobs', []):
            loc = j.get('location', '') or ''
            if is_nigeria_location(loc):
                jobs.append(make_job(title=j.get('title'), company=company, location=loc,
                                     apply_url=j.get('jobUrl'), source=f'ashby-{token}',
                                     type='remote' if j.get('isRemote') else 'full-time'))
    elif ats == 'workable':
        data = client.get_json(f'https://apply.workable.com/api/v1/widget/accounts/{token}', robots=False)
        for j in data.get('jobs', []):
            loc = ', '.join(filter(None, [j.get('city'), j.get('country')]))
            if is_nigeria_location(loc) or (j.get('telecommuting') and is_nigeria_location(j.get('country', ''))):
                jobs.append(make_job(title=j.get('title'), company=company, location=loc or 'Nigeria',
                                     apply_url=j.get('url') or j.get('shortlink'), source=f'workable-{token}',
                                     type='remote' if j.get('telecommuting') else 'full-time',
                                     experience=j.get('experience') or None))
    else:
        raise ValueError(f'unknown ATS {ats}')
    return jobs


def scrape_ats_boards(client: PoliteClient) -> list[dict]:
    out = []
    for ats, token, company in ATS_BOARDS:
        try:
            out += fetch_ats_board(client, ats, token, company)
        except Exception as e:  # one board failing must not stop the others
            print(f'  ⚠️  {ats}/{token} failed: {e}')
    return out


def scrape_jobberman(client: PoliteClient, limit: int = 20, with_images: bool = True) -> list[dict]:
    """Jobberman has no public feed; the /jobs listing page is allowed by robots.txt."""
    page = client.get_text('https://www.jobberman.com/jobs')
    soup = BeautifulSoup(page, 'html.parser')
    jobs, seen = [], set()
    for a in soup.select('a[href*="/listings/"]'):
        href = a.get('href', '').split('?')[0]
        if not href or href in seen:
            continue
        if href.startswith('/'):
            href = 'https://www.jobberman.com' + href
        title = clean_text(a.get_text(' '))
        if len(title) < 4:  # image links etc: fall back to slug
            title = href.rsplit('/listings/', 1)[-1].rsplit('-', 1)[0].replace('-', ' ').title()
        seen.add(href)
        jobs.append(make_job(title=title, apply_url=href, source='jobberman'))
        if len(jobs) >= limit:
            break
    if with_images:
        for job in jobs:
            try:
                job['image_url'] = og_image(client.get_text(job['apply_url']))
            except Exception:
                pass
    return jobs


def scrape_remoteok(client: PoliteClient, limit: int = 20) -> list[dict]:
    """RemoteOK public API. Their terms ask for a link back to RemoteOK as the source."""
    data = client.get_json('https://remoteok.com/api', robots=False)
    jobs = []
    for item in data:
        if not isinstance(item, dict) or not item.get('position'):
            continue  # first element is a legal notice
        salary = None
        if item.get('salary_min') and item.get('salary_max'):
            salary = f"${item['salary_min']:,} - ${item['salary_max']:,}"
        jobs.append(make_job(title=item.get('position'), company=item.get('company') or 'Remote',
                             location='Remote / International', type='remote',
                             apply_url=item.get('url'), source='remoteok',
                             description=item.get('description', ''),
                             image_url=item.get('company_logo') or item.get('logo') or None,
                             salary=salary))
        if len(jobs) >= limit:
            break
    return jobs


def scrape_weworkremotely(client: PoliteClient, limit: int = 15) -> list[dict]:
    xml = client.get_text('https://weworkremotely.com/categories/remote-programming-jobs.rss')
    jobs = []
    for it in parse_feed(xml)[:limit]:
        title = it['title']
        company = 'See listing'
        if ':' in title:  # WWR titles are "Company: Role"
            company, title = [p.strip() for p in title.split(':', 1)]
        jobs.append(make_job(title=title, company=company, location='Remote / International',
                             type='remote', apply_url=it['link'], source='weworkremotely',
                             description=it['summary']))
    return jobs


JOB_NEWS_KEYWORDS = re.compile(
    r'recruit|hiring|vacanc|job|graduate trainee|internship|apply|application|career|opening',
    re.I)
JOB_NEWS_EXCLUDE = re.compile(r'price|arrest|killed|election|court|budget|inflation|petrol', re.I)


def scrape_jobs_googlenews(client: PoliteClient, per_query: int = 4) -> list[dict]:
    """Google News RSS search. These are news articles about recruitment, so filter hard."""
    queries = [
        'graduate+trainee+application+Nigeria',
        'recruitment+portal+open+Nigeria',
        '"we+are+hiring"+Nigeria',
        'Nigerian+Army+Police+recruitment',
        'NNPC+CBN+bank+recruitment+Nigeria',
    ]
    jobs, seen = [], set()
    for q in queries:
        url = f'https://news.google.com/rss/search?q={q}+when:7d&hl=en-NG&gl=NG&ceid=NG:en'
        try:
            items = parse_feed(client.get_text(url, robots=False))
        except Exception as e:
            print(f'  ⚠️  Google News query failed: {e}')
            continue
        kept = 0
        for it in items:
            t = it['title']
            if not it['link'] or it['link'] in seen:
                continue
            if not JOB_NEWS_KEYWORDS.search(t) or JOB_NEWS_EXCLUDE.search(t):
                continue
            seen.add(it['link'])
            jobs.append(make_job(title=t, apply_url=it['link'], source='googlenews-jobs'))
            kept += 1
            if kept >= per_query:
                break
    return jobs


# ── SCHOLARSHIP SOURCES (titles + links; AI enrichment happens later) ──

SCHOLARSHIP_WORDS = re.compile(r'scholarship|fellowship|grant|bursary|award|funded|internship|programme|program', re.I)


def scrape_scholars4dev(client: PoliteClient, limit: int = 10) -> list[dict]:
    items = parse_feed(client.get_text('https://www.scholars4dev.com/feed/'))
    return [{'title': it['title'], 'apply_url': it['link'], 'source': 'scholars4dev',
             'country': 'International'} for it in items[:limit] if it['link']]


def scrape_opportunitydesk(client: PoliteClient, limit: int = 10) -> list[dict]:
    items = parse_feed(client.get_text('https://opportunitydesk.org/category/fellowships-and-scholarships/feed/'))
    return [{'title': it['title'], 'apply_url': it['link'], 'source': 'opportunitydesk',
             'country': 'International'} for it in items[:limit] if it['link']]


def scrape_afterschoolafrica(client: PoliteClient, limit: int = 10) -> list[dict]:
    """AfterSchoolAfrica blocks /feed and /wp-json in robots.txt, so use its public sitemap."""
    index = client.get_text('https://www.afterschoolafrica.com/sitemap_index.xml')
    post_maps = sorted(set(re.findall(r'https://www\.afterschoolafrica\.com/post-sitemap\d*\.xml', index)),
                       key=lambda u: int(re.search(r'(\d*)\.xml$', u).group(1) or 1))
    if not post_maps:
        return []
    urls = parse_sitemap(client.get_text(post_maps[-1]))
    urls.sort(key=lambda x: x[1], reverse=True)
    out = []
    for loc, _mod in urls:
        slug = loc.rstrip('/').rsplit('/', 1)[-1]
        if not SCHOLARSHIP_WORDS.search(slug):
            continue
        title = slug.replace('-', ' ').title()
        out.append({'title': title, 'apply_url': loc, 'source': 'afterschoolafrica',
                    'country': 'International'})
        if len(out) >= limit:
            break
    return out


JOB_SOURCES = {
    'jobberman': scrape_jobberman,
    'remoteok': scrape_remoteok,
    'weworkremotely': scrape_weworkremotely,
    'ats-boards': scrape_ats_boards,
    'googlenews-jobs': scrape_jobs_googlenews,
}

SCHOLARSHIP_SOURCES = {
    'scholars4dev': scrape_scholars4dev,
    'opportunitydesk': scrape_opportunitydesk,
    'afterschoolafrica': scrape_afterschoolafrica,
}

# Removed (Nov 2026):
#   scholarshipregion.com - answers every request with an HTTP 202 bot challenge
#   myschoolnews.ng       - site rebuilt, scholarship category and feed return 404
#   schoolgist.ng         - site rebuilt, no scholarship category, feed 404
