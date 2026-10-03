# Power Places — Design Review

Reviewed: full package v1.0 (docs 00–11, seed data, Codex bootstrap, both concept boards).
Lens: the stated goals — **simple**, **visualise abstract concepts**, **fun & engaging**, **modern relevant topics**, audience **12–18** plus **adults who like building/designing** — benchmarked against SimCity / Cities: Skylines, Mini Metro / Mini Motorways, Islanders / Dorfromantik / Townscaper, Poly Bridge / Opus Magnum (Zachtronics), Factorio / Oxygen Not Included, Pocket City, Plague Inc, Kerbal Space Program, and classroom-used games (Minecraft Education, KSP EDU).

---

## Verdict

A strong, unusually disciplined foundation. The science boundaries (doc 06), the deterministic plan → run → fail → diagnose loop, the persistent place across stages, and the diorama art direction are all right and genuinely differentiated — in SimCity and Cities: Skylines, power is a trivial utility; here it *is* the game.

The gaps are on the side of the goals the doc talks about least: **it describes a good educational puzzle, but not yet a game teenagers will choose to keep playing.** The biggest missing pieces are (1) a concrete visual language for electricity itself, (2) an engagement layer beyond pass/fail, and (3) the modern topics (EVs, heat pumps, rooftop solar, flexibility, emissions) that make this relevant to a 14-year-old in 2026.

| Goal | Rating | One-line reason |
|---|---|---|
| Simple | 🟡 | Loop is clean, but chapters introduce 3–4 concepts at once and raw MW/MWh everywhere |
| Visualise abstract concepts | 🟡 | Promise is central, spec is thin — flow is only shown "in inspection mode" |
| Fun & engaging | 🔴 | Binary pass/fail, scripted growth, no mastery/score, no player choice, no sandbox until "later" |
| Modern relevant topics | 🔴 | No EVs, heat pumps, rooftop solar, demand flexibility, emissions, data centres in MVP or campaign |
| Scientific honesty | 🟢 | Best part of the package — doc 06 and the "do not accidentally teach" list are excellent |
| Scope discipline | 🟢 | MVP non-goals are sensible |

---

## Top 6 recommendations (priority order)

### 1. Make electricity visible all the time — define the visual language

The core fantasy is "make the invisible grid visible", but [10_ART_ASSETS_PRESENTATION.md](../../seed/game-design-v1/docs/10_ART_ASSETS_PRESENTATION.md) only lists *outcomes* (windows light up) and "power paths highlight in inspection mode". Flow must be the default view, not a mode. Spec it like Mini Metro specs trains — it's the most important asset in the game.

Proposed encoding (one visual variable per quantity, never overloaded):

| Concept | Encoding | Reference |
|---|---|---|
| Power flow (MW) | Animated pulses along lines; **density/speed = MW**, direction = direction of flow | Factorio belts, ONI overlays |
| Line / transformer loading (%) | Line **thickness stays fixed**; colour ramp calm → warm → hot, plus shimmer/hum rising near 100 % | Mini Motorways congestion |
| Overload | Flicker, sparks, audible buzz, then the downstream branch **browns out** (lights dim building-by-building) *before* the pause | Poly Bridge "watch it break" |
| Energy stored (MWh) | Battery model shows a physical fill level (like the green bars in the concept art) | — |
| Battery power (MW) | Size of the "tap" / pulse rate going in/out — visually separate from fill level | makes MW ≠ MWh *seeable* |
| Curtailment | Solar panels visibly dim / greyed pulses that "bounce back" at the bottleneck | — |
| Voltage tier | Pole/pylon silhouette + pulse spacing, not colour alone (colour-blind safe) | — |
| Supply vs demand over time | Hero stacked-area chart in the time strip; the **duck curve** should emerge and be *named* when it appears | — |

A good test: a player with sound off and no UI text should be able to point at the bottleneck.

### 2. Add a mastery/score layer and real player choice

Currently success = "serve all required load, within budget" ([example_level.json](../../seed/game-design-v1/seed_data/example_level.json)). Binary goals make puzzles one-and-done. Every successful game in this space adds replay through optimisation:

- **Three metrics per stage, shown as histograms of other players' results** (Opus Magnum / Poly Bridge): e.g. **Cost**, **Wasted energy (curtailment + losses)**, **Imported/fossil energy (CO₂)**. Stars for thresholds. The trade-off between metrics *is* the lesson (cheap vs clean vs reliable).
- **Growth requests instead of fully scripted growth** (Islanders / Dorfromantik / Mini Metro weekly upgrade): between stages, offer 2–3 cards — *"A bakery wants to open (daytime load, +credits)"* vs *"A data centre offers big credits but needs 1.5 MW 24/7"* vs *"10 families want heat pumps"*. The player chooses what their town becomes, and inherits the grid consequence. This gives tycoon-style agency without an electricity market.
- **Sandbox mode in the first post-MVP release, not "later"** ([11_INVESTOR_PRODUCT_RATIONALE.md](../../seed/game-design-v1/docs/11_INVESTOR_PRODUCT_RATIONALE.md)). For the adult "I like building and designing" segment it's the primary mode; for teachers it's the free-exploration tool.
- **Shareable replays / screenshots** of a solved grid running at dusk — the art is gorgeous; let it market itself.

### 3. Put modern topics in as mechanics, not text

"Modern relevant topics" are almost absent. They're also cheap to add because they reuse existing systems (loads with windows, generators, batteries):

| Topic | Mechanic | Reuses |
|---|---|---|
| **Demand flexibility / smart charging** (the #1 missing idea) | Some loads have a *window* ("charge 2 MWh between 22:00 and 07:00"); player drags the block on the timeline to shift it | Depot "energy-window objective" already in doc 05 — lean into it and give the player the controls |
| **EVs** | Evening/overnight charging load that can be smart-scheduled | Above |
| **Heat pumps / electrified heating** | Winter-peaking household load upgrade ("the town electrifies") | Demand profiles; fits Winter Week chapter |
| **Rooftop solar / prosumers** | Houses that *export* at midday → reverse flow through the LV transformer | Solar + transformer limits; very visual with directional pulses |
| **Emissions of imported power** | External grid has time-varying carbon intensity; importing at 18:00 costs more CO₂ than at 13:00 | External grid node + a metric |
| **Data centres / AI load** | Flat, huge, 24/7 load card | Continuous load archetype already exists |
| **Grid congestion** | "Your new wind farm must wait — the substation is full" | Capacity limits — this *is* the real-world 2020s grid story |

Suggested placement: rooftop solar + reverse flow in Chapter 3, smart EV charging as the core of Chapter 4 (alongside the battery — "flexibility vs storage" is a great contrast), heat pumps in Chapter 8.

### 4. Simplify teaching: one concept per level, layered units

**One new idea per level.** Chapter 1 teaches connection + LV/MV + transformer at once; MVP Stage 4 adds light industry + station + cloudy weather + multi-day adequacy in one step ([08_MVP_SCOPE.md](../../seed/game-design-v1/docs/08_MVP_SCOPE.md)). Portal/Mini Metro-style onboarding introduces a single thing, lets the player succeed with it, then twists it. Suggested MVP re-slice:

1. Connect one house → it lights up. *(connection)*
2. Far house: LV line too weak → try MV → can't plug a house into MV → transformer. *(tiers + transformer; player discovers the need)*
3. More houses arrive; transformer overloads at 18:00 only. *(demand curves, capacity)*
4. Solar field — "more generation doesn't fix the transformer". *(generation ≠ delivery)*
5. Evening peak: battery vs smart EV charging. *(timing, MW vs MWh)*
6. Workshop + cloudy day. *(variability)*

**Voltage must teach *why*, not just act as a connector rule.** With losses off and tiers as "compatible ports", the risk is teaching *"voltage = plug type"*. The textbook lesson (and an explicit UK GCSE / NGSS energy-transfer topic) is *why* we step voltage up: `P_loss = I²R`. Introduce simple losses early in one level: a long LV line visibly "leaks" pulses and wastes energy; the same route at MV barely loses any. That single level gives the voltage tiers a reason to exist.

**Layered units ("Simple" / "Engineer" toggle — display only, same sim):**
- Simple: fill bars, `%` loading, "enough for ~40 homes", battery shown as hours of backup.
- Engineer: MW, MWh, SOC, curves.
Adults get numbers; 12-year-olds aren't met with `1.46 MW / 1.20 MW` as the first thing they see.

### 5. Fix battery behaviour and the simulation order (spec gaps that will break Chapter 4)

- **Battery dispatch policy is the lesson, and it's unspecified.** [09_TECHNICAL_DESIGN.md](../../seed/game-design-v1/docs/09_TECHNICAL_DESIGN.md) says "charge from surplus, discharge into shortages, then import". But with an external grid there's rarely a *shortage* — the Evening Peak problem is a **network constraint**. A greedy battery won't discharge to relieve the transformer, and the level won't work. Give batteries player-visible modes: *Auto (peak-shave to keep branch under X %)*, *Store solar*, *Schedule*. Mode choice is also good gameplay.
- **Capacity must constrain dispatch, not be checked afterwards.** Step 8 "enforce line and transformer capacity" after matching/battery/import means results depend on ordering and can serve loads through a bottleneck that's later flagged. On a radial tree this is a straightforward bottom-up capacity-limited flow — do it in one pass.
- **Export to the external grid is undefined.** Can surplus solar flow upstream? Up to what limit? Needed for curtailment and for the rooftop-solar lesson.
- **Radial rule UX.** Players *will* draw loops (for redundancy). Decide now: block with an explanation, or — better and realistic — introduce a **normally-open switch**. Real distribution networks are meshed-but-operated-radially; that's a perfect Chapter 10 mechanic and keeps the radial solver.

### 6. Design for classrooms and both age groups explicitly

- **Platform:** Three.js/web is a great fit for schools — commit to it and set a **Chromebook / low-end GPU budget** (draw calls, GLB polycount, texture sizes). The concept renders imply very rich scenes.
- **Session length:** stages should be 5–10 min to fit a lesson segment and mobile play; the 2-minute run at 1× is fine if first runs are watched and later iterations use Analyse.
- **Bridge to reality after each stage** (KSP/Plague Inc style): one card with a real photo + fact — *"A real village transformer like yours supplies ~100–300 homes"*. Short, skippable, collectible.
- **Hint ladder** driven by the evaluator (already planned): nudge → highlight the component → show one fix. Failure screens should offer 2–3 *possible directions* (upgrade transformer / battery downstream / split the feeder), not the answer.
- **Accessibility:** no colour-only encodings (LV/MV, overload), readable at ~12-year-old reading level, text-to-speech, localisation-ready strings.
- **Privacy/schools:** no accounts or chat required; local saves; COPPA/GDPR-K friendly. A teacher-facing curriculum map (GCSE Physics "National Grid", NGSS HS-PS3, geography of energy) is a strong sales asset and costs little.
- **Tone balance:** "calm and relaxing" skews toward the adult audience. Keep the cozy default, but give teens challenge: star goals, a daily/weekly challenge map, and optional "storm night" hard modes. Light characters (residents with speech bubbles — *"my EV needs charging by 7!"*) add human stakes without text walls.

---

## Smaller issues

- **Scale of numbers.** `houseA scaleMW: 0.06` = 60 kW peak — ~10–30× a real household's diversified peak. Either a "house" tile represents a street/cluster (label it "≈25 homes") or LV loads use kW. Adults will notice, and it undercuts the scientific-honesty stance.
- **Seed level can't fail.** Peak load ≈ 0.19 MW vs 0.4 MW transformer and 2 MW grid; the only challenge is connectivity. Fine for a tutorial, but then the budget of 8 should be the constraint — and line cost semantics are undefined (per connection? per tile? per segment?).
- **Profile resolution mismatch.** Profiles are hourly (24 values) while the sim is 15-minute (96 steps). Specify interpolation (step or linear) so audits are deterministic.
- **Time strip overload.** The bottom UI lists time, sunrise/sunset, demand, generation, SOC, weather, warnings. On mobile/tablet this won't fit — define a collapsed and an expanded state.
- **Wind wake effects** in chapter 5 are a lot of hidden math for players to reason about; keep them only if the overlay makes them obvious (visible wake cones).
- **"Constructions credits"** are fine, but the relationship to the Cost metric in recommendation 2 should be one number, not two.
- **Chapter 7 (Industrial District)** is where HV/"big loads need big connections" lands — make sure to reinforce the doc-06 point that solar *can* power industry; a solar-powered factory level would directly counter the misconception.
- **Investor rationale** lists education/sandbox as "expansion potential". Given the stated target audience, the education edition is arguably the go-to-market, not an expansion.

---

## What to keep exactly as it is

- The reality-vs-abstraction discipline (doc 06) and the "do not accidentally teach" list — put it in front of every content author.
- Pause-at-first-failure + time scrubbing + Analyse — excellent debugging UX, better than Factorio's.
- Persistent place across stages — "old decisions become new problems" is the Mini Metro magic.
- Tool-scoped overlays (only show what's relevant to the selected tool).
- Deterministic sim with automated puzzle audits and a known solution per level.
- Authored town (player builds the grid, not the city) — keeps focus; the growth-request cards above add agency without breaking this.
- The art direction. The dusk "same place, brighter future" board is the pitch in one image.
