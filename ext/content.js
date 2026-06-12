/**
 * Claude HTML Renderer Extension v.0.27
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

const EXT_VERSION = 'v.0.27';
const CONTEXT_WINDOW = 200000; // standard Claude context window, used for token estimates
const LOG_KEY = 'claudeExtTokenLog';
const EPISODE_GAP_MS = 15000;  // ctx increases closer than this merge into one "prompt"
const FIVE_H_MS = 5 * 3600 * 1000;
const WEEK_MS = 7 * 24 * 3600 * 1000;

const state = {
  collapsed: true,
  lastPctByChat: {},        // pathname → last seen ctx %, so chat switches don't log fake deltas
  sessionStart: Date.now()
};

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
  const chat = location.pathname;
  const prev = state.lastPctByChat[chat];
  state.lastPctByChat[chat] = ctxPct;
  if (prev === undefined || ctxPct <= prev) return;

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
  // Fallback: the ring itself encodes the percentage.
  const circles = usageBtn.querySelectorAll('svg circle');
  if (circles.length < 2) return null;
  const c = circles[1];
  const dash = parseFloat(c.getAttribute('stroke-dasharray'));
  const offset = parseFloat(c.getAttribute('stroke-dashoffset'));
  if (!isFinite(dash) || !isFinite(offset) || dash <= 0) return null;
  return Math.round((1 - offset / dash) * 100);
}

function readUsage() {
  const usageBtn =
    document.querySelector('button[aria-label^="Usage"]') ||
    document.querySelector('button[aria-label*="context"]');
  if (!usageBtn) return null;

  const label = usageBtn.getAttribute('aria-label') || '';
  const ctx = label.match(/context[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);
  const plan = label.match(/plan[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);

  let contextPct = ctx ? Math.round(parseFloat(ctx[1])) : null;
  const planPct = plan ? Math.round(parseFloat(plan[1])) : null;

  if (contextPct === null) contextPct = ringPctFromSvg(usageBtn);

  if (contextPct === null && label !== lastLoggedLabel) {
    lastLoggedLabel = label;
    console.log('Claude ext: could not parse usage from aria-label:', JSON.stringify(label));
  }

  return { contextPct: contextPct, planPct: planPct, anchor: usageBtn };
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
  return '<table style="border-collapse:collapse;font-size:11px;line-height:1.5;">' + html + '</table>' +
    '<div style="font-size:9px;color:#999;margin-top:3px;">~ estimated from context-ring deltas</div>';
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

function renderInline() {
  const usage = readUsage();
  if (!usage) return; // toolbar not rendered yet; retry on next tick

  if (usage.contextPct !== null) trackDelta(usage.contextPct);

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

// No DOM observers (banned — broke the page in v0.4; see CLAUDE.md).
// A cheap 2s interval: one querySelector + small text update.
function tick() {
  renderInline();
  renderVersionCorner();
}
tick();
setInterval(tick, 2000);

console.log('✓ Claude HTML Renderer loaded - v.0.27');
