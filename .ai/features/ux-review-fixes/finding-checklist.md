# Review finding dispositions — 3 October 2026

Report: docs/reviews/UX_UI_REVIEW_2026-10-02.md. Every finding is in scope. Coordinator browser acceptance passed, including R1. Astra exact final revision confirmation passed with no outstanding findings.

| Finding | Disposition and implementation | Evidence |
|---|---|---|
| P0 1 day/night | Fixed: smooth hemisphere/sun/background lighting; powered emissive front/side windows; chapter focus time in covers. | daylight interpolation + cover camera restoration tests; coordinator noon/dusk/22:00 and full-day observations. |
| P0 2 power state/pulses | Fixed: every unpowered load has a plug badge; powered daytime activity and warm windows; retained idle signed pulses at constant world speed; reduced-motion static arrows. | badge/target suppression and pulse-math tests; coordinator moving-dot screenshot pair and reduced-motion observation. |
| P0 3 cable convergence | Fixed with the simpler visual-only option: deterministic per-edge attachments around transformer/pole, shared by cable and pulse paths. | attachment distinctness/order/immutable state/results tests; prepared stage-6 Fit view. Existing fanout topology and electrical rules retained. |
| P1 4 line loop | Fixed: explicit target-local Connect, armed tool, target becomes source, Change start; Esc/stationary secondary click cancels; secondary drag pans. | real handler touch/chaining/cumulative reach/invalid confirmation/navigation/UI interception regressions; coordinator actual map clicks. |
| P1 5 overlap/timeline/coach | Fixed: target/source/hover text suppresses while badges stay; opaque bounded desktop dock; scrollable details and persistent actions; dark coach hand; expanded phone camera ownership. | preserved window/preview/camera tests; five documented browser viewports and extra sizes. |
| P1 6 chart/schedules | Fixed: one kW scale, hour/y ticks, legend, synchronized Now, correctly named grid import and grid connection limit; legal schedule start endpoints and next-day labels. | chart scale/values/cursor test, EV midnight/range/save test; coordinator chart and saved 96/104 starts. Default 22:00 at left is expected at min 88. |
| P1 7 tray/naming/icons | Fixed: desktop wrapping, compact scroll, Small/Large transformer with capacity, distinct Phosphor glyphs; MV line has path glyph. | glyph test now scans every production module; generated 51 glyphs; coordinator 1280×800 and 900×800. |
| P1 8 inspector/highlight | Fixed: authoritative demand, need/peak timing, connections and missing-line/upstream-trip/idle reason; visible selection ring updated in place. | demand sum/reason tests and mesh retention/selection test; coordinator café readout/night ring. |
| P2 Home broken cover | Fixed: no src until cover exists, reserved art area, fade on ready; async image-only patch. | coordinator first-load Home; DOM retention + cover camera restoration tests. |
| P2 Home empty lower third | Fixed: content-sized desktop Home; full-screen phone centers content. | coordinator desktop/phone Home. |
| P2 Home ambiguous close | Fixed: Home omits close; primary Start/Continue opens game. | production Home branch; coordinator fresh load. |
| P2 new-campaign hierarchy | Fixed: secondary subdued full-row campaign link; original archive logic unchanged. | existing archive/restore/failure persistence tests; coordinator Home. |
| P2 stage3/4 covers | Fixed: audited completed layouts + distinct dusk/noon focus show growth and solar. | coordinator visually distinct covers 3/4; camera restoration test. |
| P2 phone frame/camera | Fixed: measured free frame without the 152 px dead reserve; bottom-right camera; temporary suppression during expanded sheet; landscape right column. | layout/camera stability regressions; 320×640, 390×844, 375×812 and 844×390 browser. |
| P2 phone Tasks | Baseline working, preserved; count uses a 12 px token, Tasks labelled/expanded. | coordinator baseline+changed phone Tasks; actual handler windows tests. |
| P2 typography/spacing | Fixed: all font sizes map to five type tokens; repeated control/spacing/radius/dimensions use reusable tokens. | source/style review; browser labels/axes readability after correction. Breakpoint, transform and viewBox geometry are structural values. |
| Code formatting | Fixed separately before behavior: local baseline cabf9f0, formatting checkpoint be49785. | baseline 52 tests and checks before and after formatting. |
| Code main split | Fixed: small bootstrap, concrete session and command/playback coordinator, cohesive five UI modules and map-input; one refresh dispatcher. | 66 production regression tests; no VM/AST extraction of main handlers. |
| Code DOM reconstruction | Fixed: identical section output retains exact nodes; changed output preserves focus/selection/open Details and host scroll; covers patch only images. | patch select/text/Details/scroll test; unchanged panel/preview tests; coordinator focused region select. |
| Code Three reconstruction | Fixed: topology+grid cache; step/selection/schedules update existing materials/fill/visibility, instanced pulses. | real Three geometry retention test; topology edit rebuild tested. |
| Code no baseline | Fixed: scoped local baseline + separate formatting commit, no push. | cabf9f0 and be49785. Existing historical .ai artifacts preserved untracked. |
| Previously unverified animation | Verified by coordinator successful 60-second stage-1 day with completion and stars and moving idle pulses; failing run regression at 18:30. | browser acceptance record + playback regression; full stage-6 day also completed after extraction. |

Limits: cable attachment offsets reduce visual convergence but do not bundle or reroute dense fanout. No physical-device frame-rate benchmark or real touch hardware run is claimed. Existing production chunk-size warning remains. No asset/audio/native/deployment scope added.

Astra correction round 1: internal timeline scroll now has an explicit stable key and a real lane-change regression; coordinator browser recheck passed, and Astra R1 re-review passed. Astra verified the exact final revision and passed with no outstanding findings.
