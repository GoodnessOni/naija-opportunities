"""NaijaOpportunities scraper.

Usage:
  python scraper.py              scrape + enrich + save to Supabase
  python scraper.py --dry-run    scrape (+ enrich if GROQ_API_KEY set), write results to
                                 scrape-output.json, never touch the database
  python scraper.py --no-ai      skip Groq enrichment (scholarships are then not saved)

Exit codes: 0 ok, 1 database/credential problem or nothing saved, 2 every source empty.
Each source runs in isolation; a source that errors or returns 0 items is reported as a
GitHub Actions warning and in the job summary, but does not stop the others.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from http_client import PoliteClient  # noqa: E402
import sources  # noqa: E402

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env.local')
except ImportError:
    pass

IN_ACTIONS = os.getenv('GITHUB_ACTIONS') == 'true'


def annotate(level: str, msg: str):
    """Print a GitHub Actions annotation (shows on the run page) or a plain line locally."""
    print(f'::{level}::{msg}' if IN_ACTIONS else f'[{level.upper()}] {msg}')


def run_sources(registry: dict, client: PoliteClient) -> tuple[list[dict], dict]:
    items, report = [], {}
    for name, fn in registry.items():
        print(f'Scraping {name}...')
        started = time.monotonic()
        try:
            got = fn(client) or []
            got = [g for g in got if g.get('apply_url') and g.get('title')]
            report[name] = {'found': len(got), 'error': None}
            if not got:
                annotate('warning', f'Source "{name}" returned 0 items - it may be blocked or its layout changed')
        except Exception as e:  # isolation: one broken source never stops the run
            report[name] = {'found': 0, 'error': f'{type(e).__name__}: {e}'[:300]}
            annotate('warning', f'Source "{name}" failed: {report[name]["error"]}')
            got = []
        report[name]['seconds'] = round(time.monotonic() - started, 1)
        print(f'  -> {len(got)} items')
        items += got
    return items, report


def dedupe(rows: list[dict]) -> list[dict]:
    seen, out = set(), []
    for r in rows:
        key = r['apply_url'].split('#')[0].rstrip('/')
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def enrich_scholarships(candidates: list[dict], client: PoliteClient, enricher, report: dict) -> list[dict]:
    out = []
    for c in candidates:
        src = report.setdefault(c['source'], {'found': 0, 'error': None})
        src.setdefault('enriched', 0)
        src.setdefault('skipped', 0)
        print(f'  Enriching: {c["title"][:60]}...')
        try:
            page = client.get_text(c['apply_url'])
            data = enricher.enrich(c['title'], page)
        except Exception as e:
            print(f'    ⚠️  enrichment failed: {str(e)[:200]}')
            src['skipped'] += 1
            continue
        if data.get('is_opportunity') is False or len(data.get('description') or '') < 100:
            print('    ⚠️  skipped - not a single opportunity or too little detail')
            src['skipped'] += 1
            continue
        out.append({
            'title': c['title'][:300],
            'provider': data.get('provider') or 'Various',
            'country': c.get('country', 'International'),
            'level': (data.get('level') or 'various').lower(),
            'apply_url': c['apply_url'],
            'source': c['source'],
            'image_url': sources.og_image(page),
            'description': data.get('description', ''),
            'eligibility': data.get('eligibility'),
            'benefits': data.get('benefits'),
            'how_to_apply': data.get('how_to_apply'),
            'documents_needed': data.get('documents_needed'),
            'amount': data.get('amount'),
            'duration': data.get('duration'),
            'deadline': data.get('deadline'),
        })
        src['enriched'] += 1
    return out


def write_summary(job_report: dict, sch_report: dict, totals: dict):
    lines = ['## Scraper run', '', '| Kind | Source | Found | Enriched | Error |', '|---|---|---|---|---|']
    for kind, rep in (('job', job_report), ('scholarship', sch_report)):
        for name, r in rep.items():
            lines.append(f'| {kind} | {name} | {r.get("found", 0)} | {r.get("enriched", "")} | {r.get("error") or ""} |')
    lines += ['', '| Total | Value |', '|---|---|'] + [f'| {k} | {v} |' for k, v in totals.items()]
    text = '\n'.join(lines)
    print('\n' + text)
    path = os.getenv('GITHUB_STEP_SUMMARY')
    if path:
        with open(path, 'a') as f:
            f.write(text + '\n')


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--no-ai', action='store_true')
    ap.add_argument('--output', default='scrape-output.json')
    args = ap.parse_args(argv)

    print(f'\n🚀 Scraper started at {datetime.now()}\n')
    storage = None
    if not args.dry_run:
        from storage import Storage, StorageError
        try:
            storage = Storage()
            storage.check_write_access()
        except StorageError as e:
            annotate('error', str(e))
            return 1

    client = PoliteClient(min_delay=float(os.getenv('SCRAPER_MIN_DELAY', '2')))

    print('=' * 50 + '\nJOBS\n' + '=' * 50)
    jobs, job_report = run_sources(sources.JOB_SOURCES, client)
    jobs = dedupe(jobs)

    print('\n' + '=' * 50 + '\nSCHOLARSHIPS\n' + '=' * 50)
    candidates, sch_report = run_sources(sources.SCHOLARSHIP_SOURCES, client)
    candidates = dedupe(candidates)

    new_candidates = candidates
    if storage:
        known = storage.existing_urls('scholarships', [c['apply_url'] for c in candidates])
        new_candidates = [c for c in candidates if c['apply_url'] not in known]
        print(f'{len(candidates) - len(new_candidates)} scholarships already in the database, '
              f'{len(new_candidates)} new to enrich')

    scholarships = []
    if args.no_ai:
        print('AI enrichment disabled (--no-ai); scholarships will not be saved.')
    else:
        from enrich import Enricher
        enricher = Enricher()
        if not enricher.ready:
            annotate('error', f'AI enrichment unavailable: {enricher.error}')
        else:
            print(f'Using Groq model {enricher.model}')
            scholarships = enrich_scholarships(new_candidates, client, enricher, sch_report)

    totals = {'jobs found': len(jobs), 'scholarship candidates': len(candidates),
              'new scholarships enriched': len(scholarships),
              'http requests': client.stats['requests'], 'http retries': client.stats['retries'],
              'blocked responses': client.stats['blocked'], 'robots.txt skips': client.stats['robots_skipped']}
    exit_code = 0

    if storage:
        saved_jobs, job_errors = storage.upsert('jobs', jobs)
        saved_sch, sch_errors = storage.upsert('scholarships', scholarships)
        for err in (job_errors + sch_errors)[:10]:
            print(f'  Skip {err}')
        totals['jobs saved'] = saved_jobs
        totals['scholarships saved'] = saved_sch
        if jobs and saved_jobs == 0:
            annotate('error', f'0 of {len(jobs)} jobs were saved - database writes are failing')
            exit_code = 1
    else:
        Path(args.output).write_text(json.dumps({'jobs': jobs, 'scholarships': scholarships,
                                                 'scholarship_candidates': candidates,
                                                 'report': {'jobs': job_report, 'scholarships': sch_report},
                                                 'totals': totals}, indent=2, default=str))
        print(f'Dry run: wrote {args.output}')

    write_summary(job_report, sch_report, totals)
    if not jobs and not candidates:
        annotate('error', 'Every source returned 0 items')
        exit_code = exit_code or 2
    print(f'\n✅ Done at {datetime.now()}')
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
