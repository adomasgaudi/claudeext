/**
 * Claude HTML Renderer Extension
 *
 * Highlight Claude's responses: yellow text + bigger font
 */

function highlightClaudeResponses() {
  const style = document.createElement('style');
  style.textContent = `
    /* Target Claude's response messages */
    [data-message-role="assistant"],
    [data-role="assistant"],
    .message.assistant,
    .response,
    [class*="response"][class*="message"],
    [class*="assistant"] {
      color: yellow !important;
      font-size: 1.2em !important;
    }
  `;
  document.head.appendChild(style);
}

highlightClaudeResponses();
console.log('✓ Claude HTML Renderer loaded - Claude responses highlighted yellow');
