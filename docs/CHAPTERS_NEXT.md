# Power Places — Next chapters (post-MVP concept)

Version 0.1 · 29 Sep 2026 · Owner: design (Opus) · Status: concept, not approved for implementation

The two headline themes after the MVP: **robotaxi fleets** and **AI data centres**, the biggest new demands on real
grids right now. Both reuse MVP systems (shiftable blocks, batteries, limits, the timeline) and add a few rules.
Proposed rules move into [SIMULATION.md](SIMULATION.md) only when a chapter is approved. No real brand names in game
([VOICE_AND_COPY.md §5](VOICE_AND_COPY.md#5-formatting)).

---

## Chapter 2 — Robotaxi town

A market town becomes a robotaxi hub. The MVP's six-cab depot grows into a fleet of 40, with fast chargers.

| Stage | New idea | Beat |
|---|---|---|
| Fast lane | Fast charging = big power, short time | 150 kW chargers finish a cab in 20 min but hit limits instantly. Slow vs fast charging is kW vs kWh again. |
| Morning rush | Deadlines | Cabs leave in waves (06:00, 07:00, 08:00); each wave has its own deadline. |
| Give it back | Vehicle-to-grid | Parked cabs can **give power back** at the evening peak and recharge overnight. The fleet becomes a shared battery. |
| Busy roads | Demand follows people | Cabs return at different times on a rainy day (more rides, less charge). |
| Night shift II | Everything together | Fleet, town peak, solar canopy, depot battery. Star: import the least. |

**Proposed sim additions:** multiple deadlines per cab; V2G as a discharge window on a cab lane, limited so the cab
still meets its deadline (`BATTERY_EMPTY`-style diagnostic if not); fast-charger object (DC, 150 kW).

**Payoff moment:** at 06:00 the cabs roll out of the depot one by one, headlights sweeping the street.

## Chapter 3 — The data centre

A regional town is chosen for an AI data centre. The scale jumps from kW to **MW (1,000 kW)**, with a new HV tier
and substation.

| Stage | New idea | Beat |
|---|---|---|
| Always on | Flat 24/7 demand | 20 MW, day and night. Solar alone can't cover the night: the chart shows the gap. |
| The queue | Connection limits | The substation is full. Choose: wait (the town grows meanwhile), build an HV line, or bring your own supply. |
| Train at noon | Flexible compute | Training jobs can move to sunny or windy hours; answering users (inference) can't. Two block types on the timeline. |
| Hot afternoon | Cooling | Cooling demand rises with the afternoon heat, right when homes also need it. |
| The trade-off | Choices with costs | Battery, grid upgrade, on-site gas turbine (CO₂) or more solar + storage. Stars: Thrifty vs Clean pull apart. |

**Proposed sim additions:** HV tier and substation (HV → MV); MW display rule (≥ 1,000 kW shown in MW); load
classes `firm` vs `flexible` with daily energy targets; temperature-linked cooling profile; dispatchable generator
with CO₂ per kWh; connection-limit event that changes between stages.

**Field note seed** (numbers to verify against the IEA *Energy and AI* report before shipping): data centres used
about 1.5 % of the world's electricity in 2024, and this may roughly double by 2030.

## Why these two fit the game

- Both are **huge but different** demands: a fleet is flexible in time; a data centre is steady but partly flexible.
  That extends the MVP's core lesson (where and when) instead of adding unrelated mechanics.
- Both are in the news, so teenagers recognise them, and adults want to understand them.
- Both look great in the diorama: the fleet rolling out at dawn; a glowing server hall with cooling fans humming at
  night.
