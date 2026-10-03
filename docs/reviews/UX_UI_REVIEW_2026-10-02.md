# Power Places — UX / UI / code review

Reviewed 2 Oct 2026, current local build (`npm run dev`, port 5186). Played stage 1 at 1440×900 and 375×812,
inspected stage 6 at 1280×800 (unlocked via a temporary save, since restored). Measured against
[DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md) v0.3.

**Verdict:** the shell (Home, Stages, menu) is clean and on-brand. The rough edges are mostly in the
**game scene**: the electrical story the design doc promises (night, glowing windows, pulses, loading colour)
barely shows up, the main build loop takes too many clicks, and the late-stage map reads as visual noise. Under
that, `main.ts` is a 55 KB single file written in minified style, which is why each polish pass is slow and fragile.

---

## P0 — breaks the core fantasy

### 1. No day/night: the scene is always daylight
`scene.ts` computes `night` but only uses it for a tiny window box; `scene.background=null` and lights never
change. Stage 1 opens at **18:00** with the hint "Run day to watch the lights", and the scene is bright midday.
Stage 6 "Night shift" at 22:00 looks the same, and so does its cover card. DESIGN_LANGUAGE §2.4 specifies keyframed
lighting and a night background. Without it, "lights come on" (the stage-1 payoff and the game's emotional hook)
reduces to a few yellow pixels.
**Fix:** drive hemisphere/sun intensity and colour plus the CSS background from `step`, and make powered windows
emissive enough to read at fit zoom. This is the highest-value visual change in the game.

### 2. Powered and unpowered are hard to tell apart
Connected houses turn from grey to cream walls. That's the only signal, with no glow, badge or pulse. Only **one**
"No power" label shows at a time, and it jumps between buildings (Home 1 → Café) as you connect them. The
player can't see what's left to do. Pulses along live cables (§2.3, "flow must be the default view") are absent.
**Fix:** show a plug badge on *every* unpowered building (badges are cheap; keep text labels for the top
problem only), add idle pulses on energised lines, and give buildings a powered state that also reads by day.

### 3. Late-stage networks render as "sea urchins"
In stage 6 every house is wired straight to one transformer point, so dozens of cables converge on a single
vertex. It's unreadable and hides the buildings. Stage 1 already shows the start of it (three cables from one pole tip).
**Fix (pick one):** offset cable attachment points around the pole/transformer; route LV via shared
street poles (closer to reality and teaches feeders); or bundle lines that share a direction.

## P1 — friction in the main loop

### 4. Building a line takes 4 clicks and a trip across the screen
Pick tool → click source → click target → move to the **right-hand panel** to press Connect. Then the tool
**deselects**, so every extra house starts over. Wiring stage 1's three buildings took 12 clicks.
**Fix:** keep the tool armed after a commit (Esc/right-click to drop it); show the Connect/✓ button
**at the cursor/target** (Mini Motorways-style), or auto-commit valid previews with Undo as the safety net.
Chain lines: after connecting A→B, the next click from B starts a new line.

### 5. Labels and panels cover what you're interacting with
- The "Café · No power" label sat on top of the café's port while I was trying to click it.
- The expanded timeline panel covers about 60 % of the diorama at 1280×800 (§9 limit is 40 %) and is
  translucent, so the map bleeds through the chart.
- The movement coach card's white hand on white glass is effectively invisible, and the card is
  mostly empty space.
**Fix:** hide labels whose anchor is the hovered/target object; make the timeline opaque and dock it
beside the map on desktop; give the coach hand a dark outline or ink colour.

### 6. The timeline chart can't be read
No axes, time ticks, legend or "now" cursor. It has three unlabelled series (blue, black, orange). Robotaxi rows show
"22:00" while every slider handle sits at the far left. For a game whose lesson is *timing*, this is the most
important chart. It needs at least an hour axis, a now-line synced to the scrubber, a series legend
(Demand / Limit / Solar…) and a limit line drawn as the threshold it is.

### 7. Tray and tool naming
- At 1280 px wide the tray scrolls horizontally and clips "Battery…", with plenty of empty space either side.
  Wrap to two rows or shrink cards before scrolling on desktop.
- Transformer S and L share an icon; `lightning` already means *Power (kW)* and `plugs-connected` (MV line)
  already means *Grid connection* in the §6 icon table. That breaks "one icon, one meaning".
- "Transformer S / L" is jargon. Try "Small/Large transformer" with the capacity shown on the card.

### 8. The inspector says nothing useful
Selecting the farm shows "Part of the village; stays here." and "No power". There's no demand, no time of need and no
reason. The selected object also gets no visible highlight in the scene. Show the object's kW need,
when it needs it, what it's connected to, and a selection ring.

## P2 — polish

- **Home cover image flashes a broken-image alt ("First light")** on first load before the render arrives.
  Reserve the space with a placeholder or fade the image in.
- Desktop Home card has a large empty lower third. Either size it to its content or centre it vertically.
- The `×` on Home has no clear meaning on the first screen. What does it close to?
- "Start new campaign" sits beside Settings with equal weight. It's safe (it archives), but it should look secondary.
- Stage-select covers 3 and 4 are nearly identical, and cards use a single fixed tint per stage. Show what's *new*
  in each stage (the farm, the solar field, the robotaxis) in the crop.
- Phone: the diorama sits in the top half with a ~350 px dead band above the tray, and the camera
  buttons crowd the stage title. Centre the fit in the free frame, and put camera controls bottom-right as on desktop.
- The Tasks button (`0/1`) uses 10 px text and showed no panel on phone tap during this session. Verify it.
- Type scale: style.css uses **17 distinct font sizes** (10–52 px) against 5 type tokens, and 364 px literals
  against 179 `var()` uses. That contradicts "tokens are the only allowed values". The visual unevenness
  (micro labels at 11–12 px everywhere) comes from here.

## Code design

- **`src/main.ts` is 55 KB in 134 lines.** Lines reach 1,962 chars, written in a minified style with comma-chained `let`
  declarations and nested ternaries (e.g. `name()`). It holds about 40 pieces of mutable module state and 18 `innerHTML`
  writes. Nobody can review or diff it, and it's the main reason each UI pass needs correction rounds.
  **Suggested split:** `ui/hud.ts`, `ui/tray.ts`, `ui/timeline.ts`, `ui/inspector.ts`, `ui/overlays.ts`,
  `game/session.ts` (state, undo and preview), `input/map-input.ts`, with a single `refresh()` dispatcher.
  Run Prettier once over `src/` first (no behaviour change) so the split is reviewable.
- **Whole-panel `innerHTML` re-renders** rebuild DOM on every refresh. During review, element refs went
  stale between two calls on the stage screen, and a stage-card click didn't register. Re-rendering also
  risks focus loss and dropped clicks mid-interaction. Patch only the parts that change, or key the sections so
  unchanged ones are skipped.
- `scene.ts` clears and rebuilds the whole Three.js group on every `refreshWorld()`. That's fine for stage 1 but
  will cost frame time in stage 6. Build meshes once and update materials and visibility per step.
- **The repo has no commits** (`git log`: no commits on `main`). With this many UI passes, commit a baseline
  before the next refactor.

## Not verified

`requestAnimationFrame` never fired in the review browser pane, so the run animation, end-of-day result overlay,
pulses and star pop-in weren't observed live. Findings 1–2 are from the static 18:00/22:00 frames plus `scene.ts`.

## Suggested order

1. Commit baseline, then Prettier `src/` (zero behaviour change).
2. Day/night lighting and emissive windows, plus unpowered badges on every building (P0 1–2).
3. Armed tool, in-context confirm and chained lines (P1 4).
4. Cable attachment offsets or street poles (P0 3).
5. Timeline axes, legend and now-line; docked panel (P1 5–6).
6. Split `main.ts` while the above is fresh.
