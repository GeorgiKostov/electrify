# Power Places UX review acceptance

Task date: 3 October 2026. Implementation: Sol 6.1; independent review: Astra.
Repository: `Z:/Projects/Repositories/electrify/electrify`.
Original report: `docs/reviews/UX_UI_REVIEW_2026-10-02.md`.

## Baseline

- Initial commit: `cabf9f0`; formatting-only checkpoint: `be49785`.
- Sol reports baseline 52 tests, typecheck, copy lint (210 strings), six-stage audit and production build pass.
- Browser testing uses `http://127.0.0.1:5187/`, separate from the user's saved campaign at port 5186.
- Phone Tasks at 375 × 812 opens correctly before changes; preserve as a regression check.
- Browser animation is operational: a one-line stage-1 run reaches the expected unconnected failure at 00:00.
- Baseline scene screenshot: `ux-review-baseline.png`.

## Final browser checks

Implementation-preview evidence (before final review; final smoke still required):

- Played all six stages through normal UI at the separate test origin, using keyboard building controls and schedules. All six succeeded; original port-5186 save never modified.
- Restarted test stage 1: three separate unpowered badges; clicked transformer → Home 1 and target-local Connect; tool remained armed with Home 1 as source. Chained Home 1 → Home 2. Home 2 → Café correctly failed cumulative LV reach and disabled both confirmations. Stationary secondary click cancelled; Escape also exited line mode.
- Completed changed stage-1 layout with direct transformer → Café. A full animated day reached 23:45 and the successful result with Lights on and Thrifty. Observed a daylight frame at 14:15 and night at completion.
- Reduced motion showed static directional arrows. Unchecking it in Settings produced moving dots; screenshots `ux-review-pulses-a.png` and `ux-review-pulses-b.png` show different positions.
- Café inspector showed current demand 0.4 kW, all-day need, peak 08:00 / 8.0 kW, transformer connection and Powered. Selection ring clearly visible at night.
- Stage-6 schedules survived reload: taxis 3/4 start 96, taxis 5/6 start 104. Labels show midnight and 02:00 with next-day annotation.
- Phone Tasks opened at 320 × 640 and 375 × 812. At 390 × 844, expanded timeline scrolls to overnight taxi lanes while Run/Check/Collapse remain fixed.
- Full tray fits at 1280 × 800; wraps at 900 × 800. Desktop dock is opaque and bounded at 1280 × 720 and 1920 × 1080. Stage covers 3/4 are visibly distinct dusk/noon scenes.
- Found and sent early corrections: night HUD contrast, offscreen dock due transformed ancestor, missing glyphs, text encoding, tiny SVG labels, phone expanded-camera overlap, collapsed timeline width, and focused select handling. These were corrected in subsequent previews.
- Rechecked the 844 × 390 correction: controls sit on the right, map and camera controls on the left. Expanded Run/Check/Collapse remain reachable; details scroll within the right dock.
- Post-extraction smoke: app starts; stage-6 saved schedules remain 88 / 96 / 104; chart and night scene render correctly. Desktop screenshot: `ux-review-stage6-desktop.png`. Full animated stage-6 day reached 23:45 and the success overlay with Lights on, Thrifty and Clean.
- Phone 390 × 844: Fit view centers the map in free space and Tasks opens after extraction. Screenshot: `ux-review-stage6-phone.png`.
- Astra R1 reproduced and fixed in correction round 1: lower taxi edit had reset nested scrolling to 0. Browser recheck at 390 × 844 retained the visible taxi row and focus; subsequent 105 → 104 edit kept scrollTop exactly 920. Screenshot: `ux-review-timeline-scroll-fixed.png`. Test taxi 5 restored to 104.
- Returned the deliverable browser to port 5186: original saved stage 1, 6/15 coins and two stars remain intact. All test-campaign changes were on port 5187. Viewport override reset.

- [x] Stage 1: every unpowered building has a readable badge.
- [x] Source → target → nearby confirmation; tool remains armed and next source is target.
- [x] Easy source reselection; invalid reach/cycle stays invalid; Undo restores prior network.
- [x] Cancel, secondary-click cancel, navigation and held-preview cancellation stay safe.
- [x] Full successful animated day, day/dusk/night distinction, power windows, completion and stars.
- [x] Failing day pauses at correct failure step.
- [x] Stage 3: shared chart scale, labelled axes/legend/component limit, synced now marker.
- [x] Stage 4: distinctive cover and useful solar display.
- [x] Stage 6: readable cable attachments, power state, schedule endpoints including midnight.
- [x] Inspector: selection cue, authoritative demand/time/connectivity/outage reason.
- [x] Expanded timeline opaque, bounded and scrollable; actions reachable.
- [x] Tasks, Resources and other panels do not refit camera or discard held preview.
- [x] Home first load has no broken image; no ambiguous close; secondary campaign action.
- [x] Phone frame has no avoidable dead band; camera controls and tray do not overlap.
- [x] 320 × 640, 390 × 844, 844 × 390, 1280 × 720, 1920 × 1080.
- [x] Additional review sizes 375 × 812, 1280 × 800 and intermediate desktop.
- [x] Save/reload preserves edited schedules and campaign state.

## Final code and test checks

- [x] Review findings each have a disposition and evidence.
- [x] Main is meaningfully split into cohesive UI, session and map-input modules.
- [x] Simulator stays authoritative; existing electrical values and constraints preserved.
- [x] Time updates reuse scene geometry; stable panels retain focus/details/scroll. Geometry and focus pass; Astra R1 nested scroll correction verified in browser and production-path regression.
- [x] Coordinator independently ran 66 tests after R1. Typecheck, copy lint (218), six-stage audit and production build passed before the narrowly scoped R1 correction; Sol's final corrected rerun passes all required checks. Existing bundle-size warning remains.
- [x] Fresh Astra final verdict: pass after correction round 1, no outstanding findings. All 32 manifest file hashes match.
- [x] One correction round used. Final scope SHA-256: 9df393ec8e225758f1bfe373d53ff60c97615d74e434935fe9370d0548f16860.
