"""Supabase storage. Created lazily so tests and --dry-run never need secrets."""
from __future__ import annotations

import os


class StorageError(Exception):
    pass


def service_key() -> str | None:
    # SUPABASE_SECRET_KEY is the name used for Supabase's newer sb_secret_ keys.
    return os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')


class Storage:
    def __init__(self, client=None):
        if client is None:
            url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
            key = service_key()
            missing = [n for n, v in (('NEXT_PUBLIC_SUPABASE_URL', url),
                                      ('SUPABASE_SERVICE_ROLE_KEY', key)) if not v]
            if missing:
                raise StorageError(f'missing secret(s): {", ".join(missing)}')
            from supabase import create_client
            client = create_client(url, key)
        self.client = client

    def check_write_access(self):
        """Fail fast with a clear message instead of 'Skip' x 84 when the key is wrong."""
        try:
            self.client.table('jobs').select('id').limit(1).execute()
        except Exception as e:
            raise StorageError(
                'Supabase rejected the key (check the SUPABASE_SERVICE_ROLE_KEY GitHub secret '
                f'matches the project in NEXT_PUBLIC_SUPABASE_URL): {e}') from e

    def existing_urls(self, table: str, urls: list[str]) -> set[str]:
        found: set[str] = set()
        urls = [u for u in urls if u]
        for i in range(0, len(urls), 100):
            chunk = urls[i:i + 100]
            res = self.client.table(table).select('apply_url').in_('apply_url', chunk).execute()
            found.update(r['apply_url'] for r in (res.data or []))
        return found

    def upsert(self, table: str, rows: list[dict]) -> tuple[int, list[str]]:
        saved, errors = 0, []
        for i in range(0, len(rows), 50):
            chunk = rows[i:i + 50]
            try:
                self.client.table(table).upsert(chunk, on_conflict='apply_url').execute()
                saved += len(chunk)
            except Exception:
                for row in chunk:  # retry row by row so one bad row does not drop 49 good ones
                    try:
                        self.client.table(table).upsert(row, on_conflict='apply_url').execute()
                        saved += 1
                    except Exception as e:
                        errors.append(f'{row.get("title", "")[:50]}: {e}')
        return saved, errors
