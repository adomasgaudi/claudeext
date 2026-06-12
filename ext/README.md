# Claude HTML Renderer Extension

**Version: v.0.8**

A browser extension that renders HTML code blocks in Claude chat as live previews.

## How it works

1. I output HTML code in a code block starting with `<!-- RENDER -->`
2. The extension detects it
3. A collapsible preview appears showing the rendered HTML

## Installation

### Chrome / Edge

1. Go to `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `ext/` folder
5. The extension appears in your toolbar

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file in this folder
4. Done (temporary, reloads when you restart Firefox)

For permanent Firefox installation:
- Package as `.xpi` and submit to Mozilla Add-ons (requires signing)
- Or: edit `manifest.json` to add `"browser_specific_settings"` with `gecko_id`

## Testing

**Current version (v.0.8)**: Parses LATEST marker from Claude responses.

When you load the extension and visit claude.ai:
1. **Chart** (top-right): Static bar chart
2. **Apply Font Size button** (top-left): Scans for the MOST RECENT FONT-SIZE marker
3. **Version badge** (bottom-right): Shows "v.0.8"

How to use:
1. Ask Claude to output a marker like: `<!-- FONT-SIZE: 24 -->`
2. Claude outputs the marker
3. Click "Apply Font Size" button
4. Extension finds the LATEST marker and updates chat text size

Console message:
```
✓ Claude HTML Renderer loaded - v.0.7 (parses FONT-SIZE marker)
```

## Usage

When I output HTML like this in a code block:

````
```html
<!-- RENDER -->
<!DOCTYPE html>
<html>
<head>
  <title>Chart</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div style="height: 300px">
    <canvas id="myChart"></canvas>
  </div>
  <script>
    new Chart(document.getElementById('myChart'), {
      type: 'bar',
      data: { labels: ['A','B','C'], datasets: [{ label: 'Data', data: [10,20,30] }] }
    });
  </script>
</body>
</html>
```
````

The extension will:
1. Find the code block
2. Add a **Preview** button above it
3. Click to expand and see the rendered HTML

## Security

- HTML is rendered in an **iframe with sandbox**, so scripts can't access Claude's page
- External CDNs (Chart.js, etc.) are allowed via `<script src>`
- No access to your data, history, or API key

## Troubleshooting

- **Extension not working?** Make sure Developer mode is on, and the extension is enabled in your Extensions menu
- **Preview not showing?** Refresh the page, or click the extension icon → check if it's active
- **Scripts not running?** Make sure the `<!-- RENDER -->` marker is on the first line of the HTML block
- **Chart not showing (v.0.4)?** Check console with F12 → Console, look for the message. The chart should appear in the top-right corner, version badge in bottom-right. If you don't see them, the extension may not have injected properly.
