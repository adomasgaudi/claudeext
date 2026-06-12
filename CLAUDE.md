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
- **Status**: Under development - Level 1-3 work in progress
- **DOM Discovery (v0.15)**: Claude uses `<CODE>` elements for inline code snippets, NOT `<pre>` or full code blocks
  - Found 12 code elements on page, all are `<CODE>` tags with class=""
  - This explains extraction failures - we were looking for wrong selectors
- **Next Step**: Research whether Claude has dedicated code block containers, or if HTML rendering needs different approach (shadow DOM, iframes, etc.)

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
- **`main`** = production branch (always deployable, source of truth)
- **`claude/funny-cray-ydbigy`** = development branch
- **Workflow**: Develop → Commit → Push to dev → **Merge to main** → **Push to main**
- **CRITICAL**: Always merge changes from dev to main and push to main
- All releases and live changes go through `main` branch only
- `main` is the canonical branch that gets deployed

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

## Critical Remember (#remember)

**⚠️ VERSION UPDATES — NON-NEGOTIABLE (#never)**
Before every git commit:
1. Update `ext/manifest.json` version field
2. Update `ext/popup.html` version display
3. Update `ext/content.js` version in header comment AND console.log
4. Update any other version references
**THIS IS NOT OPTIONAL. Not even once. No commits without version updates.**

**DO NOT add MutationObserver to the extension** — v.0.4 tried this and broke the whole page. It's too aggressive on the DOM. Keep everything static and simple.

**Don't repeat broken approaches** — If something failed (MutationObserver, dynamic updates), don't try it again unless we know it works in isolation first.

**Extension is making Claude lag** — Keep performance in mind. Avoid:
- Heavy DOM queries
- Complex CSS selectors
- Unnecessary DOM manipulations
- Global event listeners

**Versioning: 2 digits ONLY** (#remember)
- Format: v.X.Y (e.g., v.0.9, v.0.10, v.0.11)
- NO patch versions (no v.0.9.1, v.0.9.2, etc.)
- Always increment the 2nd digit: v.0.9 → v.0.10 → v.0.11
- Never go backwards or skip versions

## Debugging Methodology (#debug #remember)

**1/10th approach is ONLY for broken features, not for building known-good ones**
- Don't incrementally build features we already know work (badge, styling, injection)
- Use 1/10th, 2/10ths, 4/10ths ONLY when something is broken
- For new features: go full-speed, test once

**When something breaks: Exponential/doubling approach**
1. Start with 1/10th of the task complexity
2. Test it works
3. If yes → do 2/10ths, then 4/10ths, then 8/10ths, etc. (doubling)
4. If no → go to 1/100th (baby steps)

**Debugging philosophy: Component isolation**
- Check each component separately in isolation
- Start from what you KNOW works and build from there
- Don't re-test known-working components

**Example**: Chart broke the page
- ✓ We know v.0.3 (yellow text) worked
- ✗ v.0.4 (MutationObserver + chart) broke it
- Solution: Go back to yellow text (1/10th effort), add something tiny first

## Rule Adherence Levels & Enforcement (#remember)

Different rules require different enforcement mechanisms because documentation alone is not reliable:

### Level 1: Guidelines (Documented only)
**What**: Best practices, helpful patterns  
**Examples**: "test in browser", "keep performance in mind"  
**Enforcement**: Documented in CLAUDE.md, manual review  
**Why**: These are contextual and flexible, don't need hard blocking

### Level 2: Important (#remember)
**What**: Rules that should be followed consistently  
**Examples**: "use 1/10th debugging only when broken", "work in parallel on 3 levels"  
**Enforcement**: Documented in CLAUDE.md + referenced in commit messages  
**Why**: Important but allow flexibility if situation demands it

### Level 3: Critical (#never)
**What**: Absolute non-negotiable rules  
**Examples**: "DO NOT use MutationObserver", "always update version numbers"  
**Enforcement**: 
- Documented in CLAUDE.md with ⚠️ warning
- **Automated blocking via git pre-commit hook** (technical enforcement)
- Cannot be bypassed, system enforces it

**Current Critical Rules Needing Automation:**
- ✅ Version numbers must be updated in: manifest.json, popup.html, content.js (header + console.log)
  - Mechanism: Git pre-commit hook validates all 4 files have matching versions
  - Status: ✅ ACTIVE in `.git/hooks/pre-commit`
- ✅ DO NOT use MutationObserver
  - Mechanism: Git pre-commit hook blocks commits containing "MutationObserver" in content.js
  - Status: ✅ ACTIVE in `.git/hooks/pre-commit`

**How to ensure compliance:**
1. **Documentation** = readable but forgettable (Level 1-2)
2. **Git hooks** = automated, impossible to forget (Level 3)
3. **Code review** = human verification (backup)

## Three-Level Work Strategy (#remember)

Work on 3 parallel tracks to avoid getting stuck:
1. **Level 1 (Safe)**: Easy upgrades to stable features (documentation, UI polish, minor enhancements)
2. **Level 2 (Parallel Experience)**: Medium-difficulty tasks outside comfort zone but achievable (~1 bug per 5-10 prompts)
3. **Level 3 (Learn)**: Failing/stuck tasks — focus on understanding structure, not completing

When stuck on a task after 2-4 attempts: Don't keep trying fixes. Switch to Level 2 or Level 1, come back later with fresh perspective.

## Token Usage Tracking (#remember #never)

**EVERY RESPONSE must show exact token count at the end:**
- Format: `📊 Tokens: [count] | Session total: [cumulative]`
- Calculate based on: word count × 1.3 (with code adjustments +50%)
- Display after all substantial responses
- Track cumulatively in `.claude/token-tracking.md`
- Update session file with running total

**This is NON-NEGOTIABLE.** Every single response needs this.

### Automated Token Tracking Setup

**Status Line** (bottom bar):
- Shows: `📊 [tokens] tokens | $[cost] | [model] ([multiplier]×)`
- Updates every 2 seconds during work
- Command: `.claude/token-cost-calculator.sh --status`

**Stop Hook** (end of turn):
- Shows detailed breakdown: model, input/output tokens, costs, multiplier
- Configured in `.claude/settings.json`
- Runs after every turn to display cost summary

**Model Multiplier Pricing** (vs Sonnet baseline):
| Model | Input | Output | Multiplier |
|-------|-------|--------|-----------|
| Haiku | $0.80/M | $2.40/M | 0.27× |
| Sonnet | $3.00/M | $15.00/M | 1.00× |
| Opus | $15.00/M | $60.00/M | 5.00× |

## Future AI Instructions

- **Always update version before commit** — it should be updated in ALL relevant files (manifest.json, popup.html, content.js header, content.js console.log)
- **Test in browser** for any UI changes — don't just verify code logic
- **Document DOM issues** if they arise — include actual selectors from `claude.ai`'s DOM
- **Keep this file updated** as new features or issues emerge
- **When debugging**: Use exponential approach (1/10th → 2/10th → 4/10th → 8/10th)
- **Work in parallel**: Don't get stuck on one task — work on 3 levels simultaneously
- **Show token costs**: Display usage after major work blocks, track in token-tracking.md

---

**Last Updated**: 2026-06-12  
**Current Branch**: `claude/funny-cray-ydbigy`  
**Current Version**: v.0.28  
**Versioning**: v.X.Y (2 digits only - v.0.10, v.0.11, etc.)  
**Status**: v0.28 — delta tracking now uses the precise float % from the usage ring's SVG geometry (integer aria-label missed turns under 1% / ~2,000 tok), logs a console line per recorded episode, and the table notes when tracking has just started (log empty = all zeros until the next prompt). Read HANDOFF.md first.
