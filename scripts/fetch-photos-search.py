#!/usr/bin/env python3
"""Second pass — use Wikipedia search API to find the right page, then get image."""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

# Queries: person_id -> list of (lang, search_query, disambiguation_keyword)
# disambiguation_keyword must appear in the page description/extract to accept the match.
QUERIES: dict[str, list[tuple[str, str, str]]] = {
    '3368': [('ko', '허민 네오플', '네오플'), ('ko', '허민 원더홀딩스', '원더')],
    '3369': [('ko', '박관호 위메이드', '위메이드'), ('ko', '위메이드 창업자', '위메이드')],
    '3370': [('ko', '정몽진 KCC', 'KCC')],
    '3371': [('ko', '이해욱 DL그룹', 'DL'), ('ko', '이해욱 대림', '대림')],
    '3372': [('ko', '김재철 동원그룹', '동원'), ('ko', '김재철 동원산업', '동원')],
    '3374': [('ko', '김소희 스타일난다', '스타일난다'), ('ko', '김소희 3CE', '3CE')],
    '3375': [('ko', '정몽윤 현대해상', '현대해상')],
    '3377': [('ko', '류진 풍산그룹', '풍산'), ('ko', '류진 풍산', '풍산')],
    '3378': [('ko', '홍라영 리움미술관', '리움'), ('ko', '홍라영', '홍라영')],
    '3380': [('ko', '김창한 크래프톤', '크래프톤'), ('en', 'Kim Chang-han Krafton', 'Krafton')],
    '3381': [('ko', '이순형 세아', '세아')],
    '3382': [('ko', '구자용 E1', 'E1'), ('ko', '구자용 LS', 'LS')],
    '3384': [('ko', '장세주 동국제강', '동국')],
    '3386': [('ko', '송인준 IMM', 'IMM')],
    '3388': [('ko', '유상덕 스틱', '스틱'), ('ko', '유상덕 ST국제', 'ST')],
    '3390': [('ko', '이상순 이효리 남편', '이효리'), ('ko', '이상순 롤러코스터', '롤러코스터')],
    '3393': [('ko', '김봉진 우아한형제들', '우아한'), ('ko', '김봉진 배달의민족', '배달')],
    '3387': [('en', 'Sophie Kim Kurly', 'Kurly'), ('ko', '김슬아 컬리', '컬리')],  # re-try, current match was wrong
}


def api_get(lang: str, path: str) -> dict | None:
    url = f'https://{lang}.wikipedia.org{path}'
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'sajubuja-bot/1.0 (namu.d.park@gmail.com)'},
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception:
        return None


def search_and_fetch(lang: str, query: str, required_keyword: str) -> tuple[str, str] | None:
    """Returns (title, image_url) if a matching page with image is found."""
    # Step 1 — search
    search = api_get(
        lang,
        f'/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&srlimit=5&format=json',
    )
    if not search:
        return None
    hits = search.get('query', {}).get('search', [])
    for hit in hits:
        title = hit['title']
        # Step 2 — fetch summary for disambiguation check + image
        summary = api_get(lang, f'/api/rest_v1/page/summary/{urllib.parse.quote(title.replace(" ", "_"))}')
        if not summary:
            continue
        extract = summary.get('extract', '') + ' ' + summary.get('description', '')
        if required_keyword.lower() not in extract.lower():
            continue
        img = None
        if 'originalimage' in summary:
            img = summary['originalimage'].get('source')
        elif 'thumbnail' in summary:
            img = summary['thumbnail'].get('source')
        if img:
            return title, img
        time.sleep(0.2)
    return None


def main() -> int:
    # Load existing photos map
    existing_path = Path('/tmp/photos_27.json')
    results: dict[str, str] = json.loads(existing_path.read_text()) if existing_path.exists() else {}

    for pid, queries in QUERIES.items():
        found = None
        for lang, query, kw in queries:
            r = search_and_fetch(lang, query, kw)
            if r:
                found = r
                break
            time.sleep(0.4)
        if found:
            title, img = found
            results[pid] = img
            print(f'  ✓ {pid}  {title:30s}  →  {img[:70]}')
        else:
            print(f'  ✗ {pid}  still no match')

    existing_path.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f'\nTotal photos found: {len(results)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
