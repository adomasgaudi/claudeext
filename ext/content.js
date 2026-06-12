/**
 * Claude HTML Renderer Extension v.0.24
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

const EXT_VERSION = 'v.0.24';
const CONTEXT_WINDOW = 200000; // standard Claude context window, used for ~token estimate

const state = {
  collapsed: false
};

function readUsage() {
  // Claude's own usage ring reports real percentages in its aria-label
  const usageBtn = document.querySelector('button[aria-label^="Usage:"]');
  if (!usageBtn) return null;

  const label = usageBtn.getAttribute('aria-label') || '';
  const ctx = label.match(/context\s+(\d+)%/i);
  const plan = label.match(/plan\s+(\d+)%/i);

  // Model name: the dropdown button in the same right-side toolbar group
  let model = '';
  const group = usageBtn.parentElement;
  if (group) {
    const modelSpan = group.querySelector('button[aria-haspopup="menu"] span');
    if (modelSpan) model = modelSpan.textContent.trim();
  }

  return {
    contextPct: ctx ? parseInt(ctx[1], 10) : null,
    planPct: plan ? parseInt(plan[1], 10) : null,
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

console.log('✓ Claude HTML Renderer loaded - v.0.24');
