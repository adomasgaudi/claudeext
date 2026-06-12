# HANDOFF — Read This Before Doing Anything

This document is for the next AI working on this project. It contains the goal, the full
history, where the previous AI (me) drifted from what the user wanted, the verified data
sources, and the DOM structure of the page we're modifying. Read all of it.

---

## 1. THE ACTUAL GOAL (in the user's own words, reconstructed)

The user wants to see the **EXACT** token count and cost **for every single prompt**,
displayed in/around the chat. Not estimates. Not word counts. The exact numbers Claude's
API reports.

The exact desired output format (from a previous project where this was SOLVED):

```
#17 (I'dd like to see it) input: 52 | total: 457 | cache: 632,488 | out: 4,184 | turn: $0.1013 | session: $17.2855
```

That is: `#<prompt number> (<first ~5 words of the prompt>) input: <fresh input tokens> |
total: <cumulative fresh input> | cache: <cache read+write> | out: <output tokens> |
turn: $<cost> | session: $<running total>`

The user also wants this visible **in the UI** — they asked for it next to the model name
under the input box, and in the extension badge. Both displays must show **real** numbers.

---

## 2. THE PROVEN SOLUTION (already worked in a previous project — DO THIS)

**Claude Code writes a session transcript JSONL inside this very container, and it
contains the exact usage of every API call.** No proxy, no browser extension scraping,
no estimation needed. The data is on disk.

### Verified in THIS container (2026-06-12):

- Transcript path: `/root/.claude/projects/-home-user-claudeext/f91a13ee-75ec-5a50-830b-c7bb0a2554f5.jsonl`
  (2.5 MB and growing). Auto-discover it: most recently modified `*.jsonl` under
  `~/.claude/projects/*/`.
- Each assistant message line contains:

```json
"model": "claude-fable-5",
"usage": {
  "input_tokens": 2,
  "cache_creation_input_tokens": 11218,
  "cache_read_input_tokens": 336464,
  "output_tokens": 3132,
  "server_tool_use": {"web_search_requests": 0, "web_fetch_requests": 0}
}
```

- One **turn** = many API calls (one per tool use). Sum all assistant-message usage
  entries since the last user (human) prompt line to get the turn's totals.
- User prompt lines contain the prompt text — use the first ~5 words for the label.

### How to wire it (what the previous project did):

1. `scripts/show-cost.py` — parses the transcript, groups calls by turn, prices them
   per model, prints the one-line format above plus a session total.
2. Stop hook in `.claude/settings.json` runs it after every turn. The hook should output
   JSON with a `systemMessage` field (or plain stdout) so it displays in the chat.
3. The script must **auto-discover** the transcript (the hook does not pass the path
   reliably) and must read the **model from each line** (the user switches models
   mid-session via `/model` — this session has 262 calls on `claude-haiku-4-5-20251001`
   and 18+ on `claude-fable-5`).

### CORRECT pricing (per million tokens) — the previous AI used WRONG prices:

| Model | Input | Output |
|---|---|---|
| claude-fable-5 / Mythos 5 | $10.00 | $50.00 |
| claude-opus-4-8 / 4-7 / 4-6 | $5.00 | $25.00 |
| claude-sonnet-4-6 | $3.00 | $15.00 |
| claude-haiku-4-5 | $1.00 | $5.00 |

- Cache **reads**: 0.1× input price.
- Cache **writes**: 1.25× input price (5-min TTL) or 2× (1-hour TTL).
- Thinking tokens: billed at input rate (they're in output_tokens in the transcript).
- A model switch mid-session invalidates the prompt cache → expensive cache rewrite.

If unsure about pricing, verify with the `/claude-api` skill — do NOT guess.

---

## 3. HOW THE PREVIOUS AI DRIFTED (so you don't repeat it)

1. **Fabricated token counts.** I ended every reply with lines like
   `Tokens: 720 ($0.0012) | Session: 52,410 ($0.0838)`. These were **made up** —
   word-count-of-my-reply × 1.3. They ignored: the conversation context resent every
   turn (~336K cache tokens per call!), tool calls, thinking tokens, images/HTML dumps
   the user pasted, and the actual model. The real session was an order of magnitude
   bigger than my numbers. The user caught this. Never print a number as if it's real
   when it's a guess — either parse the transcript or say "estimate".

2. **Built estimation instead of measurement.** The extension's badge counts words in
   `document.body.innerText` × 1.3. This is wrong twice over: (a) it's an estimate,
   (b) the chat transcript is **virtualized** (`[data-testid="epitaxy-virtual-transcript"]`,
   `contain: strict`, absolute-positioned rows) — old messages are unloaded from the DOM,
   so innerText only sees the visible window.

3. **Wrong pricing.** `.claude/token-cost-calculator.sh` uses Haiku $0.80/$2.40 and
   Opus $15/$60 — wrong (see correct table above). It also reads
   `$PROJECT_DIR/.claude/session.jsonl` which **does not exist** — the real transcript
   is under `~/.claude/projects/`. That script never produced a real number.

4. **Hardcoded the model.** The extension assumes "Haiku 4.5". The user switched to
   Fable 5 via `/model` and the badge kept saying Haiku. Read the model from the
   transcript lines (authoritative) or from the model-selector button in the DOM.

5. **Repeatedly forgot version bumps** despite the #never rule (see §5).

6. **Flailing fixes.** Early on I attempted 4-5 consecutive fixes to HTML rendering
   without learning anything between attempts. The user's rule: max 2-4 fix attempts,
   then make the task smaller or switch tasks (see §5, three-level strategy).

---

## 4. THE PAGE WE'RE MODIFYING — claude.ai/code web UI ("epitaxy") DOM REFERENCE

The user provided a full HTML dump on 2026-06-12. Key verified selectors:

### Transcript (virtualized — only visible rows exist in DOM!)
- Scroller: `[data-testid="epitaxy-virtual-transcript"]` — `overflow-y-auto`, `contain: strict`
- Rows: `div[data-index="N"]` inside an absolutely-positioned translated container
- Message entries: `[data-epitaxy-entry="msg_<id>"]` (assistant) or `[data-epitaxy-entry="<uuid>"]` (user)
- Assistant content: `.epitaxy-markdown` (rendered markdown: `<p>`, `<h2>`, `<ul>`…)
- User messages: `.epitaxy-user-turn` → `p.text-body.whitespace-pre-wrap`

### Code blocks — IMPORTANT, this is why earlier selector hunts failed
- Container: `.epitaxy-codeblock` → `div[data-code-text="<RAW CODE HERE>"]`
  — **the raw code text lives in the `data-code-text` attribute!**
- The rendered code is inside `<diffs-container><template shadowrootmode="open">` —
  a **shadow DOM**. `document.querySelectorAll('pre, code')` does NOT see inside it.
- Inline code: `code[data-epitaxy-inline-code]`
- Takeaway: to extract code from the chat, read `[data-code-text]` attributes.
  This likely unblocks the original HTML-rendering feature (Level 3 task).

### Composer (input area, bottom)
- Input: `.epitaxy-prompt-input` → `div.tiptap.ProseMirror[contenteditable="true"]`
  (TipTap editor, NOT a textarea). Placeholder: "Type / for commands".
- Model selector: a dropdown `button` in the bottom-right row whose visible text is the
  model name (e.g. `<span class="...">Fable 5</span>`, previously "Haiku 4.5") —
  `aria-haspopup="menu"`. Read the live model from here on the browser side.
- Effort button (e.g. "High"), and a usage ring `button[aria-label^="Usage:"]`
  (e.g. `aria-label="Usage: context 16%, plan 42%"`) — Claude's own context meter;
  potentially scrapeable.
- Branch row above composer: repo name, branch (`claude/funny-cray-ydbigy`),
  diffstat (`+469 −43`), "Create PR" button.
- The page styles use CSS `@layer` + Tailwind-style utility classes; extension
  stylesheet rules can be overridden — **use inline styles** for injected elements
  that must keep their look (this fixed the bold-model-name bug in v0.21).

---

## 5. PROJECT RULES (the user enforces these — violations got called out)

1. **Version bump on EVERY commit** (#never). Update ALL of:
   `ext/manifest.json`, `ext/popup.html`, `ext/content.js` (header comment AND
   console.log AND badge string), `CLAUDE.md` footer. Format `v.X.Y` — two digits
   only, always increment (v.0.21 → v.0.22), never patch versions, never skip.
   A `.git/hooks/pre-commit` enforces matching versions + blocks MutationObserver —
   note: **git hooks don't transfer via clone**; recreate it in a fresh container.
2. **NO MutationObserver** — broke the whole page in v0.4. Static injection only.
3. **Performance** — the extension was making Claude lag. No heavy DOM queries on
   intervals against huge trees, no global listeners.
4. **Three-level work strategy**: Level 1 = safe upgrades on working features;
   Level 2 = "parallel experience" (slightly risky, learn things); Level 3 = the
   stuck/failing task — probe to LEARN, don't grind. After 2-4 failed fix attempts,
   stop fixing: shrink the task or switch levels.
5. **#debug**: exponential approach (1/10th → 2/10th → 4/10th) ONLY for broken things.
6. **End every reply** with: summary of what happened, the version, and the token/cost
   line. The token line must be REAL (from the transcript) — if you can't get real
   numbers yet, label estimates as estimates explicitly.
7. Commit to `claude/funny-cray-ydbigy`, push with `git push -u origin <branch>`.

---

## 6. SESSION HISTORY (condensed timeline)

- **v0.1–v0.8**: Extension basics — badge, chart, font-size marker parsing
  (`<!-- FONT-SIZE: 24 -->`). v0.4 MutationObserver disaster → banned.
- **v0.9–v0.12**: HTML rendering from `<!-- RENDER-HTML -->` marker. Extraction from
  `innerText` proven in v0.11; rendering attempts failed repeatedly.
- **v0.13–v0.14**: More failed extraction fixes (marker matched my own explanation text,
  not code blocks). User taught the 2-4-attempts rule and three-level strategy.
- **v0.15**: Debug probing found "Claude uses `<CODE>` elements" — incomplete finding;
  the real answer is shadow DOM + `data-code-text` attributes (§4).
- **v0.16**: `.claude/token-cost-calculator.sh` + settings.json statusLine/Stop hook —
  wrong prices, wrong transcript path, never worked.
- **v0.17**: Token counter under the Claude input (estimates).
- **v0.18–v0.19**: Badge shows session/last/avg(10) token estimates (word counts).
- **v0.20–v0.21**: Model name in badge ("Haiku" hardcoded), bold fixed via inline
  styles, badge made collapsible (click toggles, ▸/▾).
- **Throughout**: I printed fake per-reply token/cost lines; user discovered they were
  guesses and pointed to the previous project's transcript-parsing solution. → This doc.

---

## 7. CURRENT REPO STATE

- Branch: `claude/funny-cray-ydbigy`. Version: **v.0.22** (this doc's commit).
- `ext/` — manifest.json (MV3, runs on `*://claude.ai/*`), content.js (badge,
  buttons, token estimates, render attempts), popup.html, style.css, README.md
  (stale, still says v0.9.1).
- `.claude/settings.json` — statusLine + Stop hook pointing at
  `.claude/token-cost-calculator.sh` (**broken**: wrong prices, wrong path; replace it).
- `.claude/token-tracking.md` — manual estimate log (obsolete once real parsing works).
- `scripts/` — referenced by CLAUDE.md (`scripts/show-cost.py`) but **the script does
  not exist in this repo yet**. CLAUDE.md describes the target state. Build it.
- `.git/hooks/pre-commit` — version-match + MutationObserver guard (local only).

## 8. WHAT TO DO NEXT (priority order)

1. **Build `scripts/show-cost.py`** per §2: auto-discover transcript, per-line model,
   correct pricing, turn grouping, the exact output format from §1. Replace the broken
   `.sh` in `.claude/settings.json` with it. Test by running it directly first
   (`python3 scripts/show-cost.py`) — it should print real numbers for this session.
2. **Fix the extension badge** to stop pretending: either feed it real numbers (it
   can't read the container's transcript from the browser — consider showing Claude's
   own usage ring data scraped from `button[aria-label^="Usage:"]`, and the live model
   from the model-selector button) or clearly label it "estimate".
3. **Revisit the Level-3 HTML rendering task** with the §4 discovery
   (`[data-code-text]` attribute + shadow DOM) — this is the missing piece that
   the earlier selector hunts never found.
