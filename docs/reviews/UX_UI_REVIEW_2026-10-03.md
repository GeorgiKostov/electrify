# Power Places — UX / UI follow-up review

Reviewed 3 Oct 2026 at commit `ade4a62` (fixes in `34dd6a8`), against
[UX_UI_REVIEW_2026-10-02.md](UX_UI_REVIEW_2026-10-02.md). Played stage 1 (full animated day through to
completion) and stage 2 (place transformer, LV and MV lines, run) at 1440×900. Inspected stage 6 at 1440×900
and Home/stage 1 at 375×812. `npm test` (66 pass) and typecheck are clean. I unlocked stage 6 with a
temporary save and restored it afterwards. The review pane stalls `requestAnimationFrame`, so I shimmed it with a
timer to watch the day run.

**Verdict:** this is a real step up. Every P0 from the last round is addressed and the code is now reviewable.
What's left is mostly **tuning**: night is too dark to build in, flow pulses are too dense by day, the completion
moment is flat, and stage 6 still clutters. There's no structural rework left on the UI side.

---

## Previous findings: status

| # | Finding | Status | Note |
|---|---|---|---|
| P0-1 | No day/night | ✅ Fixed | Full keyframed cycle, lit windows, night background. Tuning issues below. |
| P0-2 | Powered vs unpowered unclear | ✅ Fixed | Plug badges on every unpowered building; idle pulses on live lines. |
| P0-3 | Sea-urchin cables | 🟡 Improved | Cables sag and attach at offsets. Stage 6 hill ring still radiates from one point. |
| P1-4 | Line build friction | ✅ Fixed (lines) | Tool stays armed, chains, Connect chip at the target. **Placement** still confirms only in the far-right panel. |
| P1-5 | Labels/panels cover the map | ✅ Mostly | Timeline docks right and is opaque. The Connect chip can now cover the target's badge. |
| P1-6 | Timeline unreadable | ✅ Fixed | Legend, kW axis, hour axis, "Now" marker, dashed limit line. |
| P1-7 | Tray / icons / naming | ✅ Fixed | "Small transformer 25 kW", distinct icons, no clipped tray at 1280. |
| P1-8 | Inspector empty | ✅ Fixed | Has role text plus Move/Remove. |
| P2 | Home polish, type scale | ✅ Fixed | `×` removed, "Start new campaign" demoted, cover fades in. CSS: 30 px literals vs 676 `var()` (was 364 vs 179). |
| Code | `main.ts` monolith | ✅ Fixed | Split into session, controller, map input and five UI modules. `main.ts` is now about 60 lines. |
| Code | No commits | ✅ Fixed | Baseline → Prettier → fixes, as recommended. |

---

## New / remaining issues

### P1 — affects play

1. **You build in the dark.** Every stage opens at 18:00–22:00, which now renders as deep night. The terrain is
   dark slate-green, buildings are near-black, and ports and the line preview barely show (stage 2's MV ports were
   hard to find). The design doc puts 18:00 at *blue dusk*, not night. **Fix:** in build mode (not running), clamp
   lighting to a "dusk-readable" floor: lift ambient, keep windows glowing, keep ports and ghosts full-contrast.
   Only go fully dark while the day is running.
2. **Day-time pulses look like hazard tape.** By mid-morning the stage-1 cables are dense yellow/black dashes from
   end to end. This breaks "quiet until it matters" and reads as a warning, not a flow. The spacing rule (one pulse
   per 5 kW per tile, max 6) looks too dense at this zoom, or the pulse sprite is too long. **Fix:** cap density
   so that pulses fill at most about 50% of the cable, and use small dots/chevrons rather than dashes.
3. **The completion moment is flat.** "The lights stayed on" appears in a mostly empty full-height card that hides the
   lit village behind blur.
   - Earned stars render as **outline** `ph-star`, the same as unearned (§5.4 says filled `--pp-spark`), and
     missed stars aren't shown, so players can't tell what to go back for.
   - The **Next stage** button's label sits off to the right with empty space on its left.
   - "Replay stage" just closes the dialog (`overlay-close`).
   - "Replaying a stage keeps your later builds" is confusing at this point.

   **Fix:** use a compact card over a visible, un-blurred village. Show all 4 stars filled or empty with their
   names, centre the button label, and pop in the earned stars.
4. **Placement still confirms far away.** Lines got the in-context Connect chip, but placing a transformer still
   needs a click on **Place** in the right panel, about 400 px from the ghost. Reuse the chip for placement. Also,
   while the chip is open, the right-hand panel shows a second, duplicate Connect button. Keep one.

### P2 — polish

5. **Badge pile-up in stage 6.** Six or more plug badges overlap around the robotaxi depot and become an unreadable
   cluster. Merge co-located badges into one with a count ("×6").
6. **The transformer ring reads as a dropped cable.** The loading ring at the village transformer renders as a dark
   ellipse on the ground. It looks like a loop of wire, not a gauge. Keep it neutral but thinner and lighter, or lift it to housing height.
7. **Stage 6 hill ring still radiates.** About 12 spokes come out of one transformer. Spokes are shorter now, but
   still star-shaped. Street poles or a shared feeder are still the real fix (deferred last round).
8. **Naming and chaining details.**
   - The player's first transformer is labelled "Small transformer 4". Number per player-built kind, or not at all.
   - After connecting to the Farm, the chain continues *from the Farm*, a load with nowhere useful to go. Chain
     from the line's source when the end is a consumer.
   - "Change start" shows before any start is chosen.
9. **Timeline nits.** The y-axis mixes "0.0 kW" and "100 kW". The chart is narrow in the 300 px dock. Each robotaxi
   row takes about 65 px (name, slider, two range labels), so five taxis need a long scroll. Use one row per taxi
   with an inline range bar.
10. **Dawn is muddy.** Around 04:00–05:00 the grade turns brown/olive (terrain and background together). Push the
    dawn key toward warm peach on the sky and keep the meadow green.
11. **Night HUD.** Coin/menu controls go grey-glass at night and lose contrast against the navy background. The goal
    card stays cream, which looks fine. Make the controls consistent with it.
12. **Home cover.** The night cover is now a hard dark rectangle inside the cream card, which is jarring compared with
    the previous floating diorama. Round its corners to match the card radius, or render the cover at dusk with
    a transparent background. A stray yellow dot (a pulse or star sprite) floats above the diorama.

## Code

- **Structure is good now.** `main.ts` is about 60 lines, and controller, session, map input and the UI modules are
  cohesive. `scene.draw()` rebuilds geometry only when the topology key changes, which fixes last round's concern.
- **The `actions` bag in `controller.ts`** is filled with `Object.assign(actions, hud/tray/...)` and typed with
  `as Actions`. The cast means a missing or renamed member compiles fine and fails at runtime. Have each factory
  return its slice and build `actions` from a spread, so TypeScript checks completeness, or pass explicit deps.
- **The topology key is computed with `JSON.stringify` of all nodes and lines on every `draw()`.** That's cheap
  today, but it's per step during a run. A `state.revision` counter bumped in `setState` would be O(1).
- **Repo hygiene:** the `.ai/features/ux-review-fixes/revision*.diff` files (about 400 KB, duplicating git history)
  are committed. Keep review packets out of git or `.gitignore` the `*.diff`/`*.json` snapshots. The other
  `.ai/features/*` folders are still untracked, so pick one policy.
- Bundle is about 587 kB (a warning). Lazy-loading Three.js after Home, or code-splitting the overlay module, would clear it.

## Suggested order

1. Build-mode lighting floor (#1) and pulse density (#2). These give the biggest perceived quality jump for small changes.
2. Completion card (#3) and placement chip (#4).
3. Badge merging, ring styling, naming and chaining (#5, #6, #8).
4. `actions` typing and the revision counter (code).
