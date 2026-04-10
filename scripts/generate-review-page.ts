/**
 * Generates an interactive review page for the REVIEW-flagged candidates
 * from the Serper results. Output: public/photos-review.html
 *
 * Features:
 *  - Only shows entries where autoApply=false (needs eyeball)
 *  - Shows top 6 candidates per person as clickable thumbnails
 *  - User clicks a thumbnail to pick it; click again to deselect
 *  - "Skip" button to explicitly reject this person
 *  - Choices persist in localStorage so you can close/resume
 *  - Progress bar and keyboard shortcuts (1-6 = pick candidate N, s = skip, n = next)
 *  - Export button builds a JSON of approved photos to paste back to Claude
 *
 * Usage:
 *   npx tsx scripts/generate-review-page.ts
 */

import * as fs from 'fs';

const RESULTS_PATH = '/Users/namu_1/sajubuja/scripts/photos-serper-results.json';
const OUTPUT_PATH = '/Users/namu_1/sajubuja/public/photos-review.html';

interface RankedImage {
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  pageDomain?: string;
  imageDomain?: string;
  score?: number;
  imageWidth?: number;
  imageHeight?: number;
  link?: string;
}

interface ResultEntry {
  name: string;
  id?: string;
  nationality?: string;
  source?: string;
  status: string;
  query?: string;
  candidates?: RankedImage[];
  bestIndex?: number;
  autoApply?: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function main() {
  const results: Record<string, ResultEntry> = JSON.parse(
    fs.readFileSync(RESULTS_PATH, 'utf8')
  );

  // Only include REVIEW entries (autoApply === false AND status === matched)
  const reviewItems = Object.values(results).filter(
    (r) => r.status === 'matched' && r.autoApply !== true && (r.candidates?.length ?? 0) > 0
  );

  // Embed the items as JSON so client JS can iterate them
  const dataJson = JSON.stringify(
    reviewItems.map((r) => ({
      name: r.name,
      nationality: r.nationality || '',
      source: r.source || '',
      query: r.query || '',
      candidates: (r.candidates || []).slice(0, 6).map((c) => ({
        thumb: c.thumbnailUrl || c.imageUrl || '',
        full: c.imageUrl || '',
        title: c.title || '',
        domain: c.pageDomain || c.imageDomain || '',
        score: c.score || 0,
        width: c.imageWidth || 0,
        height: c.imageHeight || 0,
        link: c.link || '',
      })),
    })),
    null,
    2
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Photo review — ${reviewItems.length} to review</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, system-ui, sans-serif;
    background: #f5f5f7;
    margin: 0;
    padding: 0;
    color: #1d1d1f;
  }
  header {
    position: sticky; top: 0; z-index: 10;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    padding: 12px 20px;
    display: flex; align-items: center; gap: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  header h1 { margin: 0; font-size: 16px; font-weight: 600; }
  .progress {
    flex: 1;
    display: flex; align-items: center; gap: 10px;
  }
  .progress-bar {
    flex: 1; height: 8px; background: #e8e8e8; border-radius: 4px; overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%; background: #0071e3; transition: width 0.2s;
  }
  .stats { font-size: 13px; color: #666; white-space: nowrap; }
  .btn {
    background: #0071e3; color: white; border: none;
    padding: 8px 16px; border-radius: 6px; font-size: 13px;
    font-weight: 500; cursor: pointer;
  }
  .btn:hover { background: #0077ed; }
  .btn.secondary { background: #e8e8e8; color: #1d1d1f; }
  .btn.secondary:hover { background: #dadada; }
  .btn.danger { background: #ff3b30; color: white; }
  .btn.danger:hover { background: #ff453a; }
  main { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
  .person {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .person.decided { opacity: 0.4; }
  .person h2 { margin: 0 0 4px 0; font-size: 20px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 14px; }
  .badges { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .badge {
    font-size: 11px; padding: 2px 8px; border-radius: 4px;
    background: #f0f0f0; color: #555;
  }
  .badge.decision-approved {
    background: #34c759; color: white; font-weight: 600;
  }
  .badge.decision-rejected {
    background: #ff3b30; color: white; font-weight: 600;
  }
  .candidates { display: flex; gap: 12px; flex-wrap: wrap; }
  .candidate {
    width: 160px; cursor: pointer;
    border: 3px solid transparent; border-radius: 8px;
    padding: 6px; transition: all 0.1s;
    background: #f9f9f9;
  }
  .candidate:hover { border-color: #ccc; background: #f0f0f0; }
  .candidate.selected { border-color: #34c759; background: #e8f5e9; }
  .candidate img {
    width: 100%; height: 140px; object-fit: cover;
    display: block; border-radius: 4px;
    background: #eee;
  }
  .candidate .num {
    position: absolute;
    background: rgba(0,0,0,0.6); color: white;
    font-size: 11px; padding: 2px 6px; border-radius: 4px;
    margin: 4px; font-weight: 600;
  }
  .candidate .domain {
    font-size: 11px; color: #555; margin-top: 6px;
    word-break: break-all; line-height: 1.3;
  }
  .candidate .title {
    font-size: 10px; color: #888; margin-top: 2px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .actions { margin-top: 14px; display: flex; gap: 8px; }
  .help {
    position: fixed; bottom: 20px; right: 20px;
    background: white; padding: 10px 14px; border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    font-size: 12px; color: #555;
  }
  .help kbd {
    background: #f0f0f0; padding: 1px 5px; border-radius: 3px;
    border: 1px solid #ddd; font-family: ui-monospace, monospace;
    font-size: 11px;
  }
  #export-modal {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); z-index: 100;
    align-items: center; justify-content: center;
  }
  #export-modal.open { display: flex; }
  .modal-inner {
    background: white; border-radius: 12px; padding: 20px;
    max-width: 600px; width: 90%; max-height: 80vh; overflow: auto;
  }
  .modal-inner h2 { margin-top: 0; }
  textarea {
    width: 100%; height: 300px; font-family: ui-monospace, monospace;
    font-size: 11px; border: 1px solid #ddd; border-radius: 6px; padding: 10px;
  }
</style>
</head>
<body>
<header>
  <h1>Photo review</h1>
  <div class="progress">
    <div class="progress-bar"><div class="progress-bar-fill" id="progress-fill"></div></div>
    <div class="stats" id="stats">0 / ${reviewItems.length} reviewed</div>
  </div>
  <button class="btn secondary" onclick="document.getElementById('export-modal').classList.add('open'); buildExport();">Export approvals</button>
</header>

<main id="list"></main>

<div class="help">
  <kbd>1</kbd>–<kbd>6</kbd> approve candidate &nbsp; <kbd>S</kbd> skip &nbsp; <kbd>U</kbd> undo
</div>

<div id="export-modal" onclick="if(event.target===this)this.classList.remove('open')">
  <div class="modal-inner">
    <h2>Approved photos</h2>
    <p style="font-size:13px;color:#555">Copy this JSON and paste it back to Claude.</p>
    <textarea id="export-text" readonly></textarea>
    <div style="margin-top:10px;display:flex;gap:8px;">
      <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('export-text').value); this.textContent='Copied!'">Copy to clipboard</button>
      <button class="btn secondary" onclick="document.getElementById('export-modal').classList.remove('open')">Close</button>
    </div>
  </div>
</div>

<script>
const DATA = ${dataJson};
const STORAGE_KEY = 'bujasaju-photo-review-v1';

// Load decisions from localStorage
function loadDecisions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveDecisions(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}
let decisions = loadDecisions();

// name → 'rejected' | { approved: candidateIndex, url: ... }

function updateProgress() {
  const total = DATA.length;
  const done = Object.keys(decisions).length;
  const approved = Object.values(decisions).filter(d => typeof d === 'object').length;
  const rejected = Object.values(decisions).filter(d => d === 'rejected').length;
  document.getElementById('progress-fill').style.width = (done/total*100) + '%';
  document.getElementById('stats').textContent = \`\${done} / \${total} reviewed (\${approved} approved, \${rejected} rejected)\`;
}

function render() {
  const main = document.getElementById('list');
  main.innerHTML = DATA.map((item, idx) => {
    const d = decisions[item.name];
    const isDecided = !!d;
    const isApproved = typeof d === 'object';
    const isRejected = d === 'rejected';
    const approvedIdx = isApproved ? d.idx : -1;

    return \`
<div class="person\${isDecided ? ' decided' : ''}" id="p-\${idx}">
  <h2>\${escapeHtml(item.name)}</h2>
  <div class="meta">\${escapeHtml(item.nationality)} · \${escapeHtml(item.source)} · query: "\${escapeHtml(item.query)}"</div>
  <div class="badges">
    \${isApproved ? '<span class="badge decision-approved">APPROVED #' + (approvedIdx + 1) + '</span>' : ''}
    \${isRejected ? '<span class="badge decision-rejected">REJECTED</span>' : ''}
  </div>
  <div class="candidates">
    \${item.candidates.map((c, ci) => \`
      <div class="candidate\${ci === approvedIdx ? ' selected' : ''}" onclick="approve(\${idx}, \${ci})">
        <span class="num">\${ci + 1}</span>
        <img src="\${escapeHtml(c.thumb)}" loading="lazy" onerror="this.style.background='#fcc'">
        <div class="domain">\${escapeHtml(c.domain)}</div>
        <div class="title">\${escapeHtml((c.title || '').slice(0, 60))}</div>
      </div>
    \`).join('')}
  </div>
  <div class="actions">
    <button class="btn danger" onclick="reject(\${idx})">Skip (none match)</button>
    \${isDecided ? '<button class="btn secondary" onclick="undo(' + idx + ')">Undo</button>' : ''}
  </div>
</div>\`;
  }).join('');
  updateProgress();
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function approve(personIdx, candidateIdx) {
  const item = DATA[personIdx];
  const cand = item.candidates[candidateIdx];
  decisions[item.name] = { idx: candidateIdx, url: cand.full, domain: cand.domain };
  saveDecisions(decisions);
  render();
}

function reject(personIdx) {
  const item = DATA[personIdx];
  decisions[item.name] = 'rejected';
  saveDecisions(decisions);
  render();
}

function undo(personIdx) {
  const item = DATA[personIdx];
  delete decisions[item.name];
  saveDecisions(decisions);
  render();
}

function buildExport() {
  const approved = {};
  for (const [name, d] of Object.entries(decisions)) {
    if (typeof d === 'object') approved[name] = d.url;
  }
  document.getElementById('export-text').value = JSON.stringify(approved, null, 2);
}

// Keyboard shortcuts
let currentPerson = 0;
function findFirstUndecided() {
  for (let i = 0; i < DATA.length; i++) {
    if (!decisions[DATA[i].name]) return i;
  }
  return -1;
}
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  const first = findFirstUndecided();
  if (first < 0) return;
  const item = DATA[first];

  if (e.key >= '1' && e.key <= '6') {
    const idx = parseInt(e.key) - 1;
    if (idx < item.candidates.length) {
      approve(first, idx);
      const next = document.getElementById('p-' + (first + 1));
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else if (e.key === 's' || e.key === 'S') {
    reject(first);
    const next = document.getElementById('p-' + (first + 1));
    if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (e.key === 'u' || e.key === 'U') {
    // Undo the last decided person before the first undecided
    const last = first - 1;
    if (last >= 0) undo(last);
  }
});

render();
</script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT_PATH, html);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Review items: ${reviewItems.length}`);
}

main();
