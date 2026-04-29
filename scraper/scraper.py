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
import google.generativeai as genai

load_dotenv(Path(__file__).parent.parent / '.env.local')

# connect to supabase
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# connect to gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
gemini = genai.GenerativeModel('gemini-2.0-flash')

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


# ─── GEMINI EXTRACTORS ───────────────────────────────────────

def extract_scholarship_data(raw_text: str, title: str) -> dict:
    try:
        prompt = f"""
You are extracting scholarship information from a webpage.
Return ONLY a valid JSON object with no markdown, no backticks, no explanation.

Scholarship title: {title}

Raw page text:
{raw_text[:3000]}

Extract and return this exact JSON structure:
{{
  "description": "2-3 sentence summary of what this scholarship is for",
  "eligibility": "bullet points of eligibility requirements e.g nationality, CGPA, year of study, course",
  "benefits": "what the scholar gets e.g amount per year, duration, accommodation, laptop, mentorship",
  "how_to_apply": "step by step application process",
  "documents_needed": "list of required documents",
  "amount": "monetary value if mentioned e.g $10,000 or full tuition",
  "duration": "how long the scholarship lasts e.g 1 year, full degree",
  "deadline": "application deadline date if mentioned, else null"
}}

If information is not available for a field, use null.
"""
        response = gemini.generate_content(prompt)
        text = response.text.strip().replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        print(f'  Gemini scholarship error: {e}')
        return {}


def extract_job_data(raw_text: str, title: str) -> dict:
    try:
        prompt = f"""
You are extracting job information from a webpage.
Return ONLY a valid JSON object with no markdown, no backticks, no explanation.

Job title: {title}

Raw page text:
{raw_text[:3000]}

Extract and return this exact JSON structure:
{{
  "description": "2-3 sentence summary of what this role is about",
  "eligibility": "requirements e.g degree, years of experience, skills needed",
  "benefits": "what the employee gets e.g salary range, health insurance, pension",
  "how_to_apply": "step by step application process",
  "documents_needed": "list of required documents e.g CV, cover letter, certificates",
  "salary": "salary or pay range if mentioned",
  "experience": "years of experience required if mentioned",
  "deadline": "application deadline if mentioned, else null"
}}

If information is not available for a field, use null.
"""
        response = gemini.generate_content(prompt)
        text = response.text.strip().replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        print(f'  Gemini job error: {e}')
        return {}


# ─── PAGE FETCHER ─────────────────────────────────────────────

def fetch_page_text(url: str) -> str:
    try:
        res = session.get(url, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()
        el = (soup.select_one('.entry-content') or
              soup.select_one('.post-content') or
              soup.select_one('article') or
              soup.select_one('main') or
              soup.body)
        return el.get_text(separator=' ', strip=True)[:4000] if el else ''
    except Exception as e:
        print(f'  Page fetch error: {e}')
        return ''


# ─── JOB SCRAPERS ────────────────────────────────────────────

def scrape_jobberman():
    print('Scraping Jobberman...')
    jobs = []
    try:
        url = 'https://www.jobberman.com/jobs'
        res = session.get(url, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        links = soup.find_all('link', rel='prerender')

        for link in links:
            href = link.get('href', '')
            if '/listings/' not in href:
                continue

            slug = href.split('/listings/')[-1]
            parts = slug.rsplit('-', 1)[0]
            title = parts.replace('-', ' ').title()

            print(f'  Processing: {title[:60]}')
            raw_text = fetch_page_text(href)
            structured = extract_job_data(raw_text, title) if raw_text else {}
            time.sleep(1)

            jobs.append({
                'title': title,
                'company': 'See listing',
                'location': 'Nigeria',
                'type': 'full-time',
                'apply_url': href,
                'source': 'jobberman',
                'description': structured.get('description') or '',
                'eligibility': structured.get('eligibility'),
                'benefits': structured.get('benefits'),
                'how_to_apply': structured.get('how_to_apply'),
                'documents_needed': structured.get('documents_needed'),
                'salary': structured.get('salary'),
                'experience': structured.get('experience'),
                'deadline': structured.get('deadline'),
            })

    except Exception as e:
        print(f'Jobberman error: {e}')
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

                jobs.append({
                    'title': title.get_text().strip(),
                    'company': 'See listing',
                    'location': 'Nigeria',
                    'type': 'full-time',
                    'apply_url': link_url,
                    'source': 'googlenews-jobs',
                    'description': '',
                    'eligibility': None,
                    'benefits': None,
                    'how_to_apply': None,
                    'documents_needed': None,
                    'salary': None,
                    'experience': None,
                    'deadline': None,
                })

    except Exception as e:
        print(f'Google News Jobs error: {e}')
    return jobs


# ─── SCHOLARSHIP SCRAPERS ─────────────────────────────────────

def scrape_scholarshipregion():
    print('Scraping ScholarshipRegion...')
    scholarships = []
    try:
        pages = [
            'https://www.scholarshipregion.com/category/nigerian-scholarships/',
            'https://www.scholarshipregion.com/category/africa-scholarships/',
            'https://www.scholarshipregion.com/',
        ]
        seen = set()

        for page_url in pages:
            res = session.get(page_url, timeout=10)
            soup = BeautifulSoup(res.text, 'html.parser')
            titles = soup.select('h2 a, h3 a, .entry-title a')[:10]
            print(f'  Found {len(titles)} titles on {page_url}')

            for title_el in titles:
                title = title_el.text.strip()
                link = title_el.get('href', '')
                if not link or link in seen or len(title) < 10:
                    continue
                seen.add(link)

                print(f'  Processing: {title[:60]}')
                raw_text = fetch_page_text(link)
                structured = extract_scholarship_data(raw_text, title) if raw_text else {}
                time.sleep(1)

                scholarships.append({
                    'title': title,
                    'provider': 'Various',
                    'country': 'International',
                    'level': 'various',
                    'apply_url': link,
                    'source': 'scholarshipregion',
                    'description': structured.get('description') or '',
                    'eligibility': structured.get('eligibility'),
                    'benefits': structured.get('benefits'),
                    'how_to_apply': structured.get('how_to_apply'),
                    'documents_needed': structured.get('documents_needed'),
                    'amount': structured.get('amount'),
                    'duration': structured.get('duration'),
                    'deadline': structured.get('deadline'),
                })

    except Exception as e:
        print(f'ScholarshipRegion error: {e}')
    return scholarships


def scrape_scholarshipregion_rss():
    print('Scraping ScholarshipRegion RSS...')
    scholarships = []
    try:
        res = session.get('https://www.scholarshipregion.com/feed/', timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        items = soup.find_all('item')[:10]
        print(f'  Found {len(items)} items in RSS')
        seen = set()

        for item in items:
            title = item.find('title')
            link = item.find('link')
            if not title:
                continue
            link_url = str(link.next_sibling or '').strip() if link else ''
            if not link_url or link_url in seen:
                continue
            seen.add(link_url)

            title_text = title.get_text().strip()
            print(f'  Processing: {title_text[:60]}')
            raw_text = fetch_page_text(link_url)
            structured = extract_scholarship_data(raw_text, title_text) if raw_text else {}
            time.sleep(1)

            scholarships.append({
                'title': title_text,
                'provider': 'Various',
                'country': 'International',
                'level': 'various',
                'apply_url': link_url,
                'source': 'scholarshipregion',
                'description': structured.get('description') or '',
                'eligibility': structured.get('eligibility'),
                'benefits': structured.get('benefits'),
                'how_to_apply': structured.get('how_to_apply'),
                'documents_needed': structured.get('documents_needed'),
                'amount': structured.get('amount'),
                'duration': structured.get('duration'),
                'deadline': structured.get('deadline'),
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
                    'eligibility': None,
                    'benefits': None,
                    'how_to_apply': None,
                    'documents_needed': None,
                    'amount': None,
                    'duration': None,
                    'deadline': None,
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
            print(f'  Skipping job "{job["title"][:50]}": {e}')
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
            print(f'  Skipping "{s["title"][:50]}": {e}')
    print(f'Saved {saved}/{len(scholarships)} scholarships')


# ─── MAIN ────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f'\n🚀 Scraper started at {datetime.now()}\n')

    print('=' * 50)
    print('SCRAPING JOBS')
    print('=' * 50)
    all_jobs = (
        scrape_jobberman() +
        scrape_jobs_googlenews()
    )
    print(f'\nTotal jobs collected: {len(all_jobs)}')
    save_jobs(all_jobs)

    print('\n' + '=' * 50)
    print('SCRAPING SCHOLARSHIPS')
    print('=' * 50)
    all_scholarships = (
        scrape_scholarshipregion() +
        scrape_scholarshipregion_rss() +
        scrape_scholarships_googlenews()
    )
    print(f'\nTotal scholarships collected: {len(all_scholarships)}')
    save_scholarships(all_scholarships)

    print(f'\n✅ Done at {datetime.now()}')
