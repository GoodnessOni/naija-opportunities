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

load_dotenv(Path(__file__).parent.parent / '.env.local')

# connect to supabase
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

session = requests.Session()
session.headers.update(HEADERS)

# ─── DESCRIPTION FETCHER ─────────────────────────────────────

def fetch_description(url: str, selectors: list, max_chars: int = 500) -> str:
    """Visit a page and extract description using a list of CSS selectors to try."""
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        for selector in selectors:
            el = soup.select_one(selector)
            if el:
                text = el.get_text(separator=' ', strip=True)
                if len(text) > 50:
                    return text[:max_chars]
    except Exception as e:
        print(f'  Description fetch error for {url}: {e}')
    return ''


# ─── JOB SCRAPERS ────────────────────────────────────────────

def scrape_jobberman():
    print('Scraping Jobberman...')
    jobs = []
    try:
        url = 'https://www.jobberman.com/jobs'
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        links = soup.find_all('link', rel='prerender')

        for link in links:
            href = link.get('href', '')
            if '/listings/' not in href:
                continue

            slug = href.split('/listings/')[-1]
            parts = slug.rsplit('-', 1)[0]
            title = parts.replace('-', ' ').title()

            # fetch full description from listing page
            print(f'  Fetching description: {title}')
            description = fetch_description(href, [
                '.job-description',
                '.description',
                'div[class*="description"]',
                'section[class*="job"]',
                'article',
            ])
            time.sleep(0.5)  # be polite to the server

            jobs.append({
                'title': title,
                'company': 'See listing',
                'location': 'Nigeria',
                'type': 'full-time',
                'apply_url': href,
                'source': 'jobberman',
                'description': description,
                'deadline': None
            })

    except Exception as e:
        print(f'Jobberman error: {e}')
    return jobs


def scrape_myjobmag():
    print('Scraping MyJobMag...')
    jobs = []
    try:
        url = 'https://www.myjobmag.com/jobs-in-nigeria'
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        listings = soup.select('div.job-list-li')[:15]

        for item in listings:
            title_el = item.select_one('h3 a')
            company = item.select_one('.company')
            location = item.select_one('.location')

            if not title_el:
                continue

            job_url = 'https://www.myjobmag.com' + title_el['href']
            title = title_el.text.strip()

            print(f'  Fetching description: {title}')
            description = fetch_description(job_url, [
                '.job-description',
                '.description-body',
                'div[class*="description"]',
                '.content',
                'article',
            ])
            time.sleep(0.5)

            jobs.append({
                'title': title,
                'company': company.text.strip() if company else 'Unknown',
                'location': location.text.strip() if location else 'Nigeria',
                'type': 'full-time',
                'apply_url': job_url,
                'source': 'myjobmag',
                'description': description,
                'deadline': None
            })

    except Exception as e:
        print(f'MyJobMag error: {e}')
    return jobs


def scrape_ngcareers():
    print('Scraping NGCareers...')
    jobs = []
    try:
        url = 'https://ngcareers.com/jobs'
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        listings = soup.select('article.job-listing')[:15]

        for item in listings:
            title_el = item.select_one('h2 a, h3 a, .job-title a')
            company = item.select_one('.company, .employer')
            location = item.select_one('.location, .job-location')

            if not title_el:
                continue

            job_url = title_el.get('href', '')
            if not job_url.startswith('http'):
                job_url = 'https://ngcareers.com' + job_url
            title = title_el.text.strip()

            print(f'  Fetching description: {title}')
            description = fetch_description(job_url, [
                '.job-description',
                '.description',
                'div[class*="description"]',
                'article',
            ])
            time.sleep(0.5)

            jobs.append({
                'title': title,
                'company': company.text.strip() if company else 'Unknown',
                'location': location.text.strip() if location else 'Nigeria',
                'type': 'full-time',
                'apply_url': job_url,
                'source': 'ngcareers',
                'description': description,
                'deadline': None
            })

    except Exception as e:
        print(f'NGCareers error: {e}')
    return jobs


def scrape_jobs_googlenews():
    print('Scraping jobs via Google News...')
    jobs = []
    try:
        queries = [
            'Nigeria+job+vacancies+2026',
            'Nigerian+companies+hiring+2026',
            'graduate+trainee+Nigeria+2026',
            'NNPC+CBN+job+recruitment+2026',
        ]

        for query in queries:
            url = f'https://news.google.com/rss/search?q={query}&hl=en-NG&gl=NG&ceid=NG:en'
            res = session.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.find_all('item')[:5]

            for item in items:
                title = item.find('title')
                link = item.find('link')

                if not title:
                    continue

                link_url = ''
                if link:
                    link_url = link.get_text() or str(link.next_sibling or '').strip()

                if not link_url:
                    continue

                jobs.append({
                    'title': title.get_text().strip(),
                    'company': 'See listing',
                    'location': 'Nigeria',
                    'type': 'full-time',
                    'apply_url': link_url,
                    'source': 'googlenews-jobs',
                    'description': '',
                    'deadline': None
                })

    except Exception as e:
        print(f'Google News Jobs error: {e}')
    return jobs


# ─── SCHOLARSHIP SCRAPERS ─────────────────────────────────────

# ─── SCHOLARSHIP SCRAPERS ─────────────────────────────────────

def scrape_scholarshipregion():
    print('Scraping ScholarshipRegion...')
    scholarships = []
    try:
        pages = [
            'https://www.scholarshipregion.com/category/africa-scholarships/',
            'https://www.scholarshipregion.com/category/nigerian-scholarships/',
            'https://www.scholarshipregion.com/',
        ]
        seen = set()
        for page_url in pages:
            res = requests.get(page_url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(res.text, 'html.parser')
            titles = soup.select('h2 a, h3 a, .entry-title a')[:10]

            for title_el in titles:
                title = title_el.text.strip()
                link = title_el.get('href', '')
                if not link or link in seen or len(title) < 10:
                    continue
                seen.add(link)

                print(f'  Fetching: {title[:60]}')
                el = None
                try:
                    r = session.get(link, headers=HEADERS, timeout=10)
                    s = BeautifulSoup(r.text, 'html.parser')
                    el = s.select_one('.entry-content') or s.select_one('.post-content') or s.select_one('article')
                except:
                    pass
                description = el.get_text(separator=' ', strip=True)[:500] if el else ''
                time.sleep(0.5)

                scholarships.append({
                    'title': title,
                    'provider': 'Various',
                    'country': 'International',
                    'level': 'various',
                    'description': description,
                    'apply_url': link,
                    'source': 'scholarshipregion',
                    'deadline': None
                })
    except Exception as e:
        print(f'ScholarshipRegion error: {e}')
    return scholarships


def scrape_ngscholars():
    print('Scraping NGScholars...')
    scholarships = []
    try:
        url = 'https://www.ngscholars.net/'
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        titles = soup.select('h2 a, h3 a, .entry-title a')[:15]

        for title_el in titles:
            title = title_el.text.strip()
            link = title_el.get('href', '')
            if not link or len(title) < 10:
                continue

            print(f'  Fetching: {title[:60]}')
            el = None
            try:
                r = session.get(link, headers=HEADERS, timeout=10)
                s = BeautifulSoup(r.text, 'html.parser')
                el = s.select_one('.entry-content') or s.select_one('.post-content') or s.select_one('article')
            except:
                pass
            description = el.get_text(separator=' ', strip=True)[:500] if el else ''
            time.sleep(0.5)

            scholarships.append({
                'title': title,
                'provider': 'Various',
                'country': 'International',
                'level': 'various',
                'description': description,
                'apply_url': link,
                'source': 'ngscholars',
                'deadline': None
            })
    except Exception as e:
        print(f'NGScholars error: {e}')
    return scholarships


def scrape_scholarshipregion_rss():
    print('Scraping ScholarshipRegion RSS...')
    scholarships = []
    try:
        feeds = [
            'https://www.scholarshipregion.com/feed/',
            'https://www.scholarshipregion.com/category/nigerian-scholarships/feed/',
            'https://www.scholarshipregion.com/category/africa-scholarships/feed/',
        ]

        seen = set()
        for feed_url in feeds:
            res = session.get(feed_url, timeout=10)
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.find_all('item')[:10]
            print(f'  Found {len(items)} items in {feed_url}')

            for item in items:
                title = item.find('title')
                link = item.find('link')
                if not title:
                    continue

                link_url = str(link.next_sibling or '').strip() if link else ''
                if not link_url or link_url in seen:
                    continue
                seen.add(link_url)

                print(f'  Fetching: {title.get_text()[:60]}')
                el = None
                try:
                    r = session.get(link_url, timeout=10)
                    s = BeautifulSoup(r.text, 'html.parser')
                    el = s.select_one('.entry-content') or s.select_one('.post-content') or s.select_one('article')
                except:
                    pass
                description = el.get_text(separator=' ', strip=True)[:500] if el else ''
                time.sleep(0.5)

                scholarships.append({
                    'title': title.get_text().strip(),
                    'provider': 'Various',
                    'country': 'International',
                    'level': 'various',
                    'description': description,
                    'apply_url': link_url,
                    'source': 'scholarshipregion',
                    'deadline': None
                })

    except Exception as e:
        print(f'ScholarshipRegion RSS error: {e}')
    return scholarships

def scrape_scholarships_googlenews():
    print('Scraping scholarships via Google News...')
    scholarships = []
    try:
        queries = [
            'scholarships+for+Nigerian+students+2026',
            'fully+funded+scholarships+Nigeria+2026',
            'PTDF+NNPC+scholarship+2026',
            'Commonwealth+scholarship+Nigeria+2026',
            'MTN+scholarship+Nigeria+2026',
        ]

        for query in queries:
            url = f'https://news.google.com/rss/search?q={query}&hl=en-NG&gl=NG&ceid=NG:en'
            res = session.get(url, timeout=10)
            soup = BeautifulSoup(res.text, 'html.parser')
            items = soup.find_all('item')[:5]

            for item in items:
                title = item.find('title')
                link = item.find('link')
                if not title:
                    continue
                link_url = ''
                if link:
                    link_url = link.get_text() or str(link.next_sibling or '').strip()
                if not link_url:
                    continue

                scholarships.append({
                    'title': title.get_text().strip(),
                    'provider': 'Various',
                    'country': 'International',
                    'level': 'various',
                    'description': '',
                    'apply_url': link_url,
                    'source': 'googlenews',
                    'deadline': None
                })

    except Exception as e:
        print(f'Google News error: {e}')
    return scholarships


# ─── SAVE TO SUPABASE ────────────────────────────────────────

def save_jobs(jobs):
    if not jobs:
        print('No jobs to save')
        return
    saved = 0
    for job in jobs:
        try:
            supabase.table('jobs').insert(job).execute()
            saved += 1
        except Exception as e:
            print(f'  Skipping job "{job["title"]}": {e}')
    print(f'Saved {saved}/{len(jobs)} jobs')


def save_scholarships(scholarships):
    if not scholarships:
        print('No scholarships to save')
        return
    saved = 0
    for s in scholarships:
        try:
            supabase.table('scholarships').insert(s).execute()
            saved += 1
        except Exception as e:
            print(f'  Skipping "{s["title"]}": {e}')
    print(f'Saved {saved}/{len(scholarships)} scholarships')


# ─── MAIN ────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f'\n🚀 Scraper started at {datetime.now()}\n')

    # ── JOBS ──
    print('=' * 50)
    print('SCRAPING JOBS')
    print('=' * 50)
    all_jobs = (
        scrape_jobberman() +
        scrape_myjobmag() +
        scrape_ngcareers() +
        scrape_jobs_googlenews()
    )
    print(f'\nTotal jobs collected: {len(all_jobs)}')
    save_jobs(all_jobs)

# ── SCHOLARSHIPS ──
print('\n' + '=' * 50)
print('SCRAPING SCHOLARSHIPS')
print('=' * 50)
all_scholarships = (
    scrape_scholarshipregion() +
    scrape_scholarshipregion_rss()  +
    scrape_scholarships_googlenews()
)
print(f'\nTotal scholarships collected: {len(all_scholarships)}')
save_scholarships(all_scholarships)

print(f'\n✅ Done at {datetime.now()}')
