/**
 * Claude HTML Renderer Extension v.0.4.3
 *
 * 2/10ths effort: Version badge + yellow styling on Claude responses
 * Debugging: Added broader selectors and console logging
 */

function injectElements() {
  const style = document.createElement('style');
  style.textContent = `
    /* Claude response styling - broader selectors */
    [data-message-role="assistant"] *,
    [data-role="assistant"] *,
    .message.assistant *,
    .assistant-message *,
    [class*="assistant"] *,
    [class*="response"] * {
      color: yellow !important;
    }

    .claude-ext-version {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #667eea;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);

  const versionBadge = document.createElement('div');
  versionBadge.className = 'claude-ext-version';
  versionBadge.textContent = 'v.0.4.3';
  document.body.appendChild(versionBadge);

  // Debug: log DOM structure to help identify correct selectors
  console.log('✓ Claude HTML Renderer loaded - v.0.4.3');
  console.log('Searching for message containers...');
  const allDivs = document.querySelectorAll('[class*="message"], [class*="response"], [data-role], [data-message-role]');
  console.log(`Found ${allDivs.length} potential message elements`);
  if (allDivs.length > 0) {
    console.log('First element:', allDivs[0]);
    console.log('Classes:', allDivs[0].className);
    console.log('Attributes:', Array.from(allDivs[0].attributes).map(a => `${a.name}="${a.value}"`).join(', '));
  }
}

injectElements();
