/**
 * gen_ai_policy.js
 * Generates AI_Policy.pdf from a CSV of tools via HTML → Puppeteer.
 *
 * Usage:
 *   node gen_ai_policy.js                          # reads tools.csv in same dir
 *   node gen_ai_policy.js ./my-tools.csv           # local CSV
 *   node gen_ai_policy.js https://docs.google.com/spreadsheets/d/SHEET_ID/pub?output=csv
 */

const puppeteer = require('puppeteer');
const https     = require('https');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

// ── Google Sheets URL resolver ─────────────────────────────────────────────────
function resolveGoogleSheetsURL(u) {
  if (!u.startsWith('http')) return u;
  if (u.includes('/pub?') && u.includes('output=csv')) return u;
  const m = u.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) {
    const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1] || '0';
    return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
  }
  return u;
}

// ── CSV fetch ──────────────────────────────────────────────────────────────────
function fetchCSV(urlOrPath) {
  return new Promise((resolve, reject) => {
    if (!urlOrPath.startsWith('http')) {
      try { resolve(fs.readFileSync(urlOrPath, 'utf8')); } catch (e) { reject(e); }
      return;
    }
    function get(url, hops = 0) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return get(res.headers.location, hops + 1);
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(d));
      }).on('error', reject);
    }
    get(urlOrPath);
  });
}

// ── CSV parse ──────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const vals = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { vals.push(cur); cur = ''; }
    else cur += ch;
  }
  vals.push(cur);
  return vals.map(v => v.trim());
}

function parseCSV(text) {
  const lines   = text.replace(/\r/g, '').trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const allRows = lines.slice(1)
    .map(l => { const v = parseCSVLine(l); const r = {}; headers.forEach((h,i) => r[h] = (v[i]||'').trim()); return r; })
    .filter(r => r.Tool);
  const meta  = {};
  allRows.filter(r => r.Group === '_meta').forEach(r => { meta[r.Tool] = r.Notes; });
  return { tools: allRows.filter(r => r.Group !== '_meta'), meta };
}

function isYes(v) { const s = (v||'').toLowerCase().trim(); return s==='y'||s==='yes'||s==='true'||s==='1'; }
function perm(row, a, b) { return isYes(row[a] !== undefined ? row[a] : (row[b]||'')); }

function planOrder(p) {
  if (p==='Enterprise') return 0; if (p==='Blocked') return 3;
  if (!p||p==='—'||p==='-') return 2; return 1;
}

// ── HTML builder ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function readConfig() {
  const configPath = path.join(process.env.HOME || '~', '.claude/skills/ai-policy/config.yaml');
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const nameMatch = content.match(/^firm_name:\s*(.+)$/m);
    return { firmName: nameMatch ? nameMatch[1].trim() : 'Your Firm' };
  } catch (e) {
    return { firmName: 'Your Firm' };
  }
}

function buildHTML({ tools, meta }) {
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const { firmName } = readConfig();

  const hcLabel   = meta.hc_label   || 'LP data · Cap tables · Personal data · Firm financials · Legal documents';
  const confLabel = meta.conf_label || 'Board decks · Deal memos · Insider information';
  const ncLabel   = meta.nc_label   || 'Public info · Research';

  // Bullet list label
  function bulletLabel(text) {
    return '<ul>' + text.split(/[·\n]/).map(s => s.trim()).filter(Boolean)
      .map(s => `<li>${esc(s)}</li>`).join('') + '</ul>';
  }

  // Group tools
  const groupOrder = [];
  const groups = {};
  tools.forEach(r => {
    if (!groups[r.Group]) { groups[r.Group] = []; groupOrder.push(r.Group); }
    groups[r.Group].push(r);
  });

  // Tool table rows
  const toolRows = groupOrder.map(g => {
    const sorted = [...groups[g]].sort((a,b) => planOrder(a.Plan)-planOrder(b.Plan));
    const header = `<tr class="group-row"><td colspan="5">${esc(g)}</td></tr>`;
    const rows = sorted.map(r => {
      const plan   = (r.Plan||'').trim();
      const noPlan = !plan || plan==='—' || plan==='-';
      const blocked= plan === 'Blocked';
      const hc     = perm(r,'Highly Confidential','HC');
      const conf   = perm(r,'Confidential','Confidential');
      const nc     = perm(r,'Non-Confidential','NonConfidential');
      return `<tr>
        <td><span class="tool-name">${esc(r.Tool)}</span>${r.Notes?`<span class="tool-notes">${esc(r.Notes)}</span>`:''}</td>
        <td class="plan${blocked?' blocked':''}${noPlan?' muted':''}">${noPlan?'':esc(plan)}</td>
        <td class="${hc?'check':'cross'}">${hc?'✓':'✗'}</td>
        <td class="${conf?'check':'cross'}">${conf?'✓':'✗'}</td>
        <td class="${nc?'check':'cross'}">${nc?'✓':'✗'}</td>
      </tr>`;
    }).join('');
    return header + rows;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 10mm 11mm 10mm 11mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7.5pt;
    color: #111111;
    line-height: 1.35;
  }

  /* ── Title ── */
  .doc-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 5pt;
    border-bottom: 1.5pt solid #1B3557;
    margin-bottom: 10pt;
  }
  .doc-title {
    font-family: Georgia, serif;
    font-size: 17pt;
    font-weight: bold;
    color: #111111;
  }
  .doc-meta {
    font-size: 7pt;
    color: #888888;
    white-space: nowrap;
    padding-left: 10pt;
  }

  /* ── Section headings ── */
  h2 {
    font-family: Georgia, serif;
    font-size: 9.5pt;
    font-weight: bold;
    color: #111111;
    border-bottom: 0.4pt solid #DCDCDC;
    padding-bottom: 2pt;
    margin: 10pt 0 5pt;
  }

  /* ── Classification table ── */
  .cl-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8pt;
    table-layout: fixed;
  }
  .cl-table th {
    font-size: 7.5pt;
    font-weight: bold;
    color: #1B3557;
    border-top: 1.8pt solid #1B3557;
    border-bottom: 0.4pt solid #DCDCDC;
    padding: 3pt 5pt 2pt;
    text-align: left;
    width: 33.33%;
  }
  .cl-table td {
    font-size: 7pt;
    color: #333333;
    border-bottom: 0.4pt solid #DCDCDC;
    padding: 3pt 5pt 4pt;
    vertical-align: top;
    line-height: 1.5;
  }
  .cl-table ul { padding-left: 9pt; list-style: disc; }
  .cl-table li { margin-bottom: 1.5pt; line-height: 1.35; }

  /* ── Tool table ── */
  .tool-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .tool-table thead th {
    font-size: 7pt;
    font-weight: bold;
    color: #111111;
    background: #F5F5F5;
    border-top: 1.2pt solid #BBBBBB;
    border-bottom: 1.2pt solid #BBBBBB;
    padding: 3pt 5pt;
    text-align: left;
  }
  .tool-table thead th.center { text-align: center; }
  .tool-table .group-row td {
    font-size: 7pt;
    font-weight: bold;
    color: #1B3557;
    border-top: 1pt solid #CCCCCC;
    border-bottom: 0.4pt solid #DCDCDC;
    padding: 4pt 5pt 2pt;
  }
  .tool-table td {
    font-size: 7.5pt;
    color: #111111;
    border-bottom: 0.4pt solid #DCDCDC;
    padding: 3pt 5pt;
    vertical-align: middle;
  }
  .tool-name  { display: block; }
  .tool-notes { display: block; font-size: 6.5pt; color: #888888; margin-top: 1pt; }
  .plan       { text-align: center; font-size: 7pt; color: #555555; }
  .plan.muted { color: #BBBBBB; }
  .plan.blocked { color: #7A1F1F; font-weight: bold; }
  .check { text-align: center; color: #2B6045; font-size: 8.5pt; background: #EFF8F3; }
  .cross { text-align: center; color: #AAAAAA; font-size: 8.5pt; background: #F7F7F7; }
  .col-tool  { width: 37%; }
  .col-plan  { width: 9%; }
  .col-check { width: 18%; }

  /* ── Rules — 3 columns ── */
  .rules {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0 10pt;
    margin-top: 4pt;
  }
  .rule-col { }
  .rule-label {
    font-size: 7.5pt;
    font-weight: bold;
    color: #111111;
    margin-bottom: 3pt;
    padding-bottom: 2pt;
    border-bottom: 0.4pt solid #DCDCDC;
  }
  .rules ul {
    padding-left: 9pt;
    list-style: disc;
  }
  .rules li {
    font-size: 7pt;
    margin-bottom: 2pt;
    line-height: 1.35;
  }

  /* ── Footer ── */
  .footer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    font-size: 6.5pt;
    color: #888888;
    text-align: center;
    border-top: 0.4pt solid #DCDCDC;
    padding-top: 3pt;
    background: white;
  }
</style>
</head>
<body>

  <div class="doc-header">
    <div class="doc-title">${esc(firmName)} AI Tool Usage Policy</div>
    <div class="doc-meta">Created ${esc(date)}&nbsp;&nbsp;·&nbsp;&nbsp;Confidential</div>
  </div>

  <h2>1. AI Tools — What You Can Use &amp; When</h2>

  <table class="cl-table">
    <thead><tr>
      <th>Highly Confidential — no AI tools</th>
      <th>Confidential — approved tools only</th>
      <th>Non-Confidential — any reputable tool</th>
    </tr></thead>
    <tbody><tr>
      <td>${bulletLabel(hcLabel)}</td>
      <td>${bulletLabel(confLabel)}</td>
      <td>${bulletLabel(ncLabel)}</td>
    </tr></tbody>
  </table>

  <table class="tool-table">
    <thead><tr>
      <th class="col-tool">Tool</th>
      <th class="col-plan center">Plan</th>
      <th class="col-check center">Highly Confidential</th>
      <th class="col-check center">Confidential</th>
      <th class="col-check center">Non-Confidential</th>
    </tr></thead>
    <tbody>${toolRows}</tbody>
  </table>

  <h2>2. Rules</h2>

  <div class="rules">
    <div class="rule-col">
      <div class="rule-label">Note-Taking Tools</div>
      <ul>
        <li>Disclose at start of every call that AI note-taker is active.</li>
        <li>Do not use for board meetings or meetings involving insider information.</li>
        <li>Do not use for LP calls, regulatory discussions, or meetings where recording would create legal exposure.</li>
        <li>Manual start only — auto-start must be disabled.</li>
        <li>Host must review all summaries before sharing.</li>
      </ul>
    </div>
    <div class="rule-col">
      <div class="rule-label">Prohibited Uses</div>
      <ul>
        <li>Circumvent security protocols or compliance obligations.</li>
        <li>Create deceptive or misleading content.</li>
        <li>Connect third-party AI tools to company email, files, or systems without Managing Partner approval.</li>
      </ul>
    </div>
    <div class="rule-col">
      <div class="rule-label">Accountability</div>
      <ul>
        <li>All AI output must be reviewed by a human before sharing externally.</li>
        <li>Use your company-provided account for Confidential or Highly Confidential data — personal accounts are not covered by enterprise agreements.</li>
        <li>AI-generated analysis must be independently verified before informing investment decisions.</li>
        <li>Users are accountable for all AI-assisted work; misuse may result in access revocation.</li>
        <li>AI tools may reflect bias — apply your own judgment always.</li>
      </ul>
    </div>
  </div>

</body>
</html>`;
}

// ── PDF renderer ───────────────────────────────────────────────────────────────
async function renderPDF(html, outPath) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page    = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }, // margins handled by @page
    displayHeaderFooter: false,
  });
  await browser.close();
}

// ── Entry point ────────────────────────────────────────────────────────────────
async function main() {
  const src = resolveGoogleSheetsURL(process.argv[2] || path.join(__dirname, 'tools.csv'));
  console.log(`📄 Reading from: ${src}`);
  const csv  = await fetchCSV(src);
  const data = parseCSV(csv);
  const html = buildHTML(data);
  const out  = path.join(process.env.HOME || '~', 'Downloads', 'AI_Policy.pdf');
  await renderPDF(html, out);
  console.log(`✅  Saved: ${out}`);
}

main().catch(e => { console.error('❌  Error:', e.message); process.exit(1); });
