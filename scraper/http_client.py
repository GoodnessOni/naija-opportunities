"""Polite HTTP client used by every scraper source.

- realistic browser headers, one shared session (keeps cookies)
- per-host minimum delay between requests
- robots.txt check (cached per host)
- retries with exponential backoff on 429 / 403 / 5xx, honouring Retry-After
- small on-disk cache is not needed: the run is stateless, dedupe happens
  against the database instead (see storage.existing_urls)
"""
from __future__ import annotations

import random
import time
from urllib import robotparser
from urllib.parse import urlparse

import requests

DEFAULT_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
    'Accept-Language': 'en-NG,en;q=0.9',
}

RETRY_STATUSES = {403, 429, 500, 502, 503, 504}


class FetchError(Exception):
    """Raised when a URL cannot be fetched after retries."""


class PoliteClient:
    def __init__(self, min_delay: float = 2.0, max_retries: int = 3, timeout: float = 20,
                 backoff_base: float = 5.0, respect_robots: bool = True,
                 session: requests.Session | None = None, sleep=time.sleep):
        self.session = session or requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self.min_delay = min_delay
        self.max_retries = max_retries
        self.timeout = timeout
        self.backoff_base = backoff_base
        self.respect_robots = respect_robots
        self._sleep = sleep
        self._last_hit: dict[str, float] = {}
        self._robots: dict[str, robotparser.RobotFileParser | None] = {}
        self.stats = {'requests': 0, 'retries': 0, 'blocked': 0, 'robots_skipped': 0}

    # ── robots.txt ──────────────────────────────────────────
    def allowed(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        p = urlparse(url)
        base = f'{p.scheme}://{p.netloc}'
        if base not in self._robots:
            rp = robotparser.RobotFileParser()
            try:
                res = self.session.get(base + '/robots.txt', timeout=self.timeout)
                if res.status_code >= 400:
                    rp = None  # no robots.txt -> allowed
                else:
                    rp.parse(res.text.splitlines())
            except requests.RequestException:
                rp = None
            self._robots[base] = rp
        rp = self._robots[base]
        return True if rp is None else rp.can_fetch(DEFAULT_HEADERS['User-Agent'], url)

    # ── rate limit ──────────────────────────────────────────
    def _wait_for_host(self, url: str):
        host = urlparse(url).netloc
        last = self._last_hit.get(host)
        if last is not None:
            gap = time.monotonic() - last
            if gap < self.min_delay:
                self._sleep(self.min_delay - gap + random.uniform(0, 0.5))
        self._last_hit[host] = time.monotonic()

    # ── fetch ───────────────────────────────────────────────
    def get(self, url: str, robots: bool = True, **kwargs) -> requests.Response:
        """robots=False only for documented public APIs meant for programmatic use."""
        if robots and not self.allowed(url):
            self.stats['robots_skipped'] += 1
            raise FetchError(f'robots.txt disallows {url}')
        last_err = None
        for attempt in range(self.max_retries + 1):
            self._wait_for_host(url)
            self.stats['requests'] += 1
            try:
                res = self.session.get(url, timeout=self.timeout, **kwargs)
            except requests.RequestException as e:
                last_err = f'{type(e).__name__}: {e}'
            else:
                if res.status_code < 400 and res.status_code != 202:
                    return res
                if res.status_code == 202:
                    # bot-challenge pages (e.g. some WAFs) answer 202 with an empty shell
                    self.stats['blocked'] += 1
                    raise FetchError(f'HTTP 202 bot challenge from {url}')
                last_err = f'HTTP {res.status_code}'
                if res.status_code not in RETRY_STATUSES:
                    raise FetchError(f'{last_err} for {url}')
                if res.status_code in (403, 429):
                    self.stats['blocked'] += 1
                retry_after = res.headers.get('Retry-After', '')
                if retry_after.isdigit():
                    delay = min(int(retry_after), 120)
                    if attempt < self.max_retries:
                        self.stats['retries'] += 1
                        self._sleep(delay)
                    continue
            if attempt < self.max_retries:
                self.stats['retries'] += 1
                self._sleep(self.backoff_base * (2 ** attempt) + random.uniform(0, 1))
        raise FetchError(f'{last_err} for {url} after {self.max_retries + 1} attempts')

    def get_json(self, url: str, **kwargs):
        return self.get(url, **kwargs).json()

    def get_text(self, url: str, **kwargs) -> str:
        return self.get(url, **kwargs).text
