# Follow-up UX fixes — 3 Oct 2026

Scope: docs/reviews/UX_UI_REVIEW_2026-10-03.md, all twelve findings and code/hygiene notes. The implementation preserves simulation formulas, authored levels and saved campaign format.

| Finding | Disposition |
|---|---|
| 1 Build darkness | Dusk light/sky floor in build; full night only while running. |
| 2 Hazard-tape pulses | Small sparse dots, capped density; points follow sagging cable paths. |
| 3 Completion | Compact desktop-right card, clear village, all four star types with earned/missed/not-this-stage status, filled stars and reduced-motion-aware pop, centred Next, true Replay with entry focus time. |
| 4 Confirmation | One nearby Place/Move/Connect chip; duplicate panel actions removed; corrected instructions. |
| 5 Badge pile-up | Nearby warnings merge into a counted pill with all names accessible. |
| 6 Transformer ring | Thin light neutral gauge raised onto housing. |
| 7 Hill spokes | Dense circuits run through street supports and sagging parallel spans; no electrical rerouting or reach change. |
| 8 Names/chaining | Number player objects within kind; terminal consumers retain upstream source; Change start requires chosen source. Residential pole chaining stays available. |
| 9 Timeline | Wider shared-scale plot, consistent whole-kW ticks, inline schedule rows and range/value accessibility. |
| 10 Dawn | Peach sky with neutral ambient; meadow retains green. |
| 11 Night HUD | Cream high-contrast coin/menu controls. |
| 12 Home cover | Rounded art edges, dusk-readable cover, pulse sprites omitted. |
| Actions | Explicit dependency slices and statically checked factory spread; no Actions cast or incremental Object.assign. |
| Topology | Session revision increments once per layout/stage change; O(1) draw key; schedule edits retain meshes. Preview identity keys held previews. |
| Repo | Markdown records retained; generated .ai diffs/revision JSON uniformly ignored and previously tracked snapshots untracked. |
| Bundle | Dedicated Three.js vendor chunk clears the 500 kB warning without dependencies. |

Validation: 74 tests (eight focused regressions added), strict typecheck, copy lint (221 strings), six-stage sequential audit and production build pass. Vendor chunk 497.99 kB, game chunk 106.87 kB. Browser checks use a memory-save-only temporary fixture on port 5188 with a timer-backed animation loop, leaving the owner's live save untouched. Browser acceptance passed: full stage-1 and stage-6 day runs through completion; true Replay restores entry network, budget and focus time while retaining later stages; one local Place/Move/Connect confirmation; Small transformer 1 naming and upstream-source retention after the farm; visible ×7 warning pill; housing gauge and street-supported hill circuits; rounded sprite-free covers; no browser console errors. Required sizes 320×640, 390×844, 844×390, 1280×720 and 1920×1080 pass, including reachable expanded timeline actions. Desktop completion is a compact right card over a visible village; phone completion is a compact bottom card with no clipping at 320×640. Robotaxi 5 keyboard edit 104→105→104 keeps focus and the internal timeline scroll at 479. Screenshots: [desktop completion](<C:/Users/Georgi/Documents/ChatGPT/New project/ux-followup-completion.png>), [stage 6](<C:/Users/Georgi/Documents/ChatGPT/New project/ux-followup-stage6.png>), [phone completion](<C:/Users/Georgi/Documents/ChatGPT/New project/ux-followup-phone.png>). Final formatted source and phone CSS were rechecked: 74/74 tests and production build/typecheck pass; copy and six-stage audit also pass. The owner's save was never edited.

Publication authorized by the owner on 3 Oct 2026; publishing through the existing main-to-Vercel integration.
