/**
 * Claude HTML Renderer Extension v.0.4.2
 *
 * 2/10ths effort: Version badge + yellow styling on Claude responses
 */

function injectElements() {
  const style = document.createElement('style');
  style.textContent = `
    /* Claude response styling */
    [data-message-role="assistant"],
    [data-role="assistant"],
    .message.assistant,
    .response {
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
  versionBadge.textContent = 'v.0.4.2';
  document.body.appendChild(versionBadge);
}

injectElements();
console.log('✓ Claude HTML Renderer loaded - v.0.4.2');
