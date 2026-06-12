# Claude HTML Renderer Extension & Token Cost Tracking

## Project Overview

This repository contains two complementary tools for the Claude Code environment:

1. **Claude HTML Renderer Extension** — A Chrome/Edge extension that detects HTML code blocks in Claude chat starting with `<!-- RENDER -->` and shows a collapsible live preview iframe above the code block.
2. **Token Cost Tracking** — An automated Stop hook that parses session transcripts to display exact token costs per turn and cumulatively across the session.

## Claude HTML Renderer Extension

### Structure
- `ext/manifest.json` — Manifest v3, runs on `claude.ai`
- `ext/content.js` — MutationObserver watches for new messages, finds code blocks containing `<!-- RENDER -->`, inserts a sandboxed iframe preview with a toggle button
- `ext/style.css` — Styling for the toggle button + iframe
- `ext/README.md` — Install instructions for end users
- `claude-html-renderer.zip` — Pre-packaged extension for direct download

### Installation
Users: `chrome://extensions` → Developer mode → Load unpacked → select `ext/` folder. Download link available in `ext/README.md`.

### Current Status
- **Status**: Under development
- **Known Issue**: The `<!-- RENDER -->` test did not show the ▼ Preview button. Root cause unknown — likely either (a) Claude's chat DOM structure uses a different selector than `pre code` / `pre`, or (b) the extension isn't active on the `claude.ai` domain.
- **Next Step**: Fix `content.js` to match the actual DOM selectors Claude's chat uses for code blocks. Can inspect `claude.ai`'s DOM via DevTools (F12 → Console) or check session console output for errors.

### Testing
Check extension status with console command in Claude chat:
```
F12 → Console → look for "✓ Claude HTML Renderer loaded"
```

## Token Cost Tracking

### Overview
An automated Stop hook (runs after every turn) that parses the Claude Code session transcript JSONL and prints exact token costs.

### Implementation
- **Script**: `scripts/show-cost.py`
- **Hook Configuration**: `.claude/settings.json` (project-level Stop hook)
- **Data Source**: `~/.claude/projects/.../session.jsonl` (auto-discovered by most recent modification time)
- **Output Format**: Shows input tokens, total, cache size, output tokens, turn cost, and session total

Example output:
```
#19 (give me a summary) input: 45 | total: 1,203 | cache: 412,000 | out: 312 | turn: $0.0421 | session: $17.89
  tokens  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░
  cost ↗  ▁▁▂▁▁▁▁▁█▁▁▁▁▁▁
```

## Development Workflow

### Branch & Version Management
**Important**: Always follow this workflow to maintain consistency:

1. **Develop on designated branch**: All changes go to `claude/funny-cray-ydbigy`
2. **Update version everywhere**:
   - Extension version in `ext/manifest.json` (`"version": "X.Y.Z"`)
   - Version in `ext/README.md` (mention current version in install/download section)
   - Version in main README (if applicable)
   - Any version references in scripts or config
3. **Commit** with clear, descriptive messages
4. **Push to dev branch** with `git push -u origin claude/funny-cray-ydbigy`
5. **Merge to main** — when feature is complete, merge the dev branch into `main`
6. **Deploy** — push to `main` for live deployment

### Main Branch Strategy
- **`main`** = production branch (always deployable)
- **`claude/funny-cray-ydbigy`** = development branch
- **Workflow**: Develop → Commit → Push to dev → Merge to main → Deploy
- All releases and live changes go through `main` branch only

### Git Push
- Use `git push -u origin <branch-name>` for first push
- If network errors occur, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

### Package & Distribute
After merging to main:
- Update `claude-html-renderer.zip` by zipping the `ext/` folder
- Ensure `ext/README.md` has the latest download link and version

## Key Files to Check

- `ext/manifest.json` — Check version and permissions
- `ext/content.js` — Main extension logic; DOM selectors need validation against actual Claude chat structure
- `.claude/settings.json` — Stop hook configuration for token cost tracking
- `scripts/show-cost.py` — Token cost calculation and display logic

## Common Tasks

### Fixing DOM Selectors in content.js
1. Open Claude chat: `claude.ai`
2. Open DevTools: `F12`
3. Inspect a code block to see actual DOM structure
4. Update selectors in `ext/content.js` to match real structure
5. Reload extension: `chrome://extensions` → click reload icon

### Viewing Token Costs
Costs are automatically displayed after each turn (if Stop hook is configured). Look for the formatted output with input/output tokens and cost breakdown.

### Packaging the Extension
```bash
cd ext/
zip -r ../claude-html-renderer.zip .
```

## Future AI Instructions

- **Always check version** before marking tasks complete — it should be updated in all relevant files
- **Test in browser** for any UI changes — don't just verify code logic
- **Document DOM issues** if they arise — include actual selectors from `claude.ai`'s DOM
- **Keep this file updated** as new features or issues emerge

---

**Last Updated**: 2026-06-12  
**Current Branch**: `claude/funny-cray-ydbigy`  
**Current Version**: 1.2.0  
**Status**: Testing phase - simplified to blue text for basic functionality verification
