"""AI enrichment of scholarship pages via Groq.

Groq retires models from time to time (llama-3.3-70b-versatile disappeared in
Aug 2026 and silently broke every scholarship). So the model is picked at run
time: GROQ_MODEL env var if set and available, otherwise the first available
model from PREFERRED_MODELS.
"""
from __future__ import annotations

import json
import os
import re

from bs4 import BeautifulSoup

PREFERRED_MODELS = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
]

BAD_DEADLINES = {'', 'null', 'none', 'not specified', 'not available', 'varies', 'n/a', 'rolling'}


def pick_model(available: list[str], preferred_env: str | None = None) -> str | None:
    if preferred_env and preferred_env in available:
        return preferred_env
    for m in PREFERRED_MODELS:
        if m in available:
            return m
    return None


def page_text(page_html: str, limit: int = 4000) -> str:
    soup = BeautifulSoup(page_html, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form']):
        tag.decompose()
    el = soup.select_one('.entry-content, .post-content, article, main') or soup.body
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True))[:limit] if el else ''


def extract_json(text: str) -> dict:
    text = (text or '').strip()
    if '```' in text:
        m = re.search(r'```(?:json)?\s*(.*?)```', text, re.S)
        if m:
            text = m.group(1)
    m = re.search(r'\{.*\}', text, re.S)
    if not m:
        raise ValueError('no JSON object in model output')
    return json.loads(m.group(0))


def clean_deadline(value) -> str | None:
    if not value or not isinstance(value, str):
        return None
    v = value.strip()
    if v.lower() in BAD_DEADLINES:
        return None
    return v if re.fullmatch(r'\d{4}-\d{2}-\d{2}', v) else None


PROMPT = """Extract scholarship details from this webpage. Return ONLY valid JSON, no markdown.
Only use facts stated on the page. If something is not stated, use null. Do not invent details.

Title: {title}

Content: {content}

Return this exact JSON structure:
{{
  "is_opportunity": true,
  "description": "200-300 word description: purpose, who it is for, field of study, impact",
  "provider": "organisation offering it, or null",
  "eligibility": "eligibility requirements, or null",
  "benefits": "benefits, or null",
  "how_to_apply": "application steps, or null",
  "documents_needed": "required documents, or null",
  "amount": "amount e.g. $5,000 or Full tuition, or null",
  "duration": "duration, or null",
  "level": "undergraduate | masters | phd | various",
  "deadline": "YYYY-MM-DD or null"
}}
Set is_opportunity to false if the page is a news article or list, not a single scholarship/fellowship/grant."""


class Enricher:
    def __init__(self, api_key: str | None = None, model: str | None = None, client=None):
        self.client = client
        self.model = model
        self.error: str | None = None
        if self.client is None:
            key = api_key or os.getenv('GROQ_API_KEY')
            if not key:
                self.error = 'GROQ_API_KEY is not set'
                return
            import groq
            self.client = groq.Groq(api_key=key)
        if self.model is None:
            try:
                available = [m.id for m in self.client.models.list().data]
            except Exception as e:
                self.error = f'could not list Groq models: {e}'
                return
            self.model = pick_model(available, os.getenv('GROQ_MODEL'))
            if not self.model:
                self.error = f'none of {PREFERRED_MODELS} is available on this Groq key'

    @property
    def ready(self) -> bool:
        return self.client is not None and self.model is not None and self.error is None

    def enrich(self, title: str, page_html: str) -> dict:
        content = page_text(page_html)
        if len(content) < 100:
            return {}
        res = self.client.chat.completions.create(
            model=self.model,
            messages=[{'role': 'user', 'content': PROMPT.format(title=title, content=content[:3500])}],
            temperature=0.2,
            max_tokens=2000,
        )
        data = extract_json(res.choices[0].message.content)
        data['deadline'] = clean_deadline(data.get('deadline'))
        return data
