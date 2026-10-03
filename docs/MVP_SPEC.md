# Power Places — MVP Design Spec

Version 0.1 · 29 Sep 2026 · Owner: design (Opus) · Status: approved for implementation

**Build the grid. Grow the place. See how it works.**

This spec defines what the player sees and does in the MVP. It points to the other canonical docs instead of
repeating them:

| Topic | Canonical doc |
|---|---|
| Rules, formulas, numbers | [SIMULATION.md](SIMULATION.md) |
| Visual language, layout, controls, tokens | [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md) |
| Words, tone, glossary, copy templates | [VOICE_AND_COPY.md](VOICE_AND_COPY.md) |
| Code structure, platforms, tests | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Why these choices (review of the seed design) | [reviews/DESIGN_REVIEW_2026-09-29.md](reviews/DESIGN_REVIEW_2026-09-29.md) |
| Original design package (historical input) | `seed/game-design-v1/` |

---

## 1. What the MVP must prove

1. **Fun:** building a small grid on a tactile diorama and watching a day run is satisfying on its own.
2. **Understanding:** after about 30 minutes of play, a 12-year-old can explain six ideas in their own words:
   1. Electricity reaches homes through lines from somewhere else.
   2. Low voltage can't travel far; we carry it far at higher voltage and change it near homes.
   3. Homes use different amounts at different times. The evening is the hard part.
   4. Solar depends on time and place. More solar does not fix a full transformer.
   5. A battery has two limits: how fast (kW) and how much (kWh). Where it sits matters.
   6. Moving *when* we use electricity (like charging a robotaxi fleet) can fix a problem without building anything.
3. **Readability:** a distracted player can tell what is wrong from the scene alone, sound off, without reading.

## 2. Pillars

| Pillar | Means | Test |
|---|---|---|
| **See the invisible** | Power flow, load and loss are always visible in the world, not hidden in a mode. | Screenshot with UI hidden still shows where power flows and what is struggling. |
| **Where and when** | Two boards: the map (where) and the timeline (when). Both are drag-and-drop. | Every stage from 3 on needs a decision on the timeline or depends on time. |
| **Fix, don't fail** | Problems pause the day at the exact moment, name the cause, and suggest directions. No game over. | Every failure has a card with cause and at least one idea. |
| **Real, simply** | Simplify the numbers, never the cause and effect. | Every rule maps to a row in [SIMULATION.md §9](SIMULATION.md#9-reality-vs-game). |

Tone: calm, curious, warm. Short sessions. No timers in build mode, no punishment, no ads, no accounts.

## 3. Audience, platforms and sessions

- **Primary:** 12–18, often distracted, playing on a school Chromebook, a phone or a home PC.
- **Secondary:** adults who like building and want to understand grids. They get detail on demand (inspector,
  numbers), never forced on the teens.
- **Platforms:** web first (Three.js). Same build wrapped for iOS/Android (Capacitor) and later Steam
  ([ARCHITECTURE.md §6](ARCHITECTURE.md#6-platforms)).
- **Session:** a stage takes 4–8 minutes. A day runs in 60 s at 1× and 20 s at 3×. The whole MVP campaign is
  about 40 minutes.
- **Input:** mouse and keyboard, touch, and later a gamepad. Every action works with one finger.

## 4. Core loop

```
      ┌──────────── Grow ◄──────────────┐
      ▼                                  │
    Build  ──►  Run the day  ──►  Stars and field note
      ▲             │
      │             ▼ problem
      └────────  Fix (card: when, what, why, ideas)
```

1. **Look.** The stage opens on the village at the stage's *focus time* (for example 18:30). A one-line goal names
   what to do. Ghost buildings show what will arrive later.
2. **Build (time paused).** Place, connect, move, upgrade and remove. The world shows the live result at the
   current timeline position. Scrub the timeline to check other times. Nothing is committed to a "run"; the
   preview *is* the simulation.
3. **Run the day.** Press **Run day**. The camera settles, the tray tucks away, and 24 hours play: sunrise,
   café opening, the evening rush, lights, pulses and sounds.
4. **Fix.** If something fails, the day pauses at that moment. The camera eases to the cause and a diagnosis card
   appears. The player returns to Build at that time.
5. **Finish.** A clean day completes the stage: stars, a one-card field note, and **Continue**.
6. **Grow.** The camera shows the village growing: construction sites become buildings. The network stays.

**Check day** runs the full day instantly and jumps to the first problem, or to the result. It is for players who
iterate; the first successful run of a stage always plays visibly so the reward is seen.

## 5. The two boards

### 5.1 Map (where)

- Isometric diorama on a hidden square grid. The grid appears only while a tool is selected.
- The player builds **infrastructure only**. Homes, café, workshop and roads are authored.
- Placement shows a snapped ghost with valid (green) or invalid (red) state, plus an icon and reason.
- Every change re-simulates immediately. Pulses, colours and labels update in the preview at the current time.

### 5.2 Timeline (when)

Always visible at the bottom. Two heights:

| State | Shows | Use |
|---|---|---|
| **Compact** (default on phone) | Play/pause, clock with sun/moon, scrub track with day/night shading and problem markers, speed, Check day | Scrubbing and running |
| **Expanded** (default on desktop, toggle on phone) | Adds a 24 h chart and schedule lanes | Understanding and scheduling |

**Chart:** demand as a line; supply stacked as areas: grid import, solar used, battery discharge. Unused solar is
hatched above the solar area. When a component is selected, the chart switches to *that component*: its flow
against a dashed limit line, with any over-limit time filled coral. This is the main tool for seeing why something
fails.

**Schedule lanes** (appear when the stage has them): one lane per battery (charge and discharge windows) and per
robotaxi (charging blocks inside a shaded plug-in window). Drag blocks to move them; drag edges to resize battery windows.
Blocks snap to 15 minutes. The map updates as blocks move.

## 6. Objects and interactions

### 6.1 MVP roster

Numbers live in [SIMULATION.md §8](SIMULATION.md#8-balance-reference-initial-values--tune-only-through-the-level-audit).

| Object | Player builds? | One-line job (canonical copy in VOICE_AND_COPY) | First stage |
|---|---|---|---|
| Grid connection | No | Brings electricity from power stations far away. | 1 |
| Low-voltage line | Yes | Carries electricity a short way to buildings. | 1 |
| Transformer | Yes (S, L) | Changes medium voltage to low voltage. | 1 (pre-placed), 2 (build) |
| Medium-voltage line | Yes | Carries electricity far with little loss. | 2 |
| Home, café, workshop | No | Uses electricity. Each at its own times. | 1–4 |
| Solar field | Yes | Turns sunlight into electricity. | 4 |
| Battery (Quick, Long) | Yes | Stores energy to use later. | 5 |
| Robotaxi (depot charger) | No (arrives with growth) | A self-driving taxi. You choose when it charges. | 6 |

### 6.2 Placing objects

1. Pick a tool in the tray. The grid appears and the tray shows the active tool.
2. Hover (mouse) or drag (touch) over the map. A snapped ghost uses the actual object silhouette. A cursor
   badge shows validity, reason or cost using the same command validator as confirmation. Hover changes no save,
   learning milestone or simulation result.
3. Click/tap or release the drag to hold the ghost. The day preview now simulates the candidate. **Place**
   confirms and spends coins on every device. **Cancel** or Esc leaves the committed state unchanged.
4. Invalid spots never place and never spend. The placement bar shows the reason and disables confirmation.
   Coordinates must be finite whole tiles; outside tiles stay visible as invalid rather than snapping to an edge.

### 6.3 Drawing lines

1. Pick LV or MV line. Compatible ports glow; incompatible ports dim.
2. Press on a port and drag to another port. The core previews a direct overhead span and its Manhattan tile
   length and cost. Road-biased routing is a later visual refinement.
3. Release on an object to hold the validated preview; **Connect** confirms. An invalid target cannot be
   confirmed. Release elsewhere cancels the active line. Tap a start and end, or choose them in Keyboard building.
4. After choosing a source, the rubber-band follows the free cursor and shows a green valid or red invalid
   target. Source and compatible ports remain visible. Cursor reasons include reach, voltage, loops and budget.
5. Lines connect ports, never other lines, in MVP (no T-junction tool). A transformer or a home port can take
   several lines. This keeps the tree readable.

### 6.4 Editing

- **Select** any object: the inspector identifies fixed village objects and editable player kit. Move is available
  only for movable player objects; the depot transformer stays at its authored connection. Upgrade and Remove
  remain available where permitted.
- Drag movable kit directly, or choose **Move** in the inspector. Direct dragging preserves the grabbed point
  rather than jumping a tall object's roof onto the ground cursor. Release holds a preview; **Move** confirms.
  Attached lines follow and recalculate their lengths; an invalid result cannot be confirmed.
- **Remove** refunds 100 %. Lines attached to a removed object are removed and refunded too, after a one-line
  confirmation in the placement bar ("Also removes 2 lines").
- **Undo** (Ctrl/Cmd+Z, top-right button) reverses the last committed change, up to 50 steps, including restart.
- **Restart stage** returns to the state the player entered the stage with.

### 6.5 Inspector (selected object)

Desktop: right-side panel. Phone: bottom sheet over the tray. Content, top to bottom:

1. Name + icon, one-line job.
2. **Now** row: the key number at the current time with a small bar (for example "18 kW of 25 kW").
3. **Today** sparkline of that number with the limit line.
4. Detail rows (collapsed by default on phone): voltage, limit, peak, energy today, losses today.
5. Actions.

Per object, the Now row shows: line → flow and loading; transformer → flow and loading; home → demand and
powered state; solar → making / unused; battery → kW in/out and kWh stored; robotaxi → charging or waiting, kWh still
needed.

### 6.6 Camera

Fixed isometric angle, orthographic. Drag empty ground, use right/middle drag, hold Space or Shift with any
active tool, use two fingers, or use the arrow/WASD keys to pan. Wheel and pinch zoom preserve their ground
anchor; +/− zoom around the scene frame. Fit (0 / button) and stage entry reframe explicitly. Opening tools,
inspection or Details preserves the view. Pan has no artificial map-edge clamp; zoom values live in
[DESIGN_LANGUAGE.md §2.5](DESIGN_LANGUAGE.md#25-camera). No rotation in MVP.

Camera navigation remains available during Run day; construction and selection wait until Build mode.
Pointer intent stays latched until release. Multiple fingers remain navigation until all lift. Escape, blur,
pointer cancellation, lost capture or a release over UI never confirms construction or a move.

## 7. Goals, stars and budget

Each stage has:

- **Goal** (required, shown as the stage's one line): always a form of *everyone has power all day*, plus stage
  extras such as *every robotaxi is charged by 06:00*. Completing it gives the first star.
- **Budget** (hard cap, coins). Coins from earlier stages carry over as built objects; each stage adds new coins.
  Refunds make any earlier layout rebuildable, so an earlier stage can never make a later one impossible.
- **Two bonus stars** chosen per stage from:

| Star | Name shown | Metric |
|---|---|---|
| ★ | **Lights on** | Goal met (required). |
| ★ | **Thrifty** | `buildCost ≤ target` |
| ★ | **Clean** | `gridImportKWh ≤ target` (solar stages) or `lostAsHeatKWh ≤ target` (stage 2) |
| ★ | **No waste** | `unusedSolarKWh ≤ target` |

Targets come from the reachable sequential witness, with about 10 % slack. A stage shows at most three stars.
Stage 4 deliberately requires its **Clean** target (`gridImportKWh ≤ 550.85`) as part of completion so the player
must use solar; other bonus stars remain replay goals. See [LEVEL_AUDIT.md](LEVEL_AUDIT.md).

## 8. Campaign: River Village (6 stages)

One persistent place. A river on the west, the grid connection at the west edge, the village centre on the
road, a farm across the river to the east, an open sunny field to the north, a wooded hill with shade and new
homes to the south. Map about 24 × 18 tiles. Each stage introduces **one new idea**.

Every stage below lists its witness solution in outline. Exact coordinates and targets live in the level JSON and
are proven by the audit ([ARCHITECTURE.md §7](ARCHITECTURE.md#7-testing-and-level-audit)).

**Sequential teaching (30 Sep 2026 owner update).** Capabilities are persistent learning milestones outside the
undoable layout. Stage 1 exposes LV only, then Run after a committed connection. Completion requires observing
a successful full day. Stage 2 highlights Transformer S, then unlocks MV after placing a transformer, then teaches
the existing LV tool. Stage 5 starts with Quick; connecting it and inspecting its day with Check day or playback
reveals Long with a factual power / energy comparison. Removing or undoing an object never revokes its learned
tool, but guidance follows the objects currently present. All command and keyboard alternatives use these gates.

### Stage 1 — First light *(connection)*

- **Start:** dusk (focus time 18:00). Grid connection, MV line and one transformer (S) already built near the
  village. Two homes and the café are dark.
- **Tools:** LV line.
- **Goal:** Give every building power.
- **Beats:** A ghost hand drags a line from the transformer to the first home. Lights come on, pulses flow, a soft
  chime. "Now the other home." Then **Run day** pulses; the first run always plays at 1×.
- **Insight:** Electricity comes along lines from somewhere else, and flows the moment the path exists.
- **Stars:** Lights on, Thrifty.
- **Field note:** *Where does it come from?* Power stations far away feed the grid.

**Implemented UX refinement (3 Oct 2026):** confirmed lines keep the tool armed and chain from the last target,
with target-local confirmation and a Change start action. Cumulative LV reach, costs and cancellation rules
remain unchanged. Powered windows/day activity and unpowered plug badges show the result at every time.
The timeline uses a shared labelled kW scale, Now cursor and actual grid-connection threshold. Per-load
inspection reads current demand, timing and connectivity from the authoritative day result. See
[DESIGN_LANGUAGE.md §4–5](DESIGN_LANGUAGE.md#4-layout) for responsive controls and dock ownership.

### Stage 2 — The far farm *(voltage and transformers)*

- **Start:** the farm across the river asks for power. It is 10 tiles from the transformer.
- **Tools:** LV line, MV line, Transformer S.
- **Problem:** LV reach is 6 tiles. Dragging LV to the farm turns the reach ring coral: *Too far for low voltage.*
  Where LV does reach, long LV lines shimmer with heat and the **Lost as heat** number grows.
- **Witness:** MV line from the existing MV network over the bridge, transformer near the farm, short LV line.
- **Insight:** Carry electricity far at higher voltage, then change it to low voltage near the buildings.
- **Stars:** Lights on, Clean (lost as heat), Thrifty.
- **Field note:** *Why pylons are tall.* 11,000 V versus 230 V, and why less current means less heat.

### Stage 3 — Evening rush *(demand over time, capacity)*

- **Growth:** twelve new homes on the main street (ghosted in stage 2) arrive prewired to the village
  transformer. The village now has 14 homes.
- **Tools:** + Transformer upgrade (S → L), second transformer.
- **Problem:** at 18:30 the village transformer carries more than 25 kW. First **Run day** pauses at 18:30, the
  transformer trips, the street goes dark, and the card explains it. Midday is fine.
- **Witness A:** upgrade to L. **Witness B:** split the street across two transformers (cheaper if placed well).
- **Insight:** Demand changes through the day; equipment must handle the busiest moment.
- **Stars:** Lights on, Thrifty.
- **Field note:** *The evening peak.* Why everyone uses more at 18:30.

### Stage 4 — Sunny field *(solar: time and place)*

- **Growth:** café extension and the workshop (daytime demand).
- **Tools:** + Solar field.
- **Problem:** the lights are already on, but the required **Clean** target is unmet. **No waste** remains a bonus
  star. Solar on the
  shaded hill makes half as much. The sunny field is closest to the farm's small transformer: at midday the field
  makes more than that transformer can carry back, so some solar goes unused. At 18:30, solar is near zero whatever
  you build.
- **Witness:** solar on the open field, connected through its own transformer on the MV side (no LV bottleneck).
- **Insight:** Solar depends on time and place, and the network must carry it. More solar does not help after
  sunset.
- **Stars:** Lights on, Clean, No waste.
- **Field note:** *The duck curve.* The day's demand minus solar makes a duck shape.

### Stage 5 — After sunset *(storage: power vs energy, location)*

- **Growth:** new homes on the hill, fed by a transformer on a **small pole**: it cannot be upgraded.
- **Tools:** + Battery Quick (10 kW / 10 kWh), Battery Long (5 kW / 40 kWh). Battery schedule lanes appear.
- **Problem:** the hill transformer has a fixed MV feed and a small pole that cannot be upgraded. Its LV homes
  must stay in that section. The hill section is over its limit by up to about 7 kW for about 3 hours (≈ 15 kWh). Quick has the
  power but runs out of energy before the peak ends (`BATTERY_EMPTY`). Long has the energy but cannot give enough
  power at 18:30 (`BATTERY_POWER_LIMIT`). A battery at the village transformer does nothing for the hill. With the
  default windows, Quick empties itself before the worst hour; moving its window matters.
- **Witness:** both batteries in the hill section (15 kW / 50 kWh), charging at midday when the transformer has
  spare room, with Quick's discharge window moved onto the worst hours.
- **Insight:** kW is how fast, kWh is how much. A battery helps only where it sits.
- **Stars:** Lights on, Thrifty, Clean.
- **Field note:** *Tap and tank* (clearly labelled as an analogy): tap size is power, tank size is energy.

### Stage 6 — Night shift *(flexibility: robotaxis)*

- **Growth:** a robotaxi depot opens by the station road with six self-driving taxis. They come back at 22:00 and
  must be charged by 06:00 for the morning rush. One "day cab" also rests at the depot 11:00–15:00.
- **Tools:** all previous. Robotaxi schedule lanes appear (one per cab).
- **Problem:** the player connects the depot with one MV line and its capped 50 kW transformer. Each charger has
  its own prewired LV branch; a shared 40 kW LV trunk would not serve two 22 kW chargers. By default every cab starts charging at 22:00:
  6 × 22 kW = 132 kW, far over the depot transformer, which trips. Building a bigger one isn't allowed here (the
  depot's connection is capped).
- **Witness:** stagger the cabs, at most two charging at once, in three 2-hour waves between 22:00 and 06:00.
  The previous solar field already reaches the audited **Clean** target. Extra solar, if placed, sits on open
  ground beside the depot; rooftop solar is outside this core.
- **Insight:** Changing *when* we use electricity can fix the grid without building anything. A fleet is a huge
  demand, but a flexible one.
- **Stars:** Lights on, Thrifty, Clean.
- **Field note:** *Fleets that wait.* Real robotaxi and bus depots plan charging like this; soon cars may also give
  power back at the evening peak.

### Stage select and replay

The Cool Places stage-card browser shows six stages, locks and earned stars. Successful completion opens only
the next stage. Opened stages retain their own entry and current build. Restart stage restores its entry;
Undo and learning milestones remain available. Replaying and choosing Next reuses any later saved build.
Home always opens on launch and Continue names the saved stage. New campaigns archive previous campaigns,
and restoring an archive retains the current campaign.

## 9. Teaching layer

### 9.1 Onboarding

- Teach by doing. Never more than one line of text on screen at once during onboarding.
- **Navigation first.** Stage 1 opens with the gesture coach ([DESIGN_LANGUAGE.md §5.3](DESIGN_LANGUAGE.md#53-gesture-coach-paint-clouds-pattern)):
  Move around, Look closer, Back to the village, with white-hand demos and copy for the device in use (touch,
  trackpad, mouse). Classic controls: drag empty ground (or hold Space / right-drag) to move, wheel or pinch to
  zoom, arrows/WASD to move, `0` to fit. Skippable and replayable from **Tips & controls**.
- Then building: the same white hand drags the first line, then the player acts alone.
- Each new tool gets one **first-use tip** (≤ 12 words) the first time it is picked, shown once, stored locally.
- The timeline chart and schedule lanes each get one pointer tip the first time they matter.

### 9.2 Hints (ladder)

Triggered after 45 s without progress in build mode with the goal unmet, or after two failed runs. Always
optional, via a lightbulb button that pulses gently.

1. **Nudge:** a sentence naming the problem area ("Look at the transformer at 18:30.").
2. **Point:** highlight the component and jump the timeline to the moment.
3. **Show one step:** ghost the next step of the witness solution. The player still places it.

### 9.3 Diagnosis card

Opens when a run pauses on a failure. Anchored to the component with a leader line; bottom sheet on phone.

| Part | Example |
|---|---|
| Title (what) | **Transformer overloaded** |
| When + numbers | At 18:30 the homes needed 31 kW. This transformer can carry 25 kW. |
| Why (from informational codes) | It switched off to stay safe. 14 homes lost power. |
| Mini chart | Component flow over the day, limit line, coral over-limit area |
| Ideas (2–3, never the answer) | Use a bigger transformer · Split the homes between two transformers |
| Actions | **Fix it** (back to build at 18:30) · Replay the moment |

Ideas are picked from a table keyed by diagnostic code and what the stage has unlocked. They are directions,
not solutions.

### 9.4 Field notes

One card per stage after completion: a title, two sentences, one in-game image or diagram, and one real-world
number. Collected in **Field notes** from the menu. This is the only place for analogies, clearly labelled.

## 10. Feedback (juice)

Visual rules are in [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md). Event map:

| Event | World | UI | Sound |
|---|---|---|---|
| Place object | 700 ms settle + ground ripple (Cool Places) | Coins count down | Wooden "thunk" (transformer), click (pole) |
| Connect a line | A first pulse zips along the new line | — | Rising zip |
| Building powered | Windows light, small puff of light, activity starts | — | Soft chime, pitch by building type |
| Component busy (> 80 %) | Line/ring turns amber, gentle vibrate | Label turns amber | Hum rises |
| Overload (trip) | Sparks, flicker, downstream buildings go dark one by one (120 ms stagger) | Day pauses, diagnosis card | Crackle, then "clunk" of the switch |
| Unused solar | Panels dim, pulses stop at the bottleneck | Hatched area on chart | — |
| Lost as heat | Heat shimmer above the line, stronger with loss | Label shows loss | — |
| Battery charging / discharging | Fill level rises / falls; pulses in / out | SOC bar | Soft rising / falling tone |
| Clean day complete | Every window glows, gentle camera push-in | Stars pop in one by one | Completion motif |
| Growth | Construction sites rise into buildings | "New neighbours" line | Construction chimes |

Every channel respects **reduced motion** (pulses become static chevrons whose spacing still shows kW; no shake;
no stagger) and a **sound** toggle.

## 11. Screens

Layouts and components are specified in [DESIGN_LANGUAGE.md §4](DESIGN_LANGUAGE.md#4-layout).

1. **Home:** actual electrical scene cover, Continue with the saved stage, Explore stages, How to play and Settings.
2. **Stages:** six Cool Places-style cards with sequential locks and stars.
3. **Stage:** Menu / Tasks, resource pill, quiet heading, map, bottom tools and current context.
4. **Diagnosis and completion:** warm menu views with the relevant field note and next action.
5. **Pause:** Continue, Stages, Restart stage, How to play, Settings, Hide interface and Home.
6. **Settings:** region and clock, Tips, Reduced motion and Numbers on map after its lesson.


## 12. Saves, accessibility, localisation

- **Saves:** local only (versioned key), per-stage committed layout + stars + persistent learning + seen tips. Version 1 migrates intact; new campaigns archive instead of deleting progress. No account, no network,
  no analytics in MVP. If storage fails, play continues and a quiet notice offers retry.
- **Accessibility:** 44 px targets (48 on touch), full keyboard play (tab to tools, arrows move ghosts, Enter
  place, Esc cancel, Space run/pause, [ ] scrub), visible focus, no information by colour alone (every state has
  an icon or shape), text never below 12 px, reduced motion, screen-reader labels for all controls and for the
  diagnosis card. Full non-visual play of the map is post-MVP.
- **Localisation and region:** all strings in one copy module with keys. English (UK spelling) in MVP. Region is
  a display setting: **UK and Europe** (default: 230 V, 11,000 V) or **North America** (120/240 V, 12,470 V); the
  clock can be 24- or 12-hour. kW and kWh never change. The simulation is identical in both regions.

## 13. Out of scope for the MVP

Sandbox, the robotaxi-town and AI data centre chapters ([CHAPTERS_NEXT.md](CHAPTERS_NEXT.md)), growth-choice cards, rooftop solar, weather and multi-day scenarios, wind, hydro, HV and substations, loops and
switches, CO₂ per hour, heat pumps, data centres, leaderboards and histograms, teacher dashboard, accounts,
analytics, Steam build, music composition beyond a placeholder loop. These are sequenced in
[PROJECT_STATUS.md](../PROJECT_STATUS.md) after the MVP.

## 14. MVP acceptance

**Build and play**

- All six stages playable in the browser on desktop and on a 390 × 844 phone viewport, portrait and landscape.
- Every stage's witness passes the audit; every star target is reachable; no stage can be solved by doing nothing.
- A day runs at 60 fps on a mid-range laptop and ≥ 30 fps on a 2020 Chromebook-class device at Fit zoom.
- Preview, run, Check day and the audit use the same simulation function and give identical results.

**Readability** (checked with screenshots, UI hidden)

- Power direction and relative amount are visible on every energised line.
- The overloaded component is identifiable within 2 seconds by a new viewer.
- Day vs night, powered vs dark buildings, battery fill, and unused solar are visible without labels.

**Learning** (5 uncoached players aged 12–16, after finishing)

- ≥ 4 of 5 answer each of the six §1 ideas correctly in their own words.
- 0 of 5 say a transformer makes electricity or that kW and kWh are the same.
- ≥ 4 of 5 want to replay a stage for stars.

**Copy**

- Every visible string passes the copy lint ([VOICE_AND_COPY.md §8](VOICE_AND_COPY.md#8-copy-lint)).
