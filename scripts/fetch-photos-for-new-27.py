#!/usr/bin/env python3
"""
Fetch Wikipedia page image URLs for a list of people.

Uses the Wikipedia REST summary API:
  https://ko.wikipedia.org/api/rest_v1/page/summary/<title>

Falls back to the English page if Korean fails. Writes a JSON map {id: photoUrl}
to /tmp/photos_27.json.

We use the Wikipedia `originalimage` URL (upload.wikimedia.org). The app
already proxies Wikimedia through /api/wiki-image so these render fine.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

# Manually curated Wikipedia titles. Some need disambiguation to avoid landing
# on the wrong person (e.g. 김소희 — many homonyms; 3CE founder is at a specific slug).
TITLES: dict[str, list[tuple[str, str]]] = {
    # id: [(lang, title), ...] — tried in order
    '3368': [('ko', '허민_(기업인)'), ('ko', '허민_(게임 개발자)')],
    '3369': [('ko', '박관호_(1972년)'), ('ko', '박관호')],
    '3370': [('ko', '정몽진')],
    '3371': [('ko', '이해욱')],
    '3372': [('ko', '김재철_(1935년)'), ('ko', '김재철_(기업인)')],
    '3373': [('ko', '정몽규')],
    '3374': [('ko', '김소희_(1983년)'), ('ko', '김소희_(기업인)')],
    '3375': [('ko', '정몽윤')],
    '3376': [('ko', '송병준_(기업인)'), ('ko', '송병준')],
    '3377': [('ko', '류진_(기업인)'), ('ko', '류진')],
    '3378': [('ko', '홍라영')],
    '3379': [('ko', '강호동'), ('en', 'Kang_Ho-dong')],
    '3380': [('ko', '김창한')],
    '3381': [('ko', '이순형_(기업인)'), ('ko', '이순형')],
    '3382': [('ko', '구자용_(기업인)'), ('ko', '구자용')],
    '3383': [('ko', '박삼구')],
    '3384': [('ko', '장세주')],
    '3385': [('ko', '신동엽_(방송인)'), ('en', 'Shin_Dong-yup_(entertainer)')],
    '3386': [('ko', '송인준')],
    '3387': [('ko', '김슬아'), ('en', 'Sophie_Kim')],
    '3388': [('ko', '유상덕')],
    '3389': [('ko', '이경규'), ('en', 'Lee_Kyung-kyu')],
    '3390': [('ko', '이상순')],
    '3391': [('ko', '이사배')],
    '3392': [('ko', '김종국_(가수)'), ('en', 'Kim_Jong-kook')],
    '3393': [('ko', '김봉진_(기업인)'), ('ko', '김봉진')],
}


def fetch_summary(lang: str, title: str) -> dict | None:
    url = f'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}'
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'sajubuja-bot/1.0 (namu.d.park@gmail.com)'},
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        return None


def get_original_image(summary: dict) -> str | None:
    if not summary:
        return None
    if 'originalimage' in summary and summary['originalimage'].get('source'):
        return summary['originalimage']['source']
    if 'thumbnail' in summary and summary['thumbnail'].get('source'):
        return summary['thumbnail']['source']
    return None


def main() -> int:
    results: dict[str, str] = {}
    failed: list[str] = []

    for pid, candidates in TITLES.items():
        photo_url = None
        chosen = None
        for lang, title in candidates:
            summary = fetch_summary(lang, title)
            img = get_original_image(summary)
            if img:
                photo_url = img
                chosen = f'{lang}:{title}'
                break
            time.sleep(0.3)
        if photo_url:
            results[pid] = photo_url
            print(f'  ✓ {pid}  {chosen}  →  {photo_url[:80]}')
        else:
            failed.append(pid)
            print(f'  ✗ {pid}  no image found')

    Path('/tmp/photos_27.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f'\nFound: {len(results)} / {len(TITLES)}')
    print(f'Failed: {failed}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
