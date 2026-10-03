---
name: science-copy
description: >
  Write or review Power Places player-facing text and teaching content so it is short, simple enough for a
  distracted 12-year-old, consistent with the glossary, and scientifically correct about electricity (power vs
  energy, voltage, transformers, batteries, solar, losses). Use when adding or changing UI strings, tips, hints,
  diagnosis cards, field notes, store/marketing copy, or when reviewing a diff that touches src/content/copy/.
---

# Science copy (Power Places)

The canonical rules are in `docs/VOICE_AND_COPY.md` (voice, ten rules, science wording, glossary, templates, lint)
and `docs/SIMULATION.md` §9 (what the game must never teach). This skill is the working procedure; do not restate
those docs elsewhere.

## Writing

1. Find the string type: label (≤ 4 words), goal/tip (≤ 12), placement reason (≤ 8), explanation sentence (≤ 20),
   field note (two sentences + one real-world number).
2. Check whether a key already says this. Reuse the key; never create a second wording of the same fact.
3. Lead with the thing; one idea per sentence; say what to do *or* what happened.
4. Use only glossary terms. First appearance of a science term: term + short definition from the glossary.
5. Check the science table (VOICE_AND_COPY §3). Common traps: transformer "makes/boosts" power; battery "stores
   electricity"; kW used for energy; dots called electrons; "clean/free" solar; "runs out" for voltage drop.
6. Format numbers and units per §5 (`25 kW`, `10 kWh`, `18:30`, `11,000 V`).
7. Run `npm run lint:copy` and fix every finding.

## Reviewing a diff

For every changed string report: key, problem (rule number or science row), suggested rewrite. Separate
**science errors** (blocking) from **style** (non-blocking). Check that diagnosis numbers come from the diagnostic
fields, not hard-coded text, and that ideas never state the full solution.

## Quick self-test for any teaching text

- Would a 12-year-old who reads only the first three words know what it is about?
- Could a physics teacher object to any word? If yes, rewrite with the glossary term.
- Does the scene already show this? If yes, cut the text.
