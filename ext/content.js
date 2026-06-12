/**
 * Claude HTML Renderer Extension v.0.30
 *
 * Elements (all static injection, no observers):
 * - inline token info next to the model name in the bottom toolbar:
 *     collapsed: "~<last prompt> / ~<last 10> tok"
 *     expanded:  small table — last prompt / last 10 / last 100 / session /
 *                context / 5h / week, each in token count and %
 * - tiny fixed version label in the bottom-right corner of the page
 *
 * Data sources (see HANDOFF.md §4):
 * - button[aria-label^="Usage:"] → "Usage: context 16%, plan 42%" (REAL)
 * - per-prompt/5h/week token counts are derived by logging the context-ring
 *   deltas between polls (timestamped, persisted in localStorage). Real
 *   scraped data, but estimates — always displayed with a ~ prefix.
 *   Exact per-prompt costs come from the transcript Stop hook, not this
 *   extension.
 */

const EXT_VERSION = 'v.0.30';
const CONTEXT_WINDOW = 200000; // standard Claude context window, used for token estimates
const LOG_KEY = 'claudeExtTokenLog';
const EPISODE_GAP_MS = 15000;  // ctx increases closer than this merge into one "prompt"
const FIVE_H_MS = 5 * 3600 * 1000;
const WEEK_MS = 7 * 24 * 3600 * 1000;

const state = {
  collapsed: true,
  costOpen: false,
  lastPctByChat: {},        // pathname → last seen ctx %, so chat switches don't log fake deltas
  sessionStart: Date.now()
};

// Cost marker embedded in the assistant's reply text (the Stop hook's stdout
// does not reach this page). Carries the FULL session cost table as JSON;
// we read the latest one we can see in the DOM.
const COST_RE = /⟦COSTDATA⟧(\[.*?\])⟦END⟧/g;

let lastLoggedLabel = null;

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; } catch (e) { return []; }
}

function saveLog(log) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {}
}

// Each log entry is one "prompt episode": {t: ms timestamp, tok: tokens added}.
// Only context-ring INCREASES are logged; drops (compaction, new chat) just
// reset the baseline.
function trackDelta(ctxPct) {
  // ctxPct is a FLOAT (precise, from SVG ring geometry when available).
  // Integer aria-label percentages miss any turn under 1% (~2,000 tok).
  const chat = location.pathname;
  const prev = state.lastPctByChat[chat];
  state.lastPctByChat[chat] = ctxPct;
  if (prev === undefined) return;
  if (ctxPct - prev < 0.05) return; // below ring resolution / no growth

  const tok = Math.round((ctxPct - prev) / 100 * CONTEXT_WINDOW);
  const now = Date.now();
  const log = loadLog();
  const last = log[log.length - 1];
  if (last && now - last.t < EPISODE_GAP_MS) {
    last.tok += tok;
    last.t = now;
  } else {
    log.push({ t: now, tok: tok });
  }
  while (log.length && log[0].t < now - WEEK_MS) log.shift();
  saveLog(log);
  console.log('Claude ext: recorded +' + tok.toLocaleString() + ' tok (ctx ' +
    prev.toFixed(1) + '% → ' + ctxPct.toFixed(1) + '%)');
}

function sumLast(log, n) {
  let s = 0;
  for (let i = Math.max(0, log.length - n); i < log.length; i++) s += log[i].tok;
  return s;
}

function sumSince(log, t) {
  let s = 0;
  for (let i = log.length - 1; i >= 0 && log[i].t >= t; i--) s += log[i].tok;
  return s;
}

function fmtTok(n) {
  return '~' + n.toLocaleString();
}

function fmtPct(tok) {
  const p = tok / CONTEXT_WINDOW * 100;
  return (p >= 10 ? Math.round(p) : Math.round(p * 10) / 10) + '%';
}

function ringPctFromSvg(usageBtn) {
  // The ring encodes the percentage precisely (float) — better resolution
  // than the integer aria-label, so deltas under 1% are still caught.
  const circles = usageBtn.querySelectorAll('svg circle');
  if (circles.length < 2) return null;
  const c = circles[1];
  const dash = parseFloat(c.getAttribute('stroke-dasharray'));
  const offset = parseFloat(c.getAttribute('stroke-dashoffset'));
  if (!isFinite(dash) || !isFinite(offset) || dash <= 0) return null;
  return (1 - offset / dash) * 100;
}

function readUsage() {
  const usageBtn =
    document.querySelector('button[aria-label^="Usage"]') ||
    document.querySelector('button[aria-label*="context"]');
  if (!usageBtn) return null;

  const label = usageBtn.getAttribute('aria-label') || '';
  const ctx = label.match(/context[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);
  const plan = label.match(/plan[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);

  // Prefer the precise SVG value for delta tracking; aria-label as fallback.
  let precisePct = ringPctFromSvg(usageBtn);
  if (precisePct === null && ctx) precisePct = parseFloat(ctx[1]);

  const contextPct = precisePct !== null ? Math.round(precisePct) : null;
  const planPct = plan ? Math.round(parseFloat(plan[1])) : null;

  if (contextPct === null && label !== lastLoggedLabel) {
    lastLoggedLabel = label;
    console.log('Claude ext: could not parse usage from aria-label:', JSON.stringify(label));
  }

  return { contextPct: contextPct, precisePct: precisePct, planPct: planPct, anchor: usageBtn };
}

function buildTableHtml(log, usage) {
  const now = Date.now();
  const rows = [
    ['last prompt', sumLast(log, 1), null],
    ['last 10', sumLast(log, 10), null],
    ['last 100', sumLast(log, 100), null],
    ['session', sumSince(log, state.sessionStart), null],
    ['context', Math.round(usage.contextPct / 100 * CONTEXT_WINDOW), usage.contextPct + '%'],
    ['5h', sumSince(log, now - FIVE_H_MS), usage.planPct !== null ? usage.planPct + '% plan' : '—'],
    ['week', sumSince(log, now - WEEK_MS), '—']
  ];
  const cell = 'padding:1px 8px;text-align:right;font-variant-numeric:tabular-nums;';
  const html = rows.map(function (r) {
    const pct = r[2] !== null ? r[2] : fmtPct(r[1]);
    return '<tr><td style="padding:1px 8px;text-align:left;color:#888;">' + r[0] + '</td>' +
      '<td style="' + cell + '">' + fmtTok(r[1]) + '</td>' +
      '<td style="' + cell + 'color:#888;">' + pct + '</td></tr>';
  }).join('');
  const note = log.length === 0
    ? 'tracking starts now — counts appear after your next prompt'
    : '~ estimated from context-ring deltas';
  return '<table style="border-collapse:collapse;font-size:11px;line-height:1.5;">' + html + '</table>' +
    '<div style="font-size:9px;color:#999;margin-top:3px;">' + note + '</div>';
}

function getPanel() {
  let panel = document.getElementById('claude-ext-usage-panel');
  if (!panel || !panel.isConnected) {
    panel = document.createElement('div');
    panel.id = 'claude-ext-usage-panel';
    panel.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'background:#fff',
      'border:1px solid #d0d0d0',
      'border-radius:8px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.12)',
      'padding:6px 4px',
      'display:none',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:#333'
    ].join(';');
    document.body.appendChild(panel);
  }
  return panel;
}

function scrapeCostData() {
  // The latest cost marker in the chat carries the full table. It is emitted
  // into the assistant's visible reply text (the Stop hook's stdout does NOT
  // reach this page's DOM), so it lives in a normal, scrapeable message.
  // Transcript is virtualized but the newest reply sits at the bottom
  // (visible), so the most recent match is the freshest complete table.
  const text = document.body.innerText || '';
  let m, last = null;
  COST_RE.lastIndex = 0;
  while ((m = COST_RE.exec(text)) !== null) last = m[1];
  if (!last) return null;
  try { return JSON.parse(last); } catch (e) { return null; }
}

function money(n) {
  return '$' + Number(n).toFixed(4);
}

function buildCostTableHtml(rows) {
  if (!rows || !rows.length) {
    return '<div style="font-size:11px;color:#666;max-width:240px;">' +
      'No cost data yet. It appears after the Stop hook runs — ' +
      'send a prompt, then reopen this.</div>';
  }
  const th = 'padding:2px 8px;text-align:right;color:#888;font-weight:600;border-bottom:1px solid #eee;';
  const thl = th + 'text-align:left;';
  const td = 'padding:2px 8px;text-align:right;font-variant-numeric:tabular-nums;';
  const tdl = td + 'text-align:left;color:#444;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  let session = 0;
  const body = rows.map(function (r) {
    session = r.session;
    return '<tr>' +
      '<td style="' + td + 'color:#aaa;">' + r.n + '</td>' +
      '<td style="' + tdl + '" title="' + (r.label || '') + '">' + (r.label || '') + '</td>' +
      '<td style="' + td + 'color:#888;">' + (r.model || '?') + '</td>' +
      '<td style="' + td + '">' + (r.out || 0).toLocaleString() + '</td>' +
      '<td style="' + td + 'color:#888;">' + (r.cr || 0).toLocaleString() + '</td>' +
      '<td style="' + td + 'font-weight:600;color:#b45309;">' + money(r.cost) + '</td>' +
      '</tr>';
  }).join('');
  const header = '<tr>' +
    '<th style="' + th + '">#</th><th style="' + thl + '">prompt</th>' +
    '<th style="' + th + '">model</th><th style="' + th + '">out</th>' +
    '<th style="' + th + '">cache r</th><th style="' + th + '">turn $</th></tr>';
  return '<div style="font-size:12px;font-weight:600;margin:0 8px 4px;color:#333;">' +
    'Per-prompt cost — real, from transcript</div>' +
    '<table style="border-collapse:collapse;font-size:11px;line-height:1.45;">' +
    header + body + '</table>' +
    '<div style="font-size:11px;font-weight:600;margin:4px 8px 0;color:#333;">' +
    'session total: ' + money(session) + '</div>';
}

function getCostPanel() {
  let panel = document.getElementById('claude-ext-cost-panel');
  if (!panel || !panel.isConnected) {
    panel = document.createElement('div');
    panel.id = 'claude-ext-cost-panel';
    panel.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'background:#fff',
      'border:1px solid #d0d0d0',
      'border-radius:8px',
      'box-shadow:0 6px 18px rgba(0,0,0,0.16)',
      'padding:8px 4px',
      'max-height:60vh',
      'overflow-y:auto',
      'display:none',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'color:#333'
    ].join(';');
    document.body.appendChild(panel);
  }
  return panel;
}

function renderCostButton(anchor) {
  let btn = document.getElementById('claude-ext-cost-btn');
  if (!btn || !btn.isConnected) {
    btn = document.createElement('span');
    btn.id = 'claude-ext-cost-btn';
    btn.textContent = '$';
    btn.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'width:16px',
      'height:16px',
      'font-size:12px',
      'font-weight:700',
      'color:#b45309',
      'cursor:pointer',
      'user-select:none',
      'border-radius:4px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    ].join(';');
    btn.title = 'Show per-prompt cost table (real, from transcript)';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      state.costOpen = !state.costOpen;
      renderInline();
    });
    anchor.parentElement.insertBefore(btn, anchor);
  }

  const panel = getCostPanel();
  if (state.costOpen) {
    panel.innerHTML = buildCostTableHtml(scrapeCostData());
    const rect = btn.getBoundingClientRect();
    panel.style.bottom = Math.round(window.innerHeight - rect.top + 6) + 'px';
    panel.style.right = Math.max(6, Math.round(window.innerWidth - rect.right)) + 'px';
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function renderInline() {
  const usage = readUsage();
  if (!usage) return; // toolbar not rendered yet; retry on next tick

  if (usage.precisePct !== null) trackDelta(usage.precisePct);

  let el = document.getElementById('claude-ext-usage-inline');
  if (!el || !el.isConnected) {
    el = document.createElement('span');
    el.id = 'claude-ext-usage-inline';
    // Inline styles only — the page's @layer CSS overrides stylesheets (HANDOFF.md §4)
    el.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'font-size:12px',
      'font-weight:600',
      'color:#667eea',
      'cursor:pointer',
      'white-space:nowrap',
      'padding:0 6px',
      'user-select:none',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
    ].join(';');
    el.title = 'Tokens: last prompt / last 10. Click for details.';
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      state.collapsed = !state.collapsed;
      renderInline();
    });
    usage.anchor.parentElement.insertBefore(el, usage.anchor);
  }

  renderCostButton(usage.anchor);

  const panel = getPanel();

  if (usage.contextPct === null) {
    el.textContent = 'usage n/a';
    panel.style.display = 'none';
    return;
  }

  const log = loadLog();
  el.textContent = fmtTok(sumLast(log, 1)) + ' / ' + fmtTok(sumLast(log, 10)) +
    ' tok ' + (state.collapsed ? '▸' : '▾');

  if (state.collapsed) {
    panel.style.display = 'none';
  } else {
    panel.innerHTML = buildTableHtml(log, usage);
    const rect = el.getBoundingClientRect();
    panel.style.bottom = Math.round(window.innerHeight - rect.top + 6) + 'px';
    panel.style.right = Math.max(6, Math.round(window.innerWidth - rect.right)) + 'px';
    panel.style.display = 'block';
  }
}

function renderVersionCorner() {
  let el = document.getElementById('claude-ext-version-corner');
  if (el && el.isConnected) return;

  el = document.createElement('span');
  el.id = 'claude-ext-version-corner';
  // pointer-events:none so it can never block clicks on the page.
  el.style.cssText = [
    'position:fixed',
    'bottom:4px',
    'right:6px',
    'z-index:2147483647',
    'font-size:10px',
    'font-weight:600',
    'color:#667eea',
    'opacity:0.7',
    'pointer-events:none',
    'user-select:none',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
  ].join(';');
  el.textContent = EXT_VERSION;
  document.body.appendChild(el);
}

// One click listener (bubble phase) to close panels on an outside click.
// The toggle controls call stopPropagation, so their own clicks never reach
// here — only genuine outside clicks do. No DOM observers; cheap.
function installOutsideClose() {
  if (state._outsideInstalled) return;
  state._outsideInstalled = true;
  document.addEventListener('click', function (e) {
    const t = e.target;
    const usagePanel = document.getElementById('claude-ext-usage-panel');
    const costPanel = document.getElementById('claude-ext-cost-panel');
    let changed = false;
    if (!state.collapsed && usagePanel && !usagePanel.contains(t)) {
      state.collapsed = true;
      changed = true;
    }
    if (state.costOpen && costPanel && !costPanel.contains(t)) {
      state.costOpen = false;
      changed = true;
    }
    if (changed) renderInline();
  });
}

// No DOM observers (banned — broke the page in v0.4; see CLAUDE.md).
// A cheap 2s interval: one querySelector + small text update.
function tick() {
  renderInline();
  renderVersionCorner();
  installOutsideClose();
}
tick();
setInterval(tick, 2000);

console.log('✓ Claude HTML Renderer loaded - v.0.30');
