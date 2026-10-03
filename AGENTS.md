# Power Places — agent working context

Educational grid-building game: build the electrical network behind a growing village, and see how supply, demand,
voltage, storage and timing work. Audience 12–18 plus curious adults. Web first (Three.js + TypeScript + Vite),
wrapped for iOS/Android (Capacitor) and later Steam.

Read `PROJECT_STATUS.md` first. Then read the doc for the area you touch:

| Area | Doc |
|---|---|
| What the player sees and does; stages; acceptance | `docs/MVP_SPEC.md` |
| Rules, formulas, balance numbers, science boundaries | `docs/SIMULATION.md` |
| Visual language, layout, components, tokens, icons, motion, sound | `docs/DESIGN_LANGUAGE.md` |
| Words, tone, glossary, copy templates, copy lint | `docs/VOICE_AND_COPY.md` |
| Code structure, data flow, platforms, tests, milestones, review protocol | `docs/ARCHITECTURE.md` |
| Asset provenance | `docs/ASSETS.md` |
| Post-MVP chapters (robotaxis, AI data centres) | `docs/CHAPTERS_NEXT.md` |
| Why the design changed from the seed | `docs/reviews/DESIGN_REVIEW_2026-09-29.md` |
| Original design package (history only) | `seed/game-design-v1/` |

Reference projects by the same owner (read, copy patterns, never import): Cool Places
`Z:/Projects/Repositories/CoolPlaces/coolplaces` (same stack, deterministic puzzle, Blender assets, navigation,
labels, audit) and Paint Clouds `Z:/Projects/Repositories/cloudcanvas/cloudcanvas` (UI tokens, control families,
copy inventory, publishing).

## Rules

- `seed/` is historical input. Current docs and owner decisions win over it.
- One fact lives in one doc. Rules and numbers only in `SIMULATION.md`; UI values only in `DESIGN_LANGUAGE.md`;
  words only in `VOICE_AND_COPY.md` and `src/content/copy/`. Link, don't copy.
- `src/sim/` is pure and deterministic: no DOM, Three.js, timers, `Math.random`, `Date`, `Math.pow` or trig.
  Rendering and UI never compute or change electrical results. Preview, run, Check day, hints and the audit share
  one `simulate()`.
- Every player-facing string goes through the copy module and passes `npm run lint:copy`. Science wording in
  `VOICE_AND_COPY.md` §3 is binding.
- Icons are Phosphor only; each `ph-*` class used needs its glyph in `src/ui/icons.css`. Use `--pp-*` tokens, not
  literals. Reuse a control family before adding one.
- Levels change only with a passing `npm run levels:audit`; tune balance numbers through the audit, never by feel.
- After gameplay changes run `npm test`, `npm run typecheck`, `npm run build`, and the audit. Verify UI/input changes
  in a real browser at the viewports in `DESIGN_LANGUAGE.md` §4.3. Iterate with focused checks; run everything
  before handing off.
- Keep docs current: update `PROJECT_STATUS.md` (date + next action) after meaningful work; update the owning doc
  when behaviour changes, in the same change.
- Surgical changes. No new dependencies without a decision entry in `ARCHITECTURE.md` §10.
- Binary assets through Git LFS (`.gitattributes`). Blender source is `assets/build_assets.py`; never hand-edit
  generated GLBs.
- No deployment, store action, remote push, asset purchase or paid generation without the owner's request for that
  job. Never commit credentials.

## Model workflow

Skills live in `.agents/skills/` (Codex) and `.claude/skills/` (Claude Code). Shared skills (`game-feel`,
`game-ui-ux`, `input-systems`, `science-copy`) are mirrored with `python3 tools/sync_skills.py` (`--check` to verify);
edit the `.agents/` copy.

| Role | Model | Does |
|---|---|---|
| Architecture, direction, end-result review | Opus 5.5 (Claude Code) | Owns `docs/`; reviews ◆ milestones (`ARCHITECTURE.md` §9) |
| Plan critique and code review | Codex **Astra** (`gpt-6-astra`, high) | Critiques plans, reviews diffs independently |
| Implementation | Codex **Sol** (`gpt-6.1-sol`, xhigh) | Implements plans and fixes |

- `$feature-loop` (Codex): Astra plan critique → Sol implementation → Astra review. Default for milestones.
- `$opus-loop` (Codex): Opus opening discussion and closing review around Sol/Astra. Use for architectural changes.
- `$opus-review` (Codex): one tool-free Opus opinion via `scripts/opus_review.py` (needs `claude` CLI ≥ 2.1.280).
- `codex-consult` (Claude Code): ask Codex for a read-only review or concept art.
- Game skills: `game-feel`, `game-ui-ux`, `input-systems`; project skill: `science-copy`.

Task records go in `.ai/features/<slug>/` (brief, plan, status, packets, reviews). Shared skill source:
`GeorgiKostov/studiokostov`, branch `codex/shared-agent-skills`, folder `agent-skills/skills/` (copied from
`handsfreeinc` on 29 Sep 2026; Sol model id updated to `gpt-6.1-sol`).
