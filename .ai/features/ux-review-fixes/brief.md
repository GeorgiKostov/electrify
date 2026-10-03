# UX review fixes

User authorization: fix all findings with Sol implementation and Astra review; no further approval gate. No deployment or push. Existing saves and electrical balance are preserved.

Source: docs/reviews/UX_UI_REVIEW_2026-10-02.md. Scope includes P0, P1, every P2 and code-design findings.

Acceptance: readable day/night and powered states; all unpowered badges; legible cables; explicit local line confirmation with armed/chained tool and safe cancellation; labelled shared-scale timeline; responsive tray, inspector and menus; distinct stage covers; five type tokens; cohesive session/UI/input modules and unchanged DOM/mesh retention. Deterministic simulation, progression, preview cancellation and saves remain covered.

Mandatory checks: npm test, typecheck, lint:copy, levels:audit and build. Coordinator verifies live browser acceptance and fresh Astra review.
