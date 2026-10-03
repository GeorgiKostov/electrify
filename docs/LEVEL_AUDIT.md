# Level audit

Six sequential witnesses start from the previous witness state. Stage entries retain the actual player network. The simulator evaluates two identical days and scores day 2.

| Stage | Cost / budget | Unserved kWh | EV short kWh | Grid import kWh | Lost as heat kWh | Unused solar kWh | Stars | Entry requires action |
|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 First light | 9 / 15 | 0.00 | 0.00 | 116.88 | 0.017 | 0.00 | Lights on, Thrifty | yes |
| 2 The far farm | 38 / 42 | 0.00 | 0.00 | 252.97 | 0.061 | 0.00 | Lights on, Thrifty, Clean | yes |
| 3 Evening rush | 40 / 48 | 0.00 | 0.00 | 514.95 | 0.075 | 0.00 | Lights on, Thrifty | yes |
| 4 Sunny field | 65 / 88 | 0.00 | 0.00 | 500.77 | 0.300 | 0.00 | Lights on, Clean, No waste | yes |
| 5 After sunset | 76 / 102 | 0.00 | 0.00 | 853.54 | 0.330 | 0.00 | Lights on, Thrifty, Clean | yes |
| 6 Night shift | 99 / 145 | 0.00 | 0.00 | 1139.75 | 0.534 | 0.00 | Lights on, Thrifty, Clean | yes |

Targets use witness metrics with about 10 % slack. Stage 4 also requires its Clean target for completion. Stage 3 entry first trips at step 74 (18:30). Stage 6 passes with staggered overnight sessions and a prewired depot LV fanout. Negative cases for shade, curtailment, battery power and energy limits, wrong section, simultaneous chargers, and grid trip are covered in `tests/core.test.ts`.
