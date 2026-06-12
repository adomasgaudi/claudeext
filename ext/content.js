/**
 * Claude HTML Renderer Extension
 *
 * Simple test: Turn all text blue on Claude chat
 */

function makeTextBlue() {
  const style = document.createElement('style');
  style.textContent = `
    body * {
      color: blue !important;
    }
  `;
  document.head.appendChild(style);
}

makeTextBlue();
console.log('✓ Claude HTML Renderer loaded - text turned blue');
