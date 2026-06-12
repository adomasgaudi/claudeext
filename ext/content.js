/**
 * Claude HTML Renderer Extension v.0.4
 *
 * Inject chart/diagram and version badge
 */

function injectChart() {
  // Create a simple SVG bar chart
  const chartSvg = `
    <svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Grid background -->
      <rect width="300" height="200" fill="#f9fafb"/>

      <!-- Bars -->
      <rect x="30" y="120" width="40" height="70" fill="#667eea" rx="4"/>
      <rect x="90" y="80" width="40" height="110" fill="#764ba2" rx="4"/>
      <rect x="150" y="100" width="40" height="90" fill="#f093fb" rx="4"/>
      <rect x="210" y="60" width="40" height="130" fill="#4facfe" rx="4"/>

      <!-- Labels -->
      <text x="50" y="195" font-size="12" fill="#666" text-anchor="middle">Jan</text>
      <text x="110" y="195" font-size="12" fill="#666" text-anchor="middle">Feb</text>
      <text x="170" y="195" font-size="12" fill="#666" text-anchor="middle">Mar</text>
      <text x="230" y="195" font-size="12" fill="#666" text-anchor="middle">Apr</text>

      <!-- Axis lines -->
      <line x1="20" y1="195" x2="270" y2="195" stroke="#ddd" stroke-width="1"/>
      <line x1="20" y1="30" x2="20" y2="195" stroke="#ddd" stroke-width="1"/>
    </svg>
  `;

  // Create chart container
  const chartContainer = document.createElement('div');
  chartContainer.className = 'claude-ext-chart';
  chartContainer.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 12px; color: #374151;">Extension Chart Demo</div>
    ${chartSvg}
  `;

  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    .claude-ext-chart {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      max-width: 320px;
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

  // Add chart to page
  document.body.appendChild(chartContainer);

  // Add version badge
  const versionBadge = document.createElement('div');
  versionBadge.className = 'claude-ext-version';
  versionBadge.textContent = 'v.0.4';
  document.body.appendChild(versionBadge);
}

injectChart();
console.log('✓ Claude HTML Renderer loaded - v.0.4');
