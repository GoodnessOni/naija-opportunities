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
load_dotenv(Path(__file__).parent.parent / '.env.local')

print('URL:', os.getenv('NEXT_PUBLIC_SUPABASE_URL'))
print('KEY:', os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'))

# connect to supabase
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

# ─── JOBS SCRAPER ───────────────────────────────────────────

def scrape_jobberman():
    print('Scraping Jobberman...')
    jobs = []
    try:
        url = 'https://www.jobberman.com/jobs'
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')

        # extract job links from prerender tags in <head>
        links = soup.find_all('link', rel='prerender')

        for link in links:
            href = link.get('href', '')
            if '/listings/' not in href:
                continue

            # build a clean title from the URL slug
            slug = href.split('/listings/')[-1]
            # remove the short code at the end (e.g. -7jwngm)
            parts = slug.rsplit('-', 1)[0]
            title = parts.replace('-', ' ').title()

            jobs.append({
                'title': title,
                'company': 'See listing',
                'location': 'Nigeria',
                'type': 'full-time',
                'apply_url': href,
                'source': 'jobberman',
                'description': '',
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
        listings = soup.select('div.job-list-li')[:20]

        for item in listings:
            title = item.select_one('h3 a')
            company = item.select_one('.company')
            location = item.select_one('.location')

            if title:
                jobs.append({
                    'title': title.text.strip(),
                    'company': company.text.strip() if company else 'Unknown',
                    'location': location.text.strip() if location else 'Nigeria',
                    'type': 'full-time',
                    'apply_url': 'https://www.myjobmag.com' + title['href'],
                    'source': 'myjobmag',
                    'description': '',
                    'deadline': None
                })
    except Exception as e:
        print(f'MyJobMag error: {e}')
    return jobs


# ─── SCHOLARSHIPS SCRAPER ────────────────────────────────────

def scrape_scholarships_googlenews():
    print('Scraping scholarships via Google News...')
    scholarships = []
    try:
        queries = [
            'scholarships+for+Nigerian+students+2026',
            'international+scholarships+Africa+2026',
            'fully+funded+scholarships+Nigeria+2026'
        ]

        for query in queries:
            url = f'https://news.google.com/rss/search?q={query}&hl=en-NG&gl=NG&ceid=NG:en'
            res = requests.get(url, headers=HEADERS, timeout=10)
            
            # use html.parser instead of xml
            soup = BeautifulSoup(res.text, 'html.parser')

            items = soup.find_all('item')[:7]
            print(f'Found {len(items)} items for query: {query}')

            for item in items:
                title = item.find('title')
                link = item.find('link')

                if not title:
                    continue

                # get link text differently
                link_url = ''
                if link:
                    link_url = link.get_text() or ''
                    if not link_url:
                        link_url = str(link.next_sibling or '').strip()

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
            print(f'Skipping job "{job["title"]}": {e}')
    print(f'Saved {saved}/{len(jobs)} jobs')

def save_scholarships(scholarships):
    if not scholarships:
        print('No scholarships to save')
        return
    saved = 0
    for scholarship in scholarships:
        try:
            supabase.table('scholarships').insert(scholarship).execute()
            saved += 1
        except Exception as e:
            print(f'Skipping "{scholarship["title"]}": {e}')
    print(f'Saved {saved}/{len(scholarships)} scholarships')

# ─── MAIN ────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f'Scraper started at {datetime.now()}')

    # scrape jobs
    all_jobs = scrape_jobberman() + scrape_myjobmag()
    print('Jobs collected:', len(all_jobs))
    print('Sample:', all_jobs[0] if all_jobs else 'none')

    save_jobs(all_jobs)

   
    # scrape scholarships
    all_scholarships = scrape_scholarships_googlenews()
    save_scholarships(all_scholarships)
    print('Done!')