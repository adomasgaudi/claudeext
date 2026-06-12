/**
 * Claude HTML Renderer Extension v.0.6
 *
 * Static chart + interactive button
 */

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

  const chartContainer = document.createElement('div');
  chartContainer.className = 'claude-ext-chart';
  chartContainer.innerHTML = chartSvg;
  document.body.appendChild(chartContainer);

  const button = document.createElement('button');
  button.className = 'claude-ext-button';
  button.textContent = 'Test Click';
  button.onclick = () => {
    alert('Button works! 🎉');
  };
  document.body.appendChild(button);

  const versionBadge = document.createElement('div');
  versionBadge.className = 'claude-ext-version';
  versionBadge.textContent = 'v.0.6';
  document.body.appendChild(versionBadge);

  console.log('✓ Claude HTML Renderer loaded - v.0.6 (chart + button)');
}

injectElements();
