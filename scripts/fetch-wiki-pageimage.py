#!/usr/bin/env python3
"""
Use MediaWiki API to get the 'pageimage' for a Wikipedia article.
This is the officially designated main photo (infobox image) of the page.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

# id -> list of (lang, title) to try
TARGETS: dict[str, list[tuple[str, str]]] = {
    '3368': [('ko', '허민 (1976년)')],
    '3369': [('ko', '박관호 (1972년)'), ('ko', '박관호')],
    '3370': [('ko', '정몽진')],
    '3371': [('ko', '이해욱 (1968년)'), ('ko', '이해욱')],
    '3372': [('ko', '김재철 (1935년)')],
    '3374': [('ko', '김소희 (1983년)'), ('ko', '김소희')],
    '3375': [('ko', '정몽윤')],
    '3377': [('ko', '류진 (기업인)'), ('ko', '류진')],
    '3378': [('ko', '홍라영')],
    '3380': [('ko', '김창한')],
    '3381': [('ko', '이순형 (기업인)'), ('ko', '이순형')],
    '3382': [('ko', '구자용 (기업인)')],
    '3384': [('ko', '장세주')],
    '3386': [('ko', '송인준')],
    '3387': [('ko', '김슬아')],
    '3388': [('ko', '유상덕')],
    '3390': [('ko', '이상순')],
    '3393': [('ko', '김봉진 (기업인)')],
}


def query_pageimage(lang: str, title: str) -> str | None:
    # https://www.mediawiki.org/wiki/API:Page_info_in_search_results
    api = (
        f'https://{lang}.wikipedia.org/w/api.php?'
        f'action=query&prop=pageimages&format=json&pithumbsize=800&'
        f'titles={urllib.parse.quote(title)}&redirects=1'
    )
    try:
        req = urllib.request.Request(api, headers={
            'User-Agent': 'sajubuja-bot/1.0 (namu.d.park@gmail.com)',
        })
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f'    ERROR: {e}')
        return None
    pages = data.get('query', {}).get('pages', {})
    for pid, info in pages.items():
        if 'thumbnail' in info and info['thumbnail'].get('source'):
            return info['thumbnail']['source']
        if 'original' in info and info['original'].get('source'):
            return info['original']['source']
    return None


def main() -> int:
    # Merge with existing
    existing_path = Path('/tmp/photos_27.json')
    results = json.loads(existing_path.read_text()) if existing_path.exists() else {}

    for pid, candidates in TARGETS.items():
        if pid in results:
            continue
        found = None
        for lang, title in candidates:
            img = query_pageimage(lang, title)
            if img:
                found = (lang, title, img)
                break
            time.sleep(0.3)
        if found:
            lang, title, img = found
            results[pid] = img
            print(f'  ✓ {pid:5s} {title:30s} → {img[:90]}')
        else:
            print(f'  ✗ {pid:5s} {candidates[0][1]:30s} (no pageimage)')

    existing_path.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f'\nTotal: {len(results)} photos')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
