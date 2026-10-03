# Correction round 1 — timeline internal scroll

Finding: Astra R1 [P2], editing a lower schedule lane resets .timeline-detail scrolling.

Fix: mark the timeline's detail overflow with a stable scroll key. Before changed-section replacement, patch() saves marked container offsets, then restores them before restoring focus. Unchanged sections still retain exact nodes. No generic DOM diff framework or simulator change.

Regression: the real production controller's lane change commits cab5 from 104 to 105 after an internal scroll of 900. The test models DOM replacement creating a fresh scroll element at zero, then requires the corrected patch to retain scroll 900, focus and camera fit count. All 66 tests pass. Final typecheck and build pass. Coordinator 390×844 browser recheck passed: ArrowRight 104→105 retains the lower lane/focus, ArrowLeft restores 104 while retaining exact scroll 920. Astra R1 code and test re-review passed; no further finding.
