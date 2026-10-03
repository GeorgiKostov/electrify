# Project status

## 3 Oct 2026 — UX/UI review fixes

**Stage:** complete; final Astra review and coordinator browser acceptance passed after one correction round.

- All findings from docs/reviews/UX_UI_REVIEW_2026-10-02.md are implemented: day/night and power cues, visible idle flow,
  visual cable attachments, armed/chained explicit line confirmation, useful inspector, readable shared-scale timeline,
  bounded opaque docks, responsive controls/tray and Home/cover polish. Existing electrical balance, lessons and saves remain intact.
- Main now bootstraps concrete session/controller, five cohesive UI modules and extracted map input. One refresh coordinates
  the UI; stable sections retain DOM/focus/Details/scroll and step changes reuse scene/grid geometry.
- 66 tests, typecheck, 218 copy strings, six-stage audit and build pass. The existing chunk warning remains, now about 587 kB.
  Coordinator browser checks use separate port 5187 and cover the five required sizes plus 375×812, 1280×800 and 900×800;
  successful animated stage-1 and stage-6 days with completion, idle/reduced-motion cues and midnight schedule reload have passed. Astra found one P2 internal timeline scroll issue, corrected in round 1 and verified in the phone browser.
- Local baseline cabf9f0 and formatting-only be49785 were committed before behavioral work. Reviewed fixes were committed as 34dd6a8 and pushed to origin/main on the owner's request.
  Vercel project power-places is linked to GeorgiKostov/electrify; pushes to main deploy automatically.
  Remote test URL: https://power-places.vercel.app/. The production build is Ready; public Home, scene rendering
  and Tasks interaction passed the browser smoke test. Next action: play-test on remote devices.
  Durable reports and exact revision live in .ai/features/ux-review-fixes/.

## 1 Oct 2026 — UI layout cleanup

**Stage:** complete; coordinator browser acceptance and independent Astra review passed after one correction round.

- Tool cards use readable flow rows, full names and explicit line prices per tile. Resources, placement and hover
  use one aligned coin treatment. Placement titles, status, costs and actions have separate rows.
- Tasks opens left and Resources right. Window ownership suppresses contextual map/UI information; popovers
  restore held previews and selection, full dialogs keep preview cancellation. Hide interface and Run retain
  their intended visibility, without camera fits on window transitions. Hidden input permits camera navigation
  while blocking invisible construction, confirmation and undo.
- Camera controls are three labelled 44 px icon buttons. Phone goal text uses the full width; short landscape
  gives the left scene its available height. Intermediate desktop widths move camera buttons clear of the tray.
  Expanded timelines keep actions reachable and scroll their details.
- 52 tests, typecheck, copy lint (210 strings), six-stage audit and production build pass. The existing JS chunk
  warning remains (approximately 562 kB). Browser checks passed at the documented sizes and intermediate desktop widths.
- Next action: play the cleaned-up local preview at
  http://127.0.0.1:5186/. See `.ai/features/ui-layout-cleanup/impl-log.md`. Existing saves remain intact;
  no commit, push or deployment.

## 1 Oct 2026 — placement and navigation

**Stage:** complete; independent Astra review and coordinator browser acceptance passed after one correction round.

- Live grid and cached validated mouse hover show actual object silhouettes, green/red state, icon, reason and
  cost. Lines show compatible ports, the active source and a free-end/target preview. Confirmation stays explicit.
- Player kit supports direct grab or inspector Move with preserved pickup offset; authored objects and the depot
  transformer are visibly fixed. Modest mesh reductions leave gaps without changing coordinates or electrical rules.
- Ray-to-ground pan and anchored wheel/pinch zoom replace approximate camera motion. All tools permit navigation;
  panels preserve projection and desktop context sits beside the scene. Pointer cancellation never commits an edit.
- 40 tests, typecheck, copy lint (205 strings), six-stage audit and production build pass. The existing JS chunk
  warning remains (approximately 560 kB). Browser checks cover stage 1/2/5/6 and all documented viewport sizes;
  physical touch and right/middle/Space-specific automation remain unverified, with deterministic gesture tests covering intent,
  pinch, cancellation and anchor math.
- Review correction 1 restores the committed scene and preview-dependent UI when a held preview is cancelled
  into two-finger navigation or UI input. Both real-handler regressions pass.
- Next action: play the updated local preview at http://127.0.0.1:5186/. Existing saves are preserved.
  See `.ai/features/placement-navigation/impl-log.md`. No commit, push or deployment.

## 30 Sep 2026 — Cool Places shell and sequential teaching

**Stage:** complete; independent Astra review and final coordinator browser acceptance passed after two correction rounds.

- Ported the final Cool Places warm Home/pause/settings/stage-card menu, compact controls, quiet heading and
  bottom tray using local tokens, Manrope and Phosphor. Covers show the actual electrical scene.
- Added persistent intra-stage teaching, central command guards, successful-run observation for stage 1,
  replay-safe advancement, nondestructive legacy migration and campaign archive/restore.
- Placement and inspection use a measured scene frame; keyboard alternatives live in Details. Advanced numbers,
  timeline and schedules appear with their lessons. Six-stage content, budgets and simulator remain intact.
- `npm test` (24 tests), typecheck, copy lint (201 strings), six-stage audit and production build pass.
  The approximately 547 kB JS chunk retains the existing size warning.
- Next action: play the local preview at http://127.0.0.1:5186/. Start new campaign for the new progression; the previous save is preserved.
  See `.ai/features/coolplaces-ui-progression/impl-log.md`. No commit, push or deployment.

## 30 Sep 2026 — functioning six-stage web core

**Stage:** functioning core complete; independent Astra review passed after one correction round. The user asked to stop when the core functions; this
pass includes no final Blender assets, audio, native wrappers or publication.

- All six stages are playable in the browser. Construction, stage growth, solar, battery and robotaxi schedules,
  failure diagnosis, stage completion, saves and replay work through the visible interface.
- Sequential witness audit passes all six stages from the previous solved state. Every entry needs player action;
  stage 3 first fails at 18:30. Stage 4 requires the audited Clean target. See [LEVEL_AUDIT.md](docs/LEVEL_AUDIT.md).
- `npm test` (13 tests), `npm run typecheck`, `npm run lint:copy`, `npm run levels:audit` and `npm run build` pass.
  The build warns about its approximately 530 kB JavaScript chunk; this does not block the functioning core.
- Independent browser playthrough completed all six stages, including construction and schedules, and verified
  save/reload and responsive phone/landscape layouts. Formal device frame-rate benchmarks and youth playtests
  remain outside this requested pass.
- Next action: play the local preview. Work stopped at the requested core; see `.ai/features/core-mvp/final-review.md`. No commit, push or
  deployment has been made.

## 29 Sep 2026 — 3D concepts before implementation

**Stage:** visual-direction review; implementation not started. **Next action:** review the [concepts and notes](.ai/features/visual-direction-3d/review.md), then resolve M1 battery initialization and stage-3 timing before its plan.

- Owner confirmed matte low-poly spec and earlier dusk for visible windows at 18:00/18:30. DESIGN_LANGUAGE section 2.4 updated.
- Three generated concept references, prompts and Astra critique saved in `.ai/features/visual-direction-3d/`.
- Region remains display-only with shared village, pending optional reply.
- No gameplay code, commits or publication. Earlier setup status below is historical.



## 29 Sep 2026 — repository set up, MVP design approved

**Stage:** pre-implementation. **Next action:** run M1 with `$feature-loop` from
`.ai/features/m1-foundation-sim/brief.md` (Astra plan critique → Sol → Astra review), then send the Opus packet.

Done today (Opus / Claude Code):

- Reviewed the seed design package against SimCity, Mini Metro, Opus Magnum, Factorio, Islanders and classroom games
  → `docs/reviews/DESIGN_REVIEW_2026-09-29.md`.
- Wrote the canonical MVP docs: `MVP_SPEC.md`, `SIMULATION.md`, `DESIGN_LANGUAGE.md`, `VOICE_AND_COPY.md`,
  `ARCHITECTURE.md`.
- Set up agent workflow: Codex skills (`opus-loop`, `feature-loop`, `opus-review`), shared game skills, Claude
  `codex-consult`, project skill `science-copy`, `tools/sync_skills.py`.
- Moved the original package to `seed/game-design-v1/` (the zip stays outside the repo in the parent folder).

### Key decisions (details in the owning docs)

- MVP = River Village, 6 stages, one new idea each: connection → voltage/transformers → evening peak → solar →
  batteries (kW vs kWh, location) → robotaxi depot (flexibility).
- Two boards: map (where) and timeline (when). Build mode shows the live simulation at the scrubbed time; Run day
  plays back the precomputed day; failures pause with a diagnosis card.
- Stars: Lights on (required) + two of Thrifty / Clean / No waste per stage. Removals refund 100 %.
- kW/kWh at village scale; LV reach + I²R-style losses give voltage tiers a real reason.
- UI extends Paint Clouds + Cool Places (Manrope, Phosphor, glass); world extends Cool Places' low-poly diorama with
  the seed's warm palette. "Only energy glows."

### Owner decisions (29 Sep 2026)

- Name: **Power Places** (the repo name `electrify` is irrelevant).
- Roles: **Sol 6.1** (`gpt-6.1-sol`) implements, **Astra** reviews, **Opus** (Claude Code) does the final review.
- Region: UK/EU by default, with a **Units and region** setting (North America voltages, 12-hour clock).
- UI shell: Paint Clouds style: top-left Menu / Guide / Hint, drop-down menu, settings sheet with Sound, Music,
  Sound effects and Ambience; classic camera controls taught with Paint Clouds' white-hand gesture coach.
- Robotaxis are the MVP finale (stage 6); robotaxi fleets and AI data centres are the next chapters.
- Git LFS installed in the repo (29 Sep).

## Milestones

| # | Milestone | State |
|---|---|---|
| M1 ◆ | Foundation + simulation core | Ready to start |
| M2 | Board and building (greybox) | — |
| M3 ◆ | Time and feedback | — |
| M4 | Solar, batteries, robotaxis | — |
| M5 | Art and sound | — |
| M6 ◆ | Teaching and flow | — |
| M7 | Devices | — |

◆ = Opus review gate. Details: `docs/ARCHITECTURE.md` §8.

## After the MVP (candidate order)

0. Chapters 2–3: Robotaxi town and The data centre (`docs/CHAPTERS_NEXT.md`).
1. Playtests with 12–16-year-olds (MVP_SPEC §14 learning checks).
2. Sandbox mode (adult builders, teachers).
3. Growth-choice cards between stages.
4. Weather + multi-day (winter week), heat pumps, CO₂ per hour of grid import.
5. Wind and hydro chapters; HV and substations; switches and resilience.
6. Steam wrapper + gamepad; teacher/curriculum pack; star histograms (needs a backend decision).

