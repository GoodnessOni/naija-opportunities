import sys
from pathlib import Path
from unittest import mock

import pytest
import requests

sys.path.insert(0, str(Path(__file__).parent.parent))

import scraper  # noqa: E402
import sources  # noqa: E402
from enrich import clean_deadline, extract_json, pick_model  # noqa: E402
from http_client import FetchError, PoliteClient  # noqa: E402

RSS = """<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Acme: Backend Engineer</title><link>https://x.test/1</link><description>&lt;p&gt;Hi&lt;/p&gt;</description></item>
<item><title>Fulbright Scholarship 2027</title><link>https://x.test/2</link></item>
</channel></rss>"""


def fake_response(status, text='', headers=None):
    r = requests.Response()
    r.status_code = status
    r._content = text.encode()
    r.headers.update(headers or {})
    return r


def test_parse_feed_rss():
    items = sources.parse_feed(RSS)
    assert [i['link'] for i in items] == ['https://x.test/1', 'https://x.test/2']
    assert items[0]['summary'] == 'Hi'


def test_weworkremotely_splits_company():
    client = mock.Mock()
    client.get_text.return_value = RSS
    jobs = sources.scrape_weworkremotely(client)
    assert jobs[0]['company'] == 'Acme' and jobs[0]['title'] == 'Backend Engineer'
    assert set(sources.JOB_DEFAULTS) <= set(jobs[0])


def test_greenhouse_filters_to_nigeria():
    client = mock.Mock()
    client.get_json.return_value = {'jobs': [
        {'title': 'Ops', 'absolute_url': 'https://gh/1', 'location': {'name': 'Lagos, Nigeria'}},
        {'title': 'Sales', 'absolute_url': 'https://gh/2', 'location': {'name': 'London, UK'}},
    ]}
    jobs = sources.fetch_ats_board(client, 'greenhouse', 'acme', 'Acme')
    assert [j['apply_url'] for j in jobs] == ['https://gh/1']


def test_googlenews_filters_non_job_news():
    client = mock.Mock()
    client.get_text.return_value = """<rss><channel>
<item><title>NNPC announces updated petrol price</title><link>https://n/1</link></item>
<item><title>CBN begins recruitment, apply now</title><link>https://n/2</link></item>
</channel></rss>"""
    jobs = sources.scrape_jobs_googlenews(client, per_query=4)
    assert [j['apply_url'] for j in jobs] == ['https://n/2']


def test_client_backs_off_on_429_then_succeeds():
    session = mock.Mock(spec=requests.Session)
    session.headers = {}
    session.get.side_effect = [fake_response(429, headers={'Retry-After': '3'}), fake_response(200, 'ok')]
    sleeps = []
    c = PoliteClient(session=session, sleep=sleeps.append, respect_robots=False, min_delay=0)
    assert c.get('https://a.test/x').text == 'ok'
    assert 3 in sleeps and c.stats['retries'] == 1


def test_client_gives_up_after_retries():
    session = mock.Mock(spec=requests.Session)
    session.headers = {}
    session.get.return_value = fake_response(503)
    c = PoliteClient(session=session, sleep=lambda s: None, respect_robots=False, min_delay=0, max_retries=2)
    with pytest.raises(FetchError):
        c.get('https://a.test/x')
    assert session.get.call_count == 3


def test_client_respects_robots():
    session = mock.Mock(spec=requests.Session)
    session.headers = {}
    session.get.return_value = fake_response(200, 'User-agent: *\nDisallow: /private/')
    c = PoliteClient(session=session, sleep=lambda s: None, min_delay=0)
    with pytest.raises(FetchError):
        c.get('https://a.test/private/page')


def test_one_broken_source_does_not_stop_others():
    def ok(client):
        return [{'title': 'A', 'apply_url': 'https://a'}]

    def broken(client):
        raise RuntimeError('boom')

    def empty(client):
        return []

    items, report = scraper.run_sources({'ok': ok, 'broken': broken, 'empty': empty}, client=None)
    assert len(items) == 1
    assert report['broken']['error'].startswith('RuntimeError')
    assert report['empty']['found'] == 0


def test_dedupe():
    rows = [{'apply_url': 'https://a/1/'}, {'apply_url': 'https://a/1'}, {'apply_url': 'https://a/2'}]
    assert len(scraper.dedupe(rows)) == 2


def test_model_picking_skips_retired_model():
    available = ['openai/gpt-oss-20b', 'whisper-large-v3']
    assert pick_model(available) == 'openai/gpt-oss-20b'
    assert pick_model(available, 'llama-3.3-70b-versatile') == 'openai/gpt-oss-20b'
    assert pick_model(['whisper-large-v3']) is None


def test_json_and_deadline_cleaning():
    assert extract_json('```json\n{"a": 1}\n```') == {'a': 1}
    assert clean_deadline('2027-01-31') == '2027-01-31'
    assert clean_deadline('Varies') is None and clean_deadline('31 Jan') is None
