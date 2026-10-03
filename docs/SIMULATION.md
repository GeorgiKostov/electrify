# Power Places — Simulation Model (MVP)

Version 0.1 · 29 Sep 2026 · Owner: design (Opus) · Status: approved for implementation

This file is the **single source of truth for game rules and numbers**. The MVP spec describes what the player
sees; this file describes what the simulation computes. Where they disagree, fix one of them. Do not copy rules
into other docs.

The model simplifies reality and keeps real cause and effect. Each simplification is listed in
[§9 Reality vs game](#9-reality-vs-game) and must never be contradicted by in-game copy.

---

## 1. Units, time and scale

| Quantity | Unit in sim | Shown to player | Notes |
|---|---|---|---|
| Power | kW (float) | `kW` | Rate of energy transfer. Never call it energy. |
| Energy | kWh (float) | `kWh` | Power × time. Battery contents, daily totals. |
| Voltage tier | `LV` / `MV` | "Low voltage 230 V", "Medium voltage 11,000 V" (region setting: 120/240 V, 12,470 V) | Compatibility, reach and loss class. Voltage physics is not simulated, so region changes labels only. |
| Time | step index 0–95 | `18:30` | 15-minute steps, 96 per day. |
| Distance | tiles | never as metres | Map is compressed. A tile is roughly 50 m for reasoning only. |
| Money | coins (integer) | ph-coins + number | Abstract building budget. No market. |

- Step length `Δt = 0.25 h`. Energy in a step = `kW × 0.25`.
- Authored profiles are hourly (24 values, normalised 0–1). The loader expands them to 96 values by **linear
  interpolation between hour marks**, with each hour's value at `hh:00` and step `95` interpolating back towards
  hour 0. The result is cached per profile. The expansion is part of the content pipeline and is tested.
- The sim uses only `+ − × ÷`, `min`, `max` and comparisons. No `Math.pow`, trig or randomness, so results are
  identical on every engine and platform.

### Two-day evaluation

Every evaluation simulates **two identical days** and scores **day 2 only**. Batteries and EV state carry over from
day 1. This removes start-of-day exploits (a battery that starts full gives free energy) without special rules.
The timeline shows day 2. Battery state at 00:00 of day 2 is shown as "start of day".
Every battery starts **empty at 00:00 on day 1**. Its day-2 charge is earned through its schedule and delivered
network power; no battery begins with free stored energy.

---

## 2. Network model

### Objects

| Object | Tier | Role |
|---|---|---|
| Grid connection | MV | Root of the network. Supplies (import) or absorbs (export) up to its limit. Authored, fixed. |
| MV line | MV | Carries power between MV objects. |
| Transformer | MV → LV | Joins one MV parent to one LV section. Has a capacity. Makes no electricity. |
| LV line | LV | Carries power inside an LV section. |
| Load (home, café, workshop) | LV | Consumes power by profile. Authored, fixed position. |
| Solar field / rooftop solar | LV | Generates power by profile × site. |
| Battery | LV | Stores energy. Follows its schedule. |
| Robotaxi charger (EV) | LV | Depot charger for one cab. Consumes shiftable blocks. |

A **bus** is a connection point: every object has one port; lines connect ports. Transformers have two ports
(MV side, LV side).

An **LV section** is the set of LV objects connected (through LV lines) to one transformer's LV port.

### Validity rules (checked on every edit, before any time-step)

1. **Tier match.** A line joins two ports of its own tier. Loads, solar, batteries connect only to LV.
   Violation: `WRONG_VOLTAGE` → the preview is invalid and cannot be placed.
2. **Radial.** The energised network is a tree rooted at the grid connection. A line that would close a loop is
   rejected with `LOOP_NOT_ALLOWED`. (Real distribution networks are also operated radially. Switches that open a
   loop are post-MVP.)
3. **LV reach.** Every object in an LV section must be within `lvReach` tiles of its transformer, measured along the
   lines. This stands in for voltage drop. Violation: `TOO_FAR_FOR_LV` → invalid preview, with the reach ring shown.
4. **One parent.** A transformer has exactly one MV parent. An LV section has exactly one transformer.
5. **Unconnected objects** are legal but unpowered. They count as unserved demand whenever they need power.
6. **Authored feeds.** Stage-3 street growth arrives prewired to the village transformer. The hill transformer has
   one fixed MV feed and its LV homes stay in the hill section. The depot accepts one MV-fed 50 kW transformer;
   its seven chargers have separate prewired LV branches. A shared 40 kW LV trunk cannot feed two 22 kW chargers.
   Player moves and connections must preserve these section constraints.

---

## 3. Per-step algorithm

For each step `t` of day 1 then day 2, in this exact order:

1. **Demand.** For each load: `demand = peakKW × profile[t]`. For each EV block active at `t`: add `chargerKW`.
2. **Solar available.** For each solar object: `avail = ratedKW × solarProfile[t] × siteFactor × weather[t]`.
3. **Battery intent.** For each battery, from its schedule at `t`:
   - Charge window: `want = min(maxKW, (capacityKWh − soc) / (Δt × ηc))`.
   - Discharge window: `offer = min(maxKW, soc × ηd / Δt, sectionNetDemand)`, where `sectionNetDemand` is its
     LV section's demand minus that section's solar. The battery never pushes power out of its own section.
     Player-facing rule: *in its discharge time, the battery powers the homes near it as much as it can.* With
     several batteries in one section, they share `sectionNetDemand` in placement order.
   - Otherwise idle.
4. **Section balance.** For each LV section, net = demand + battery charge − solar − battery discharge.
5. **Radial flow, leaves to root.** Post-order traversal. The flow on each line/transformer equals the net of
   everything downstream, plus that line's losses (§5). Positive = towards the loads (import direction).
6. **Limits.** Walking from leaves to root, when a component's `|flow| > capacity`:
   - If the flow is an **export** (surplus going upstream): **curtail solar** downstream proportionally until it
     fits. Record `unusedSolarKWh`. Not a failure.
   - If the flow is an **import** (demand going downstream): first reduce **battery charging** downstream (charging is
     flexible). If still over: the component **trips**. Everything downstream is unpowered for this step, and the
     step records `OVERLOAD` with the component, flow and capacity. This is a failure.
7. **Grid connection.** Root net within `gridLimitKW` in both directions. Import beyond it → `GRID_LIMIT` failure
   (never triggered in MVP content). Export beyond it → curtail solar.
8. **Battery update.** `soc += charge × ηc × Δt − discharge / ηd × Δt`, clamped to `[0, capacity]`.
9. **Record** per step: flow and loading % per component, losses, curtailment, SOC, served/unserved per load,
   import/export at the root, events.

Whenever curtailment, charge throttling or a trip changes injection, recompute flow and limits until settled.
The finite solar, charge and edge sets bound this deterministic process; failure to settle is an error, never a
silent pass. Record requested overload flow for diagnosis separately from actual delivered flow. A tripped branch
delivers no downstream load, battery energy or visual pulse during that step. The 200 kW grid connection trips
import above its limit rather than reporting a failure while still serving it.

A trip lasts for its step only. The next step is evaluated fresh. The **first** failure step is where Run Day pauses
and Check Day jumps to.

### Diagnostics (structured, never free text)

| Code | Fields | Meaning |
|---|---|---|
| `OVERLOAD` | componentId, step, flowKW, capacityKW, downstreamLoadIds | Demand through a line or transformer was over its limit; it tripped. |
| `UNCONNECTED` | loadId, firstStepNeeded | A load needs power but is not connected. |
| `TOO_FAR_FOR_LV` | objectId, distance, reach | Placement rule. |
| `WRONG_VOLTAGE` | portA, portB | Placement rule. |
| `LOOP_NOT_ALLOWED` | lineId | Placement rule. |
| `BATTERY_EMPTY` | batteryId, step | In a discharge window, the section still needed power and the battery had none left. Informational; the failure itself is the resulting `OVERLOAD`. |
| `BATTERY_POWER_LIMIT` | batteryId, step, neededKW, maxKW | Battery gave its maximum kW and it was not enough. Informational, linked to the `OVERLOAD`. |
| `GRID_LIMIT` | step, flowKW, limitKW | Reserved. |

Informational codes are attached to the failure they explain. The diagnosis card uses them to pick its "why"
sentence (see [VOICE_AND_COPY.md](VOICE_AND_COPY.md)).

---

## 4. Loads and flexibility

### Profiles (authored, illustrative, not measured data)

| Profile | Shape |
|---|---|
| `household` | Night baseline, morning bump, low midday, peak ≈ 18:00–19:00. Seed: `seed/game-design-v1/seed_data/example_profiles.json`. |
| `cafe` | Opens 06:00, peaks morning and lunch, near zero at night. Same seed file. |
| `workshop` | 07:30–17:00 flat block with lunch dip, near zero otherwise. To author. |
| `solar_clear` | Dawn ≈ 06:00, peak 12:00–13:00, dusk ≈ 19:00. Same seed file. |

A home's `peakKW` is its **share of a street's evening peak** (diversified demand), not the maximum a single
home can draw. A single kettle can draw 3 kW; many homes together average about 2 kW each at the evening peak.

### EV blocks (shiftable demand)

An EV charger has `chargerKW`, `needKWh`, and a `plugWindow` (for example 22:00–06:00 next day). The player places
one contiguous charging block on the timeline inside the plug window. Blocks are whole steps at full `chargerKW`.
Goal: blocks total at least `needKWh` by the end of the window. Default placement: starts at plug-in time.
The deadline is derived from each charger's own window; only energy actually served during that session counts.

Charging is **not** throttled by the network in MVP (it is a fixed block the player chose). Moving it is the
player's lever. Automatic smart charging is post-MVP.

---

## 5. Losses

Line losses are heat from current flowing through resistance (`P_loss = I²R`). At a fixed voltage,
`I ∝ P / V`, so loss grows with the square of the power and the length, and is far smaller at higher voltage.

```
lossKW = lossCoeff[tier] × lengthTiles × (flowKW / refKW[tier])²
```

- `refKW[tier]` equals the tier's line capacity, so the coefficient reads as "loss per tile at full load".
- Losses are added to the flow of the line (the upstream side supplies them) and summed into `lostAsHeatKWh`.
- Transformer losses are ignored in MVP.
- Losses are computed in each flow pass from that pass's line flow. A changed injection triggers a new pass as
  described in §3; transformer losses remain ignored.

---

## 6. Batteries

| Field | Meaning |
|---|---|
| `maxKW` | Most power in or out. **How fast.** |
| `capacityKWh` | Most energy stored. **How much.** |
| `ηc`, `ηd` | 0.95 each (≈ 90 % round trip). |
| `schedule` | Charge window(s) and discharge window(s) on the timeline. Default authored per battery type. |
| `soc` | Energy stored now, kWh. |

Batteries connect only to LV and help only their own LV section. This makes location matter: a battery beside the
wrong transformer does not help.

---

## 7. Metrics and goals

Computed over day 2:

| Metric | Definition |
|---|---|
| `unservedKWh` | Energy loads needed but did not get (trips + unconnected). |
| `firstFailure` | Earliest failure step and diagnostic. |
| `buildCost` | Sum of costs of every player-placed object currently on the map. |
| `gridImportKWh` | Energy imported through the grid connection. |
| `unusedSolarKWh` | Solar available minus solar used (curtailed). |
| `lostAsHeatKWh` | Sum of line losses. |
| `peakLoading[c]` | Highest loading % of each component. |
| `evShortKWh` | Energy EVs still needed at the end of their windows. |

A stage is **solved** when `unservedKWh = 0`, `evShortKWh = 0`, no placement errors exist and
`buildCost ≤ budget`. **Stage 4 also requires `gridImportKWh ≤ 550.85`** to complete its solar lesson. Stars are
defined in [MVP_SPEC.md §7](MVP_SPEC.md#7-goals-stars-and-budget), with achieved targets in
[LEVEL_AUDIT.md](LEVEL_AUDIT.md).

---

## 8. Balance reference (initial values — tune only through the level audit)

| Item | Value | Real-world anchor |
|---|---|---|
| Home | `household` × 2 kW | UK/EU diversified evening demand ≈ 1.5–2 kW per home |
| Café | `cafe` × 8 kW | Small commercial kitchen |
| Workshop | `workshop` × 15 kW | Small light-industry unit |
| Robotaxi charger | 22 kW, need 40 kWh, window 22:00–06:00 (day cab 11:00–15:00, need 20 kWh) | 22 kW AC depot charger; 40 kWh ≈ 250 km of driving |
| Depot connection | transformer L (50 kW), upgrade not allowed | Capped new connection |
| Rooftop solar (post-MVP) | 4 kWp, site 0.9 | Typical home array 3–5 kWp; stage-6 solar uses ground beside the depot. |
| Solar field | 30 kWp, 2 × 2 tiles, site 1.0 open / 0.5 shaded | ≈ 75 panels |
| Grid connection | MV, 200 kW both ways | Village MV feeder share |
| MV line | capacity 200 kW, lossCoeff 0.0005, cost 2 per tile | 11 kV overhead line |
| LV line | capacity 40 kW, lossCoeff 0.02, `lvReach` 6 tiles, cost 1 per tile | 230/400 V feeder, voltage-drop limited |
| Transformer S | 25 kW, cost 3 | Pole-mounted 25 kVA |
| Transformer L | 50 kW, cost 5; not allowed on "small pole" sites | Pole-mounted 50 kVA |
| Battery Quick | 10 kW / 10 kWh, cost 3, default charge 10:00–15:00, discharge 17:00–22:00 | 1-hour battery |
| Battery Long | 5 kW / 40 kWh, cost 4, same default windows | 8-hour storage |
| Removal / move | refunds 100 % | Old choices never lock the player out |

In the functioning web core, lines are direct overhead spans with Manhattan tile length for cost, loss and LV
reach. Road-biased routing and drawn cable paths remain a later visual refinement; the electrical distance and
cost are always visible before confirmation.

---

## 9. Reality vs game

The longer discussion is in `seed/game-design-v1/docs/06_REALITY_VS_ABSTRACTION.md`. This table is the binding
summary for copy and design reviews.

| Real world | Game | Must still be true in the game |
|---|---|---|
| Supply and demand balance every instant; frequency, inertia, reserves | Balanced every 15 min; the big grid absorbs mismatch | Electricity must be there *when* it is needed. |
| AC power flow through meshed networks | Radial tree, sum of downstream demand | Each line carries what everything beyond it needs. |
| Voltage drop limits LV feeder length | Fixed `lvReach` in tiles | Low voltage cannot carry power far. |
| Losses `I²R`, higher voltage → lower current | Loss ∝ length × (flow / capacity)², small coefficient for MV | Carrying power at higher voltage wastes less. |
| Transformers rated in kVA, have losses, heat up over time | kW limit, no losses, instant trip | A transformer changes voltage and has a limit. It makes no electricity. |
| Protection trips on sustained overload | Trips for the step where flow > limit | Too much flow switches equipment off; homes beyond it go dark. |
| Inverters limit solar output when the network is full | Proportional curtailment of solar | Available solar is not always usable. |
| Solar depends on irradiance, angle, shade, temperature, season | rated × profile × site × weather | Solar changes with time and place; it can power any load if the network can carry it. |
| Battery chemistry, degradation, thermal limits | kW, kWh, 95 %/95 % efficiency | Power (how fast) and energy (how much) are different limits. |
| Diverse, random household demand | One deterministic curve per archetype | Different buildings use electricity at different times. |
| Grid mix changes CO₂ through the day | Import total only (CO₂ per hour post-MVP) | Local solar reduces what we need from the grid. |

### Words and ideas the game must never teach

- A transformer makes or stores electricity.
- Solar cannot power a factory (the limit is the network, not the type of electricity).
- kW and kWh are the same thing, or a bigger battery is always a faster battery.
- The moving dots are electrons. (They show power flow: direction and amount.)
- Batteries or lines are "empty" or "full" of electricity. (Batteries store energy; lines carry power.)
- 15-minute balance means the grid is stable.
- Solar power has zero environmental cost. (Say "no CO₂ while it runs".)
