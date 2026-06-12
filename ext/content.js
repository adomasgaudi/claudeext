/**
 * Claude HTML Renderer Extension v.0.9.2
 *
 * Parse special markers from Claude responses:
 * - Font size: <!-- FONT-SIZE: 24 -->
 * - Render HTML: <!-- RENDER-HTML --> <button>Click</button>
 * Fixed: Decode HTML entities from text content
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
  // Search for RENDER-HTML marker in page text
  const bodyText = document.body.innerText;
  const markerIndex = bodyText.indexOf('<!-- RENDER-HTML -->');

  if (markerIndex !== -1) {
    // Found marker, extract everything after it until next comment or end
    let textAfterMarker = bodyText.substring(markerIndex + '<!-- RENDER-HTML -->'.length);

    // Extract lines until we hit another marker or end
    let lines = textAfterMarker.split('\n');
    let htmlContent = '';

    for (let line of lines) {
      // Stop at next comment
      if (line.includes('<!--')) break;
      // Skip empty lines at start
      if (!htmlContent && !line.trim()) continue;
      htmlContent += line + '\n';
    }

    htmlContent = htmlContent.trim();

    if (htmlContent) {
      // Decode HTML entities that appear in the text
      const parser = new DOMParser();
      const decoded = parser.parseFromString(htmlContent, 'text/html').documentElement.textContent;

      // Actually, let's just use a simple entity decoder
      const textarea = document.createElement('textarea');
      textarea.innerHTML = htmlContent;
      const decodedHTML = textarea.value;

      // Create container for rendered HTML
      const container = document.createElement('div');
      container.className = 'claude-ext-html-render';
      try {
        container.innerHTML = decodedHTML;
      } catch (e) {
        // If that fails, try the original
        container.innerHTML = htmlContent;
      }

      // Replace or insert
      const existingRender = document.querySelector('.claude-ext-html-render');
      if (existingRender) {
        existingRender.replaceWith(container);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }

      console.log('✓ Rendered HTML:', decodedHTML.substring(0, 50) + '...');
      alert('HTML rendered on page!');
    } else {
      alert('Found marker but no HTML content after it');
    }
  } else {
    alert('No RENDER-HTML marker found in page');
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
      padding: 6px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-weight: 600;
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

  const versionBadge = document.createElement('div');
  versionBadge.className = 'claude-ext-version';
  versionBadge.textContent = 'v.0.9.2';
  document.body.appendChild(versionBadge);

  console.log('✓ Claude HTML Renderer loaded - v.0.9.2');
}

injectElements();
