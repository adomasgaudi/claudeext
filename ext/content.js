/**
 * Claude HTML Renderer Extension v.0.25
 *
 * Single feature: inline usage display next to the model name in the
 * bottom toolbar of claude.ai/code. No floating popups.
 *
 * Data sources (REAL, scraped from Claude's own UI — see HANDOFF.md §4):
 * - button[aria-label^="Usage:"]  → "Usage: context 16%, plan 42%"
 * - model selector button         → visible text, e.g. "Fable 5"
 *
 * Token figures derived from the context %% are estimates (marked with ~).
 * Exact per-prompt costs come from the transcript Stop hook, not this extension.
 *
 * Removed in v.0.24: chart, font-size control, HTML rendering, debug button,
 * floating badge, innerText word counting (all were estimates or stalled work).
 */

const EXT_VERSION = 'v.0.25';
const CONTEXT_WINDOW = 200000; // standard Claude context window, used for ~token estimate

const state = {
  collapsed: false
};

let lastLoggedLabel = null;

function ringPctFromSvg(usageBtn) {
  // Fallback: the ring itself encodes the percentage.
  // Second <circle> has stroke-dasharray = circumference and
  // stroke-dashoffset = circumference * (1 - pct).
  const circles = usageBtn.querySelectorAll('svg circle');
  if (circles.length < 2) return null;
  const c = circles[1];
  const dash = parseFloat(c.getAttribute('stroke-dasharray'));
  const offset = parseFloat(c.getAttribute('stroke-dashoffset'));
  if (!isFinite(dash) || !isFinite(offset) || dash <= 0) return null;
  return Math.round((1 - offset / dash) * 100);
}

function readUsage() {
  // Claude's own usage ring reports real percentages in its aria-label.
  // Match any button whose aria-label mentions usage/context (format may vary).
  const usageBtn =
    document.querySelector('button[aria-label^="Usage"]') ||
    document.querySelector('button[aria-label*="context"]');
  if (!usageBtn) return null;

  const label = usageBtn.getAttribute('aria-label') || '';
  // Tolerant: integers or decimals, "context 16%", "context: 16.5 %", etc.
  const ctx = label.match(/context[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);
  const plan = label.match(/plan[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);

  let contextPct = ctx ? Math.round(parseFloat(ctx[1])) : null;
  const planPct = plan ? Math.round(parseFloat(plan[1])) : null;

  // Fallback: derive context % from the ring's SVG geometry
  if (contextPct === null) {
    contextPct = ringPctFromSvg(usageBtn);
  }

  // Debug: if we still can't parse, log the raw label once per change
  if (contextPct === null && label !== lastLoggedLabel) {
    lastLoggedLabel = label;
    console.log('Claude ext: could not parse usage from aria-label:', JSON.stringify(label));
  }

  // Model name: the dropdown button in the same right-side toolbar group
  let model = '';
  const group = usageBtn.parentElement;
  if (group) {
    const modelSpan = group.querySelector('button[aria-haspopup="menu"] span');
    if (modelSpan) model = modelSpan.textContent.trim();
  }

  return {
    contextPct: contextPct,
    planPct: planPct,
    model: model,
    anchor: usageBtn
  };
}

function renderInline() {
  const usage = readUsage();
  if (!usage) return; // toolbar not rendered yet; retry on next tick

  let el = document.getElementById('claude-ext-usage-inline');

  // (Re)create if missing or detached (React re-renders can drop our node)
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
    el.title = 'Click to collapse/expand (Claude HTML Renderer)';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      state.collapsed = !state.collapsed;
      renderInline();
    });
    // Insert just before the usage ring, i.e. next to the model name
    usage.anchor.parentElement.insertBefore(el, usage.anchor);
  }

  if (usage.contextPct === null) {
    el.textContent = state.collapsed ? '▸' : `${EXT_VERSION} | usage n/a ▾`;
    return;
  }

  const approxTokens = Math.round(CONTEXT_WINDOW * usage.contextPct / 100);

  if (state.collapsed) {
    el.textContent = `${usage.contextPct}% ▸`;
  } else {
    const tokensStr = `~${approxTokens.toLocaleString()} tok`;
    const planStr = usage.planPct !== null ? ` | plan ${usage.planPct}%` : '';
    el.textContent = `${EXT_VERSION} | ctx ${usage.contextPct}% (${tokensStr})${planStr} ▾`;
  }
}

// No DOM observers (banned — broke the page in v0.4; see CLAUDE.md).
// A cheap 2s interval: one querySelector + small text update.
renderInline();
setInterval(renderInline, 2000);

console.log('✓ Claude HTML Renderer loaded - v.0.25');
