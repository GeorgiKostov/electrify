# Power Places — Architecture

Version 0.1 · 29 Sep 2026 · Owner: architecture (Opus) · Status: approved direction; details may change through
reviewed decisions (§10)

The initial architecture and direction for implementation. The rules it implements are in
[SIMULATION.md](SIMULATION.md); what the player sees is in [MVP_SPEC.md](MVP_SPEC.md).

**Implemented web core (30 Sep 2026):** `src/game/{types,levels,commands,progression,save}.ts`,
`src/content/{profiles,goals,witnesses}.ts`, `src/sim/{network,simulate}.ts`, `src/render/scene.ts` and
`src/main.ts` provide the functioning six-stage game. The 3 Oct UX review pass extracts the concrete
`game/session.ts` (committed/held state and undo), `game/controller.ts` (commands, persistence, playback and one
refresh coordinator), `input/map-input.ts`, and `ui/{hud,tray,timeline,inspector,overlays}.ts`. Bootstrap remains
in `main.ts`; no framework or new runtime dependency was added. `ui/dom.ts` skips unchanged sections and
retains focus, text selection, Details and scroll on changed sections. `src/game/pointer.ts` now owns latched map gestures and
`src/render/navigation.ts` owns tested ray-to-ground camera and grab math. The layout below records the longer architecture direction,
not a claim that every proposed module, GLB, audio bus, native shell or performance tier exists. The current map
uses procedural Three meshes, direct overhead line spans and Manhattan tile costs. Render topology and grid
are cached; step changes update materials, windows, loading gauges, battery fill, selection and instanced
flow cues in place. `render/daylight.ts` interpolates visual time separately from the simulation cursor;
`render/network-view.ts` owns deterministic visual attachment offsets shared by cables and signed flow cues.
These offsets do not change stored coordinates, lengths, reach or electrical rules. `StepResult.demand`
exposes the demand already computed by the simulator for UI inspection. `docs/LEVEL_AUDIT.md` records
the tested witness results. The owner stopped this pass at the functioning web core.

**Starting point.** Cool Places (`Z:/Projects/Repositories/CoolPlaces/coolplaces`) is the reference implementation
for this stack: deterministic rules separate from Three.js rendering, DOM UI over a canvas, Blender CLI assets,
Capacitor shells, solver-backed puzzle audit. Read its `AGENTS.md`, `docs/GDD.md` §4, §11 and `src/` before starting.
**Copy patterns and code deliberately; don't import from it or share a package.** Same owner, so reuse is allowed.

---

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript, `strict` | No `any` in `src/sim` and `src/game`. |
| Build | Vite | Same scripts shape as Cool Places. |
| Rendering | Three.js (WebGL 2) | Pin one version at bootstrap. WebGPU is post-MVP. |
| UI | Plain DOM + CSS modules per component, `src/ui/tokens.css` | No React, no state library, no ECS. |
| Fonts / icons | `@fontsource-variable/manrope`, `@phosphor-icons/web` (bundled, subset glyph CSS) | Same approach as Cool Places `icons.css`. |
| Tests | `node:test` via `tsx` | Sim, content, audit, copy lint, icons. |
| Assets | Blender 4.x/5.x CLI → GLB, `assets/build_assets.py` | Flat colours, no textures. Thumbnails rendered by script. |
| Native | Capacitor (iOS, Android) | Shells consume `dist/`. |
| Desktop / Steam | Post-MVP wrapper (§6) | Nothing in `src/` may assume Node or Electron. |

Dependencies beyond these need a decision entry (§10).

## 2. Repository layout

```
/
├── AGENTS.md  CLAUDE.md  README.md  PROJECT_STATUS.md
├── docs/                 canonical design + architecture docs, reviews/
├── seed/                 historical input (original design package). Read-only.
├── .ai/features/<slug>/  task records for agent workflows (brief, plan, status, reviews)
├── .agents/skills/       Codex skills (source of truth for shared skills)
├── .claude/skills/       Claude Code skills (shared ones mirrored by tools/sync_skills.py)
├── tools/                repo tooling (skill sync)
├── assets/               Blender build script + .blend sources (LFS)
├── public/models/        generated GLBs (LFS) · public/thumbs/ generated tool thumbnails
├── scripts/              audit-levels.ts, build-assets.mjs, check-assets.mjs, lint-copy.ts
├── src/
│   ├── sim/              PURE. No DOM, no Three, no timers, no Math.random.
│   │   ├── types.ts      network, objects, schedules, results
│   │   ├── network.ts    build graph from state; validity rules; LV sections; reach
│   │   ├── profiles.ts   hourly → 96-step expansion (cached)
│   │   ├── step.ts       one 15-min step: demand, solar, battery intent, radial flow, limits, losses
│   │   ├── simulate.ts   two-day run → DayResult (day 2)
│   │   ├── metrics.ts    goals, stars, metrics from DayResult
│   │   └── diagnostics.ts first failure + attached informational codes
│   ├── game/             pure-ish game state: commands, undo, placement rules, routing, saves (no Three)
│   │   ├── state.ts      committed stage state; immutable updates
│   │   ├── commands.ts   place, connect, move, remove, upgrade, schedule; each returns new state or a reason
│   │   ├── routing.ts    A* line routing on the tile grid (road preference)
│   │   ├── preview.ts    candidate state → simulate → PreviewResult (same function as run)
│   │   ├── progress.ts   stage unlocks, stars, seen tips
│   │   └── save.ts       versioned localStorage via platform adapter
│   ├── content/
│   │   ├── levels/       river-village-01.json … -06.json (+ witness solutions)
│   │   ├── profiles.json
│   │   ├── schema.ts     hand-written validator (no zod) with readable errors
│   │   ├── copy/en.ts    every player-facing string, keyed; input-specific tutorial variants
│   │   └── regions.ts    display data per region (LV/MV voltages, clock format)
│   ├── render/           Three.js only. Reads state + DayResult, never writes them.
│   │   ├── scene.ts      renderer, orthographic iso camera, resize, picking
│   │   ├── navigation.ts pan/zoom/fit (port of Cool Places)
│   │   ├── assets.ts     GLTF loading per stage, instancing
│   │   ├── world.ts      terrain, buildings, window/activity state per step
│   │   ├── network-view.ts poles, cable catenaries, ghosts, reach rings
│   │   ├── flow-view.ts  instanced pulses (spacing ∝ kW), direction, reduced-motion chevrons
│   │   ├── status-view.ts loading colours, ring gauges, sparks, heat shimmer, badges
│   │   ├── daylight.ts   time-of-day lighting keyframes
│   │   └── labels.ts     DOM label projection with collision (port of Cool Places)
│   ├── ui/               DOM components: hud, tray, timeline, inspector, placement-bar, diagnosis,
│   │                     tips, dialogs, menu; tokens.css, icons.css
│   ├── settings/         typed settings (sound levels, region, clock, tips, numbers, vibration, motion) + persistence
│   ├── audio/            WebAudio: master + music / sound-effects / ambience buses; respects settings
│   ├── platform/         adapters: storage, haptics, share, lifecycle; web + capacitor impls
│   └── main.ts           wiring: input → commands → state → simulate → render + ui
└── tests/                *.test.ts
```

## 3. Data flow

```
 input (pointer/keys/timeline drags)
        │ intents
        ▼
 game/commands ──► new StageState (or rejection reason)
        │
        ▼
 sim/simulate(StageState, content)  ──►  DayResult  (≈ 1–3 ms for MVP sizes)
        │                                   │
        ├──────────► ui (goal, coins, chart, inspector, diagnosis)
        ▼
 render(StageState, DayResult, timeCursor, frameTime)
```

- **One evaluator.** Preview, committed state, Run day, Check day, hints and the audit all call
  `simulate()`. Nothing else computes electrical results.
- **Rendering never decides.** `render/` reads `StageState` and `DayResult` and interpolates between steps for the
  visual time. It never mutates state and never computes flows.
- **Run day is playback.** The whole day is already simulated; running just advances the time cursor and stops at
  `firstFailure.step`. This makes pause, scrub, replay and 3× trivial and deterministic.
- **Recompute on every change.** MVP networks are small (< 150 objects × 192 steps). Simulate synchronously on each
  committed or previewed change. Keep `sim/` worker-safe (pure, serialisable inputs) so it can move to a Web Worker
  if a later stage gets large. Measure before moving.

### Core types (sketch, not final)

```ts
type Tier = 'LV' | 'MV';
type ObjectKind = 'grid' | 'line' | 'transformer' | 'load' | 'solar' | 'battery';

interface StageState {
  levelId: string;
  objects: PlacedObject[];          // authored + player-placed; authored ones are locked
  lines: Line[];                     // { id, tier, fromPort, toPort, route: Tile[] }
  schedules: Record<string, Window[]>; // battery windows, EV blocks, keyed by object id
}

interface DayResult {
  steps: StepResult[];               // 96, day 2
  metrics: Metrics;                  // SIMULATION.md §7
  firstFailure?: Diagnostic;
  placementErrors: Diagnostic[];
}

interface StepResult {
  flowKW: Float32Array;              // per component index (+ = towards loads)
  loading: Float32Array;             // |flow| / limit
  lossKW: Float32Array;
  served: Uint8Array;                // per load
  socKWh: Float32Array;              // per battery
  solarUsedKW: Float32Array; solarUnusedKW: Float32Array;
  gridKW: number;                    // + import, − export
  tripped: Uint8Array;
}
```

Component indices are assigned once per `StageState` so typed arrays stay compact and the renderer can map index →
mesh without lookups.

## 4. Simulation implementation notes

- Build a rooted tree once per state (`network.ts`): parent pointers, post-order list, LV sections, reach distances.
  Validity errors are returned, not thrown.
- `simulate.ts` recomputes a post-order flow pass whenever curtailment, charge throttling or a trip changes an
  injection, until all limits settle. It fails explicitly if the bounded deterministic loop cannot settle.
- Only `+ − × ÷ min max` in `sim/` (see SIMULATION §1). A test greps `src/sim` for `Math.pow|Math.sin|Math.random|Date`.
- Profiles expand once and are cached by id.
- Results are plain data; no classes with hidden state in `sim/`.

## 5. Rendering notes

- Orthographic camera at the Cool Places angle; `devicePixelRatio` capped at 2 (1.5 on low-end tier).
- **Pulses:** one `InstancedMesh` (or `Points` with a sprite) for all pulses; per-line offset buffers; pulse count
  per line from `flowKW` per SIMULATION/DESIGN rules; positions along a precomputed catenary polyline per line.
  Update on the GPU where practical (instance attribute = line id + phase; vertex shader computes position from a
  line texture) — start CPU-side and move only if profiling says so.
- **Heat shimmer and sparks:** cheap sprites; no full-screen post-processing in MVP. Optional bloom only on the
  desktop quality tier.
- **Lighting:** one hemisphere + one directional light with a single shadow map sized per quality tier; windows use
  emissive materials toggled per building from `served`.
- **Quality tiers:** `low` (Chromebook/phone: DPR 1.25, 1024 shadow map, no bloom), `high` (desktop: DPR 2, 2048,
  optional bloom). Chosen by a quick first-frame benchmark, overridable in Settings (post-MVP).
- **Budgets (MVP stage, Fit zoom):** ≤ 150 draw calls, ≤ 120 k triangles, ≤ 2 k pulse instances, ≤ 10 MB initial
  download (GLB + fonts + JS), first interactive ≤ 4 s on a mid-range phone over 4G.
- Load only the current stage's models (Cool Places pattern).
- **UI shell from Cool Places (owner update, 30 Sep):** port the final native menu/history, warm surfaces,
  controls, stage cards, bottom tray and measured scene frame. Keep source mapping in the feature record.
  `src/game/progression.ts` owns monotonic lesson capabilities; `apply()` guards every command with those
  capabilities. Saves store lessons outside undoable layouts and preserve per-stage entries/current states.
  Version 2 reads version 1 without deleting it; new campaigns archive, and restoration retains both campaigns.

The placement/navigation pass keeps lightweight hover validation separate from held simulation. Hover caches
`apply()` by command; only holding a preview runs `simulate()` and rebuilds the surrounding panels. Port target
validation is cached by committed state, tier and source. Node selection raycasts actual model meshes, with a
modest screen-space tolerance for explicit port markers. The shared model builder supplies each ghost silhouette.
Camera layout measurement stores a frame without changing projection; explicit Fit and stage entry use it.

## 6. Platforms

| Target | How | When |
|---|---|---|
| Web | Vite static build, hosted on Vercel (like Cool Places / Paint Clouds). | MVP |
| iOS / Android | Capacitor shells consume `dist/`. Haptics via `platform/`. Portrait and landscape. | MVP builds; store release later |
| Steam (Win/macOS/Linux) | Desktop wrapper around the same `dist/`. Default plan: Electron + `steamworks.js` (mature Steam overlay and achievements support); Tauri is the alternative if bundle size matters more than overlay support. Decide at the start of the Steam milestone. | Post-MVP |
| In-car browser (robotaxi / car screens) | Same web build, touch layout, reduced motion on by default. Official car-platform stores need partnerships. | Test after M6 |
| Gamepad | Input actions layer from day one (see `input-systems` skill); gamepad bindings added with the Steam milestone. | Post-MVP |

Rules that keep this open:

- All platform APIs go through `src/platform/` interfaces (`Storage`, `Haptics`, `Share`, `Lifecycle`,
  later `Achievements`). The web implementation is the default.
- Input is action-based (`place`, `cancel`, `undo`, `runPause`, `scrub`, `pan`, `zoom`) with pointer, keyboard and
  touch bindings. No gameplay code reads raw keys.
- No network calls, accounts or analytics in MVP. Saves are local and versioned.
- Layout is responsive by construction (DESIGN_LANGUAGE §4), with safe areas.

## 7. Testing and level audit

| Check | Command | What |
|---|---|---|
| Types | `npm run typecheck` | strict TS |
| Unit | `npm test` | sim rules (one test per rule in SIMULATION), profiles expansion, schema, commands, undo, routing, save migration |
| Level audit | `npm run levels:audit` | For each stage: validate JSON; replay the witness from the previous stage's witness end state; assert goal met, within budget; compute metrics; assert "doing nothing" fails; derive star targets (+10 % slack) and compare with authored targets; write `docs/LEVEL_AUDIT.md`. Bounded search for cheaper solutions is post-MVP (Cool Places `solver.ts` is the model). |
| Copy | `npm run lint:copy` | VOICE_AND_COPY §8 |
| Icons | in `npm test` | every `ph-*` used has a glyph in `icons.css` |
| Determinism | in `npm test` | same state → byte-identical `DayResult`; order of objects in the array doesn't change results |
| Assets | `npm run assets:check` | GLBs exist, triangle and size budgets |
| Build | `npm run build` | production bundle |

Browser checks: agents verify changed UI in the in-app browser at the §4.3 viewports of DESIGN_LANGUAGE, and attach
screenshots to the feature's `.ai/features/<slug>/` folder. Playwright smoke tests are a post-MVP addition.

## 8. Implementation milestones

Each milestone is one feature record in `.ai/features/`, run with `$feature-loop` (Astra plan critique → Sol
implementation → Astra review). **Opus reviews** the milestones marked ◆ before the next one starts.

| # | Milestone | Scope | Done when |
|---|---|---|---|
| M1 ◆ | Foundation + simulation core | Vite/TS/Three bootstrap, tokens.css, icons.css, copy module + lint, `sim/` complete per SIMULATION, content schema, profiles, stages 1–3 JSON with witnesses, level audit | All sim rules tested; audit passes stages 1–3; app boots to a placeholder scene |
| M2 | Board and building | Iso scene greybox (primitive meshes), navigation, picking, placement + ghost + reasons, line drawing + routing, move/remove/upgrade, undo, coins, inspector (basic) | Stages 1–3 solvable by mouse and touch in greybox |
| M3 ◆ | Time and feedback | Timeline compact/expanded + chart, Run day playback, speeds, Check day, pause-at-failure, diagnosis card, pulses, loading colours, trips/blackout, labels, daylight | Stage 3 failure is diagnosable from the scene alone (screenshot test) |
| M4 | Solar, batteries, robotaxis | Stages 4–6 content + witnesses; solar site factors; battery + EV schedule lanes; curtailment + heat visuals | Audit passes all six stages |
| M5 | Art and sound | Blender asset script for all MVP models, thumbnails, time-of-day polish, placement juice, sound set | Budgets in §5 met; screenshots match DESIGN_LANGUAGE |
| M6 ◆ | Teaching and flow | Navigation gesture coach, onboarding, tips, hint ladder, stars, completion, growth sequence, field notes, home/stages/menu/settings (Paint Clouds shell, region + audio buses), saves, reduced motion, a11y pass | MVP acceptance (MVP_SPEC §14) except playtests |
| M7 | Devices | Capacitor shells, device perf pass, quality tiers | 30 fps on target low-end device |

## 9. Review protocol (Opus)

Opus (Claude Code) set this architecture and reviews the end result of each ◆ milestone and the final MVP:

1. When Sol and Astra finish a ◆ milestone, the Codex coordinator writes `.ai/features/<slug>/opus-packet-NN.md`:
   brief, plan, decisions, commit/diff reference, test and audit output, screenshots.
2. The owner asks Claude Code to review it (or Codex uses `$opus-review` for a tool-free opinion on the packet).
   Claude Code reads the actual repo, runs checks and writes `opus-review-NN.md` with verdict `pass`,
   `changes-needed` or `blocked`, findings by severity, and any doc updates.
3. Findings go back through `$feature-loop` corrections. The next ◆ milestone does not start while a review is
   `changes-needed` on an architectural finding.

## 10. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-09-29 | Web-first Three.js + TS + Vite; DOM UI; no React/ECS/state lib | Matches Cool Places / Paint Clouds; small surface; easy for agents. |
| 2026-09-29 | Whole-day simulation per change; run = playback | Determinism; scrub/pause/replay for free; identical preview and run. |
| 2026-09-29 | Radial networks only; loops rejected | Readable causality; matches real distribution operation. |
| 2026-09-29 | Two-day evaluation, score day 2 | Removes battery/EV start-state exploits without special rules. |
| 2026-09-29 | Battery = player schedule; discharge powers its own LV section only | Legible; makes power vs energy and location lessons work. |
| 2026-09-29 | kW/kWh at village scale, single homes at diversified 2 kW | Relatable units (bills use kWh); honest numbers. |
| 2026-09-29 | Paint Clouds shell: top-left Menu, Guide, Hint; drop-down menu; settings sheet with Sound, Music, SFX, Ambience; white-hand gesture coach for navigation | Owner direction; proven in a shipped app; consistent family of products. |
| 2026-09-29 | Region is a display setting (UK/EU default, North America option); sim is region-free | Owner direction; keeps one simulation and one set of levels. |
| 2026-09-29 | Stage 6 = robotaxi depot; robotaxis and AI data centres are the post-MVP headline themes; no real brand names in game | Owner direction: the big grid topics now. Brand-free avoids trademark issues and dating the game. |
| 2026-09-29 | Steam wrapper decided at its milestone; code stays wrapper-agnostic | Avoid premature commitment. |
| 2026-09-30 | Pin Three 0.179.1, TypeScript 5.8.3, Vite 7.3.6, tsx 4.20.5, Manrope 5.3.0, Phosphor 2.1.2, @types/three 0.179.0 and @types/node 22.19.19 | Use tested reference-compatible versions and a reproducible lockfile; no framework added. |
| 2026-09-30 | Complete the six-stage web core with procedural meshes and direct overhead spans | The owner requested stopping when core play works; Blender GLBs, audio, native wrappers, road-biased cable routing and art polish remain separate work. |
| 2026-09-30 | Stage 4 Clean is a completion requirement; stage-3 homes arrive prewired; battery day 1 starts empty; depot solar is ground-mounted | Preserve the intended lessons and the verified sequential level audit. See SIMULATION and MVP_SPEC for binding rules. |
| 2026-09-30 | Owner requested the final Cool Places shell and one-by-one persistent teaching; Home on launch, recoverable campaigns and replay-safe stage advancement | Replace the previous dashboard locally without dependencies or simulation changes; source map in `.ai/features/coolplaces-ui-progression/source-mapping.md`. |


### 3 Oct 2026 follow-up implementation notes

Controller factories receive their explicit dependency slices and return their slices; the final spread is checked as Actions without a cast. Session topology revisions advance for stage or layout changes in setState, stage entry and campaign replacement; preview state identity temporarily keys preview geometry. Schedule-only edits retain the revision. World.draw compares the key in O(1), with immutable state identity as its standalone/cover default; it never serializes the network per frame.

Three.js is a separate production vendor chunk to keep the game chunk below the build warning threshold. Review Markdown is durable project documentation. Generated .ai feature diffs and revision JSON snapshots are ignored across all features and kept locally only; Git is the history source.
