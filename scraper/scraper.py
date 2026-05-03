from bs4 import XMLParsedAsHTMLWarning
import warnings
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

import requests
from bs4 import BeautifulSoup
from supabase import create_client
import os
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path
import time
import json
import random
import groq as groq_sdk

load_dotenv(Path(__file__).parent.parent / '.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

groq_client = groq_sdk.Groq(api_key=os.getenv('GROQ_API_KEY'))

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

session = requests.Session()
session.headers.update(HEADERS)


# ─── HELPERS ─────────────────────────────────────────────────

def fetch_page(url: str) -> BeautifulSoup | None:
    try:
        res = session.get(url, timeout=12)
        return BeautifulSoup(res.text, 'html.parser')
    except Exception as e:
        print(f'  Fetch error {url}: {e}')
        return None

def get_og_image(soup: BeautifulSoup) -> str | None:
    tag = soup.find('meta', property='og:image') or soup.find('meta', attrs={'name': 'twitter:image'})
    return tag['content'] if tag and tag.get('content') else None

def get_page_text(soup: BeautifulSoup) -> str:
    for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
        tag.decompose()
    el = soup.select_one('.entry-content, .post-content, article, main') or soup.body
    return el.get_text(separator=' ', strip=True)[:4000] if el else ''

def parse_rss(url: str) -> list:
    try:
        res = session.get(url, timeout=12)
        soup = BeautifulSoup(res.text, 'html.parser')
        return soup.find_all('item')
    except:
        return []

def get_rss_link(item) -> str:
    link = item.find('link')
    if not link:
        return ''
    return link.get_text().strip() or str(link.next_sibling or '').strip()


# ─── JOB SCRAPERS ────────────────────────────────────────────

def scrape_jobberman() -> list:
    print('Scraping Jobberman...')
    jobs = []
    try:
        soup = fetch_page('https://www.jobberman.com/jobs')
        if not soup:
            return []
        links = soup.find_all('link', rel='prerender')
        for link in links:
            href = link.get('href', '')
            if '/listings/' not in href:
                continue
            slug = href.split('/listings/')[-1]
            title = slug.rsplit('-', 1)[0].replace('-', ' ').title()
            detail = fetch_page(href)
            image_url = get_og_image(detail) if detail else None
            time.sleep(0.5)
            jobs.append({
                'title': title, 'company': 'See listing', 'location': 'Nigeria',
                'type': 'full-time', 'apply_url': href, 'source': 'jobberman',
                'description': '', 'image_url': image_url,
                'eligibility': None, 'benefits': None, 'how_to_apply': None,
                'documents_needed': None, 'salary': None, 'experience': None, 'deadline': None,
            })
    except Exception as e:
        print(f'Jobberman error: {e}')
    return jobs


def scrape_remoteok() -> list:
    print('Scraping RemoteOK...')
    jobs = []
    try:
        res = session.get('https://remoteok.com/api', timeout=12)
        data = res.json()
        for item in data[1:21]:
            if not isinstance(item, dict):
                continue
            jobs.append({
                'title': item.get('position', ''),
                'company': item.get('company', 'Remote'),
                'location': 'Remote / International',
                'type': 'remote',
                'apply_url': item.get('url', ''),
                'source': 'remoteok',
                'description': item.get('description', '')[:300],
                'image_url': item.get('company_logo'),
                'eligibility': None, 'benefits': None, 'how_to_apply': None,
                'documents_needed': None, 'salary': item.get('salary'),
                'experience': None, 'deadline': None,
            })
    except Exception as e:
        print(f'RemoteOK error: {e}')
    return jobs


def scrape_weworkremotely() -> list:
    print('Scraping WeWorkRemotely...')
    jobs = []
    try:
        items = parse_rss('https://weworkremotely.com/categories/remote-programming-jobs.rss')
        for item in items[:15]:
            title = item.find('title')
            link = item.find('link')
            if not title:
                continue
            url = get_rss_link(item)
            detail = fetch_page(url) if url else None
            image_url = get_og_image(detail) if detail else None
            time.sleep(0.5)
            jobs.append({
                'title': title.get_text().strip(),
                'company': 'See listing',
                'location': 'Remote / International',
                'type': 'remote',
                'apply_url': url,
                'source': 'weworkremotely',
                'description': '',
                'image_url': image_url,
                'eligibility': None, 'benefits': None, 'how_to_apply': None,
                'documents_needed': None, 'salary': None, 'experience': None, 'deadline': None,
            })
    except Exception as e:
        print(f'WeWorkRemotely error: {e}')
    return jobs


def scrape_jobs_googlenews() -> list:
    print('Scraping jobs via Google News...')
    jobs = []
    queries = [
        'graduate+trainee+application+Nigeria+2026',
        'job+recruitment+apply+now+Nigeria+2026',
        '"we+are+hiring"+Nigeria+2026',
        'Nigerian+Army+Police+recruitment+2026',
        'NNPC+CBN+GTBank+recruitment+2026',
    ]
    try:
        for query in queries:
            items = parse_rss(f'https://news.google.com/rss/search?q={query}&hl=en-NG&gl=NG&ceid=NG:en')
            for item in items[:4]:
                title = item.find('title')
                if not title:
                    continue
                url = get_rss_link(item)
                if not url:
                    continue
                jobs.append({
                    'title': title.get_text().strip(),
                    'company': 'See listing', 'location': 'Nigeria',
                    'type': 'full-time', 'apply_url': url, 'source': 'googlenews-jobs',
                    'description': '', 'image_url': None,
                    'eligibility': None, 'benefits': None, 'how_to_apply': None,
                    'documents_needed': None, 'salary': None, 'experience': None, 'deadline': None,
                })
    except Exception as e:
        print(f'Google News Jobs error: {e}')
    return jobs


# ─── SCHOLARSHIP SCRAPERS ─────────────────────────────────────

def scrape_scholarshipregion() -> list:
    print('Scraping ScholarshipRegion...')
    scholarships = []
    pages = [
        'https://www.scholarshipregion.com/category/nigerian-scholarships/',
        'https://www.scholarshipregion.com/category/africa-scholarships/',
        'https://www.scholarshipregion.com/',
    ]
    seen = set()
    try:
        for page_url in pages:
            soup = fetch_page(page_url)
            if not soup:
                continue
            titles = soup.select('h2 a, h3 a, .entry-title a')[:10]
            for t in titles:
                title = t.text.strip()
                link = t.get('href', '')
                if not link or link in seen or len(title) < 10:
                    continue
                seen.add(link)
                detail = fetch_page(link)
                image_url = get_og_image(detail) if detail else None
                time.sleep(0.8)
                scholarships.append({
                    'title': title, 'provider': 'Various', 'country': 'International',
                    'level': 'various', 'apply_url': link, 'source': 'scholarshipregion',
                    'description': '', 'image_url': image_url,
                    'eligibility': None, 'benefits': None, 'how_to_apply': None,
                    'documents_needed': None, 'amount': None, 'duration': None, 'deadline': None,
                })
    except Exception as e:
        print(f'ScholarshipRegion error: {e}')
    return scholarships


def scrape_scholars4dev() -> list:
    print('Scraping Scholars4Dev RSS...')
    scholarships = []
    feeds = [
        'https://www.scholars4dev.com/category/scholarships-for-africans/feed/',
        'https://www.scholars4dev.com/feed/',
    ]
    seen = set()
    try:
        for feed in feeds:
            items = parse_rss(feed)
            for item in items[:10]:
                title = item.find('title')
                if not title:
                    continue
                url = get_rss_link(item)
                if not url or url in seen:
                    continue
                seen.add(url)
                detail = fetch_page(url)
                image_url = get_og_image(detail) if detail else None
                time.sleep(0.8)
                scholarships.append({
                    'title': title.get_text().strip(),
                    'provider': 'Various', 'country': 'International',
                    'level': 'various', 'apply_url': url, 'source': 'scholars4dev',
                    'description': '', 'image_url': image_url,
                    'eligibility': None, 'benefits': None, 'how_to_apply': None,
                    'documents_needed': None, 'amount': None, 'duration': None, 'deadline': None,
                })
    except Exception as e:
        print(f'Scholars4Dev error: {e}')
    return scholarships


def scrape_opportunitydesk() -> list:
    print('Scraping OpportunityDesk RSS...')
    scholarships = []
    try:
        items = parse_rss('https://opportunitydesk.org/category/scholarships/feed/')
        seen = set()
        for item in items[:15]:
            title = item.find('title')
            if not title:
                continue
            url = get_rss_link(item)
            if not url or url in seen:
                continue
            seen.add(url)
            detail = fetch_page(url)
            image_url = get_og_image(detail) if detail else None
            time.sleep(0.8)
            scholarships.append({
                'title': title.get_text().strip(),
                'provider': 'Various', 'country': 'International',
                'level': 'various', 'apply_url': url, 'source': 'opportunitydesk',
                'description': '', 'image_url': image_url,
                'eligibility': None, 'benefits': None, 'how_to_apply': None,
                'documents_needed': None, 'amount': None, 'duration': None, 'deadline': None,
            })
    except Exception as e:
        print(f'OpportunityDesk error: {e}')
    return scholarships


def scrape_afterschoolafrica() -> list:
    print('Scraping AfterSchoolAfrica RSS...')
    scholarships = []
    try:
        items = parse_rss('https://www.afterschoolafrica.com/feed/')
        seen = set()
        for item in items[:15]:
            title = item.find('title')
            if not title:
                continue
            url = get_rss_link(item)
            if not url or url in seen:
                continue
            seen.add(url)
            detail = fetch_page(url)
            image_url = get_og_image(detail) if detail else None
            time.sleep(0.8)
            scholarships.append({
                'title': title.get_text().strip(),
                'provider': 'Various', 'country': 'International',
                'level': 'various', 'apply_url': url, 'source': 'afterschoolafrica',
                'description': '', 'image_url': image_url,
                'eligibility': None, 'benefits': None, 'how_to_apply': None,
                'documents_needed': None, 'amount': None, 'duration': None, 'deadline': None,
            })
    except Exception as e:
        print(f'AfterSchoolAfrica error: {e}')
    return scholarships


def scrape_scholarships_googlenews() -> list:
    print('Scraping scholarships via Google News...')
    scholarships = []
    queries = [
        'fully+funded+scholarships+Nigeria+2026',
        'PTDF+NNPC+scholarship+2026',
        'Commonwealth+Chevening+scholarship+Nigeria+2026',
        'MTN+scholarship+Nigeria+2026',
        'international+scholarships+Africa+masters+PhD+2026',
    ]
    try:
        for query in queries:
            items = parse_rss(f'https://news.google.com/rss/search?q={query}&hl=en-NG&gl=NG&ceid=NG:en')
            for item in items[:4]:
                title = item.find('title')
                if not title:
                    continue
                url = get_rss_link(item)
                if not url:
                    continue
                scholarships.append({
                    'title': title.get_text().strip(),
                    'provider': 'Various', 'country': 'International',
                    'level': 'various', 'description': '', 'apply_url': url,
                    'source': 'googlenews', 'image_url': None,
                    'eligibility': None, 'benefits': None, 'how_to_apply': None,
                    'documents_needed': None, 'amount': None, 'duration': None, 'deadline': None,
                })
    except Exception as e:
        print(f'Google News Scholarships error: {e}')
    return scholarships


# ─── SAVE TO SUPABASE ────────────────────────────────────────

def save_jobs(jobs: list):
    if not jobs:
        print('No jobs to save')
        return
    # shuffle so sources are mixed
    random.shuffle(jobs)
    saved = 0
    for job in jobs:
        try:
            supabase.table('jobs').insert(job).execute()
            saved += 1
        except Exception as e:
            print(f'  Skip "{job["title"][:50]}": {e}')
    print(f'Saved {saved}/{len(jobs)} jobs')


def save_scholarships(scholarships: list):
    if not scholarships:
        print('No scholarships to save')
        return
    # shuffle so sources are mixed
    random.shuffle(scholarships)
    saved = 0
    for s in scholarships:
        try:
            supabase.table('scholarships').insert(s).execute()
            saved += 1
        except Exception as e:
            print(f'  Skip "{s["title"][:50]}": {e}')
    print(f'Saved {saved}/{len(scholarships)} scholarships')


# ─── MAIN ────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f'\n🚀 Scraper started at {datetime.now()}\n')

    print('=' * 50)
    print('SCRAPING JOBS')
    print('=' * 50)
    all_jobs = (
        scrape_jobberman() +
        scrape_remoteok() +
        scrape_weworkremotely() +
        scrape_jobs_googlenews()
    )
    print(f'\nTotal jobs: {len(all_jobs)}')
    save_jobs(all_jobs)

    print('\n' + '=' * 50)
    print('SCRAPING SCHOLARSHIPS')
    print('=' * 50)
    all_scholarships = (
        scrape_scholarshipregion() +
        scrape_scholars4dev() +
        scrape_opportunitydesk() +
        scrape_afterschoolafrica() +
        scrape_scholarships_googlenews()
    )
    print(f'\nTotal scholarships: {len(all_scholarships)}')
    save_scholarships(all_scholarships)

    print(f'\n✅ Done at {datetime.now()}')