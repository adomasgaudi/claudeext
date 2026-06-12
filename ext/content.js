/**
 * Claude HTML Renderer Extension v.0.23
 *
 * Collapsible token badge + inline-styled model name:
 * 1. Level 3 (Learn): debugCodeBlocks() - understand DOM structure
 * 2. Level 2 (Parallel): Token tracking, input counter, prompt history
 * 3. Level 1 (Safe): Enhanced popup, token display, cost calculator
 * Parse special markers from Claude responses:
 * - Font size: <!-- FONT-SIZE: 24 -->
 * - Render HTML: <!-- RENDER-HTML --> <button>Click</button>
 */

function applyFontSize() {
  // Search for LAST (most recent) font size marker in the page
  const bodyText = document.body.innerText;
  const matches = [...bodyText.matchAll(/FONT-SIZE:\s*(\d+)/g)];

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const fontSize = lastMatch[1];

    // Remove old styles and apply new one
    const oldStyle = document.querySelector('.claude-ext-font-style');
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.className = 'claude-ext-font-style';
    style.textContent = `
      body, body * {
        font-size: ${fontSize}px !important;
      }
    `;
    document.head.appendChild(style);
    console.log(`✓ Applied font size: ${fontSize}px (latest of ${matches.length} markers)`);
    alert(`Font size updated to ${fontSize}px`);
  } else {
    alert('No FONT-SIZE marker found in page');
  }
}

function renderHTML() {
  // 4/10ths: Search within code blocks, not entire page text

  // Find all code blocks on the page
  const codeBlocks = document.querySelectorAll('pre, code, [data-code]');
  let foundHTML = '';

  for (const block of codeBlocks) {
    const blockText = block.innerText || block.textContent;
    if (blockText.includes('<!-- RENDER-HTML -->')) {
      const markerIndex = blockText.indexOf('<!-- RENDER-HTML -->');
      const afterMarker = blockText.substring(markerIndex + 21).trim();
      const lines = afterMarker.split('\n');

      let htmlContent = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines at start
        if (!trimmed && !htmlContent) continue;

        // Stop at next comment
        if (trimmed.startsWith('<!--')) break;

        // Collect lines that look like HTML
        if (trimmed.startsWith('<') || htmlContent) {
          htmlContent += line + '\n';
        }
      }

      htmlContent = htmlContent.trim();
      if (htmlContent) {
        foundHTML = htmlContent;
        break;
      }
    }
  }

  if (!foundHTML) {
    alert('❌ No marker found in code blocks');
    console.log('Debug: Checked', codeBlocks.length, 'code blocks');
    return;
  }

  console.log('📍 Extracted HTML:', foundHTML);

  // Try to render it
  const container = document.createElement('div');
  container.className = 'claude-ext-html-render';

  try {
    container.innerHTML = foundHTML;
    const existingRender = document.querySelector('.claude-ext-html-render');
    if (existingRender) {
      existingRender.replaceWith(container);
    } else {
      document.body.appendChild(container);
    }
    console.log('✓ HTML rendered!');
    alert('✓ HTML rendered!');
  } catch (e) {
    alert('❌ Render error: ' + e.message);
    console.error('Error:', e);
  }
}

function updateSessionTokenBadge(badge, state) {
  // Get session token count from page analysis
  const allText = document.body.innerText;

  // Rough estimate: count all visible text on page
  const wordCount = allText.split(/\s+/).length;
  const estimatedSessionTokens = Math.ceil(wordCount * 1.3);

  // Calculate tokens added since last update (this prompt)
  const lastPromptTokens = estimatedSessionTokens - state.previousTotal;
  state.previousTotal = estimatedSessionTokens;

  // Track last 10 prompt token counts
  if (lastPromptTokens > 5) { // Only count significant changes (>5 tokens)
    state.promptHistory.push(lastPromptTokens);
    if (state.promptHistory.length > 10) {
      state.promptHistory.shift(); // Remove oldest if more than 10
    }
  }

  // Calculate average of last 10 prompts
  const avgLast10 = state.promptHistory.length > 0
    ? Math.round(state.promptHistory.reduce((a, b) => a + b, 0) / state.promptHistory.length)
    : 0;

  // Get model name from environment or default to Haiku
  const modelName = (typeof window !== 'undefined' && window.__claude_model)
    ? window.__claude_model
    : 'Haiku 4.5';

  // Extract just the model family (e.g., "Haiku" from "Haiku 4.5")
  const modelFamily = modelName.split(' ')[0];
  const modelVersion = modelName.slice(modelFamily.length).trim();

  // Inline styles so the page's @layer CSS can't override the bold
  const modelHtml = `<span style="font-weight:800 !important; font-size:13px; letter-spacing:0.3px;">${modelFamily}</span> ${modelVersion}`;

  if (state.collapsed) {
    // Collapsed: just version + model
    badge.innerHTML = `v.0.23 | ${modelHtml} <span style="opacity:0.7;">▸</span>`;
  } else {
    // Expanded: full metrics (NOTE: these are estimates, not real API usage)
    badge.innerHTML = `v.0.23 | ~Session: ${estimatedSessionTokens.toLocaleString()} | ~Last: ${lastPromptTokens} | ~Avg(10): ${avgLast10} | ${modelHtml} <span style="opacity:0.7;">▾</span>`;
  }
}

function setupTokenCounter() {
  // Level 2: Live token counter for Claude input
  const style = document.createElement('style');
  style.textContent = `
    .claude-ext-token-counter {
      position: absolute;
      bottom: -30px;
      left: 0;
      font-size: 12px;
      color: #667eea;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap;
      pointer-events: none;
    }
    .claude-ext-token-counter.hidden {
      display: none;
    }
  `;
  document.head.appendChild(style);

  // Find Claude's input element (try multiple selectors)
  const inputSelectors = [
    'textarea[class*="input"]',
    'textarea[placeholder*="Message"]',
    'textarea[data-testid*="input"]',
    '[contenteditable="true"]',
    'textarea'
  ];

  let inputElement = null;
  for (const selector of inputSelectors) {
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) {
      inputElement = element;
      break;
    }
  }

  if (!inputElement) {
    console.log('⚠️ Claude input element not found. Token counter disabled.');
    return;
  }

  console.log('✓ Found Claude input element:', inputElement.tagName);

  // Create token counter display
  const counter = document.createElement('div');
  counter.className = 'claude-ext-token-counter hidden';
  inputElement.parentElement.style.position = 'relative';
  inputElement.parentElement.appendChild(counter);

  // Haiku pricing: $0.80/$2.40 per million tokens
  const INPUT_COST = 0.80 / 1000000;
  const OUTPUT_COST = 2.40 / 1000000;

  function updateTokenCount() {
    const text = inputElement.value || inputElement.innerText || inputElement.textContent || '';
    if (!text.trim()) {
      counter.classList.add('hidden');
      return;
    }

    // Estimate tokens: ~1.3 tokens per word
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedTokens = Math.ceil(wordCount * 1.3);

    // Calculate cost (estimate as 50/50 input/output)
    const inputTokens = Math.ceil(estimatedTokens * 0.5);
    const outputTokens = Math.ceil(estimatedTokens * 0.5);
    const cost = (inputTokens * INPUT_COST) + (outputTokens * OUTPUT_COST);

    counter.textContent = `📊 Tokens: ${estimatedTokens} (~$${cost.toFixed(4)})`;
    counter.classList.remove('hidden');
  }

  // Listen for input changes
  inputElement.addEventListener('input', updateTokenCount);
  inputElement.addEventListener('change', updateTokenCount);
  inputElement.addEventListener('keyup', updateTokenCount);

  // Also check periodically for contenteditable changes
  if (inputElement.contentEditable === 'true') {
    setInterval(updateTokenCount, 500);
  }

  console.log('✓ Token counter installed');
}

function debugCodeBlocks() {
  // Level 3: Learn DOM structure without trying to complete the task
  const allElements = document.querySelectorAll('*');
  const codeBlockCandidates = [];

  allElements.forEach(el => {
    const text = el.innerText || '';
    if (text.includes('RENDER-HTML') && el.children.length < 50) {
      codeBlockCandidates.push({
        tag: el.tagName,
        classes: el.className,
        text: text.substring(0, 100),
        children: el.children.length
      });
    }
  });

  if (codeBlockCandidates.length > 0) {
    console.log('🔍 Found code block candidates with RENDER-HTML:', codeBlockCandidates);
  } else {
    console.log('🔍 No code blocks with RENDER-HTML found. Checking page structure...');
    const preBlocks = document.querySelectorAll('pre, code');
    console.log('  Found', preBlocks.length, 'pre/code elements');
    preBlocks.forEach((block, i) => {
      if (i < 3) {
        console.log(`  Block ${i}:`, block.tagName, block.className, block.innerText?.substring(0, 50));
      }
    });
  }
}

function injectElements() {
  const chartSvg = `
    <svg width="280" height="180" viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="180" fill="#f9fafb"/>
      <rect x="25" y="110" width="35" height="60" fill="#667eea" rx="3"/>
      <rect x="75" y="70" width="35" height="100" fill="#764ba2" rx="3"/>
      <rect x="125" y="90" width="35" height="80" fill="#f093fb" rx="3"/>
      <rect x="175" y="50" width="35" height="120" fill="#4facfe" rx="3"/>
      <text x="42" y="175" font-size="11" fill="#666" text-anchor="middle">A</text>
      <text x="92" y="175" font-size="11" fill="#666" text-anchor="middle">B</text>
      <text x="142" y="175" font-size="11" fill="#666" text-anchor="middle">C</text>
      <text x="192" y="175" font-size="11" fill="#666" text-anchor="middle">D</text>
      <line x1="15" y1="170" x2="220" y2="170" stroke="#ddd" stroke-width="1"/>
      <line x1="15" y1="25" x2="15" y2="170" stroke="#ddd" stroke-width="1"/>
    </svg>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .claude-ext-chart {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 14px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
    }

    .claude-ext-button {
      position: fixed;
      top: 20px;
      right: 320px;
      background: #667eea;
      color: white;
      padding: 8px 14px;
      border: none;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 9998;
      transition: background 0.2s;
    }

    .claude-ext-button:hover {
      background: #764ba2;
    }

    .claude-ext-version {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #667eea;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", monospace;
      font-size: 11px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-weight: 500;
      white-space: nowrap;
      max-width: 450px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .claude-ext-version b {
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .claude-ext-html-render {
      position: fixed;
      top: 220px;
      right: 20px;
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 9998;
      max-width: 300px;
      border: 2px solid #667eea;
    }
  `;
  document.head.appendChild(style);

  const chartContainer = document.createElement('div');
  chartContainer.className = 'claude-ext-chart';
  chartContainer.innerHTML = chartSvg;
  document.body.appendChild(chartContainer);

  const fontButton = document.createElement('button');
  fontButton.className = 'claude-ext-button';
  fontButton.textContent = 'Apply Font Size';
  fontButton.style.right = '320px';
  fontButton.onclick = applyFontSize;
  document.body.appendChild(fontButton);

  const renderButton = document.createElement('button');
  renderButton.className = 'claude-ext-button';
  renderButton.textContent = 'Render HTML';
  renderButton.style.right = '500px';
  renderButton.onclick = renderHTML;
  document.body.appendChild(renderButton);

  const debugButton = document.createElement('button');
  debugButton.className = 'claude-ext-button';
  debugButton.textContent = 'Debug Info';
  debugButton.style.right = '680px';
  debugButton.style.background = '#764ba2';
  debugButton.onclick = () => {
    const preBlocks = document.querySelectorAll('pre, code, [role="document"], article');
    alert(`Found ${preBlocks.length} potential code blocks. Check console for details.`);
    console.log('Detailed block info:', Array.from(preBlocks).map(b => ({
      tag: b.tagName,
      class: b.className,
      hasRenderHTML: b.innerText?.includes('RENDER-HTML') || false,
      textPreview: b.innerText?.substring(0, 80) || '(no text)'
    })));
  };
  document.body.appendChild(debugButton);

  const versionBadge = document.createElement('div');
  versionBadge.className = 'claude-ext-version';
  versionBadge.style.cursor = 'pointer';
  versionBadge.title = 'Click to collapse/expand';
  document.body.appendChild(versionBadge);

  // Track token state across updates
  const tokenState = {
    previousTotal: 0,
    promptHistory: [], // Last 10 prompt token counts
    collapsed: false
  };

  // Click badge to toggle collapsed/expanded
  versionBadge.onclick = () => {
    tokenState.collapsed = !tokenState.collapsed;
    updateSessionTokenBadge(versionBadge, tokenState);
  };

  console.log('✓ Claude HTML Renderer loaded - v.0.23');

  // Update badge immediately and every 2 seconds
  updateSessionTokenBadge(versionBadge, tokenState);
  setInterval(() => updateSessionTokenBadge(versionBadge, tokenState), 2000);

  // Level 2: Token counter for input
  setupTokenCounter();

  // Level 3: Debug the DOM structure
  debugCodeBlocks();
}

injectElements();
