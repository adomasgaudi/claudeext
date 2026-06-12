/**
 * Claude HTML Renderer Extension
 *
 * Simple test: Turn all text red on Claude chat
 */

function makeTextRed() {
  const style = document.createElement('style');
  style.textContent = `
    body * {
      color: red !important;
    }
  `;
  document.head.appendChild(style);
}

makeTextRed();
console.log('✓ Claude HTML Renderer loaded - text turned red');
