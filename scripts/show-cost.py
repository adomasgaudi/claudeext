#!/usr/bin/env python3
"""
show-cost.py — exact per-turn token cost from the Claude Code session transcript.

The browser extension can only estimate from the context ring. The REAL data
is on disk: Claude Code writes a JSONL transcript in this container, and every
assistant message line carries the exact `usage` the API reported. This script
parses it, groups API calls into turns, prices each by its model (the user
switches models mid-session), and prints the cost of the latest turn plus the
running session total.

Run directly to see the whole session:   python3 scripts/show-cost.py
Wired as a Stop hook, it prints the latest turn after every reply.

Output (one line per turn):
  #17 (give me a summary) in: 52 | cache w/r: 11k/336k | out: 4,184 | turn: $0.1013 | session: $17.29
"""
import json
import glob
import os
import sys

# Prices per MILLION tokens (HANDOFF.md §2, verified — do NOT guess).
# input, output, cache_read (0.1x in), cache_write (1.25x in, 5-min TTL)
PRICING = {
    'claude-fable-5':   (10.0, 50.0),
    'claude-mythos-5':  (10.0, 50.0),
    'claude-opus-4-8':  (5.0, 25.0),
    'claude-opus-4-7':  (5.0, 25.0),
    'claude-opus-4-6':  (5.0, 25.0),
    'claude-sonnet-4-6': (3.0, 15.0),
    'claude-haiku-4-5':  (1.0, 5.0),
}


def price_for(model):
    for key, (inp, out) in PRICING.items():
        if model.startswith(key):
            return inp, out
    return 10.0, 50.0  # default to Fable-5 rate if unknown rather than $0


def cost_of(model, inp, cw, cr, out):
    pin, pout = price_for(model)
    return (inp * pin + cw * (pin * 1.25) + cr * (pin * 0.1) + out * pout) / 1_000_000


def find_transcript():
    cands = glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl'))
    cands += glob.glob('/root/.claude/projects/*/*.jsonl')
    cands = [c for c in set(cands) if os.path.getsize(c) > 0]
    if not cands:
        return None
    return max(cands, key=os.path.getmtime)


def text_of(msg):
    c = msg.get('content')
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        for p in c:
            if isinstance(p, dict) and p.get('type') == 'text':
                return p.get('text', '')
    return ''


def short(txt, n=5):
    words = txt.strip().split()
    s = ' '.join(words[:n])
    return s[:40] if s else '…'


def parse(path):
    """Return list of turns. A turn starts at a real user prompt and absorbs
    every assistant API call until the next user prompt."""
    turns = []
    cur = None
    for line in open(path):
        try:
            d = json.loads(line)
        except Exception:
            continue
        t = d.get('type')
        if d.get('isSidechain'):
            continue
        if t == 'user':
            msg = d.get('message', {})
            txt = text_of(msg)
            # Skip tool_result-only user lines and interrupt markers.
            if not txt or txt.startswith('[Request interrupted'):
                continue
            cur = {'label': short(txt), 'model': '', 'inp': 0, 'cw': 0, 'cr': 0, 'out': 0}
            turns.append(cur)
        elif t == 'assistant':
            msg = d.get('message', {})
            u = msg.get('usage')
            if not u or 'output_tokens' not in u:
                continue
            if cur is None:
                cur = {'label': '(start)', 'model': '', 'inp': 0, 'cw': 0, 'cr': 0, 'out': 0}
                turns.append(cur)
            cur['model'] = msg.get('model', cur['model'])
            cur['inp'] += u.get('input_tokens', 0)
            cur['cw'] += u.get('cache_creation_input_tokens', 0)
            cur['cr'] += u.get('cache_read_input_tokens', 0)
            cur['out'] += u.get('output_tokens', 0)
    return turns


def k(n):
    if n >= 1000:
        return f'{n/1000:.0f}k'
    return str(n)


def fmt(i, turn, session_cost):
    c = cost_of(turn['model'], turn['inp'], turn['cw'], turn['cr'], turn['out'])
    model = turn['model'].replace('claude-', '') or '?'
    return (f"#{i} ({turn['label']}) [{model}] "
            f"in: {turn['inp']:,} | cache w/r: {k(turn['cw'])}/{k(turn['cr'])} | "
            f"out: {turn['out']:,} | turn: ${c:.4f} | session: ${session_cost:.4f}")


def main():
    path = find_transcript()
    if not path:
        print('show-cost: no transcript found')
        return
    turns = parse(path)
    if not turns:
        print('show-cost: no priced turns yet')
        return

    session = 0.0
    lines = []
    for idx, turn in enumerate(turns, 1):
        session += cost_of(turn['model'], turn['inp'], turn['cw'], turn['cr'], turn['out'])
        lines.append(fmt(idx, turn, session))

    # Direct run: show all turns + a footer total. Hook: just the latest line.
    if '--all' in sys.argv or sys.stdout.isatty():
        print('\n'.join(lines))
        last = turns[-1]
        print(f"\nsession total: ${session:.4f}  ({len(turns)} turns, "
              f"latest turn ${cost_of(last['model'], last['inp'], last['cw'], last['cr'], last['out']):.4f})")
    else:
        print(lines[-1])


if __name__ == '__main__':
    main()
