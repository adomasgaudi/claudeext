/**
 * Claude HTML Renderer Extension
 *
 * Inject custom HTML components into Claude chat
 */

function injectCustomComponents() {
  // Add custom styles for our components
  const style = document.createElement('style');
  style.textContent = `
    .claude-ext-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      line-height: 1.5;
    }

    .claude-ext-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 8px;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);

  // Create custom panel component
  const panel = document.createElement('div');
  panel.className = 'claude-ext-panel';
  panel.innerHTML = `
    <div>🚀 Extension Active</div>
    <div class="claude-ext-badge">v1.4.0</div>
  `;
  document.body.appendChild(panel);
}

injectCustomComponents();
console.log('✓ Claude HTML Renderer loaded - custom components injected');
