/**
 * Claude HTML Renderer Extension v.0.4
 *
 * Dynamic chart that updates based on Claude responses
 */

let messageCount = 0;
const chartData = [70, 110, 90, 130];

function generateChartSvg(data) {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
  const maxHeight = 130;

  let bars = '';
  data.forEach((height, i) => {
    const x = 30 + i * 60;
    const y = 195 - height;
    bars += `<rect x="${x}" y="${y}" width="40" height="${height}" fill="${colors[i]}" rx="4"/>`;
  });

  const labels = data.map((val, i) => {
    const x = 50 + i * 60;
    return `<text x="${x}" y="195" font-size="12" fill="#666" text-anchor="middle">${val}</text>`;
  }).join('');

  return `
    <svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="200" fill="#f9fafb"/>
      ${bars}
      ${labels}
      <line x1="20" y1="195" x2="270" y2="195" stroke="#ddd" stroke-width="1"/>
      <line x1="20" y1="30" x2="20" y2="195" stroke="#ddd" stroke-width="1"/>
    </svg>
  `;
}

function updateChart() {
  // Update chart data based on response
  messageCount++;
  const newValues = chartData.map(v => Math.max(40, v + Math.random() * 40 - 20));
  const chartSvg = generateChartSvg(newValues);

  const chartDiv = document.querySelector('.claude-ext-chart');
  if (chartDiv) {
    const svgContainer = chartDiv.querySelector('div:last-child');
    if (svgContainer) {
      svgContainer.innerHTML = chartSvg;
    }
  }
}

function injectChart() {
  const chartSvg = generateChartSvg(chartData);

  const chartContainer = document.createElement('div');
  chartContainer.className = 'claude-ext-chart';
  chartContainer.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 12px; color: #374151;">Response Data</div>
    <div>${chartSvg}</div>
  `;

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

  document.body.appendChild(chartContainer);

  const versionBadge = document.createElement('div');
  versionBadge.className = 'claude-ext-version';
  versionBadge.textContent = 'v.0.4';
  document.body.appendChild(versionBadge);

  // Watch for new Claude responses
  const observer = new MutationObserver(() => {
    updateChart();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

injectChart();
console.log('✓ Claude HTML Renderer loaded - v.0.4 (dynamic chart)');
