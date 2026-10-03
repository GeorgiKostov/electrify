# Power Places — Voice and Copy

Version 0.1 · 29 Sep 2026 · Owner: design (Opus) · Status: approved for implementation

Every word a player reads or hears. Write for a **12-year-old who is half paying attention**: they read the first
three words, look at the scene, and act. Adults get the same words; the detail they want lives in the inspector and
field notes.

All strings live in one module (`src/content/copy/en.ts`) with keys. A string exists once and is reused by key: the
tray tooltip and the inspector show the same tool description. Tests enforce the rules in §8.

---

## 1. Voice

**Calm, curious, clear, kind.** A friendly engineer beside you, not a teacher at a board and not a hype-man.

| We are | We are not |
|---|---|
| Direct: "Connect the farm." | Chatty: "Hey! Why don't we try connecting the farm?" |
| Specific: "At 18:30 the homes needed 29 kW." | Vague: "Too much power was used." |
| Kind: "The street lost power at 18:30." | Blaming: "You failed to supply the street." |
| Curious: "Where is the sun at 18:30?" | Preachy: "Remember, clean energy saves the planet!" |
| Honest: "Solar makes no CO₂ while it runs." | Absolute: "Solar is 100 % clean." |

At most one exclamation mark per screen, and only for real success.

## 2. Ten rules

1. **Lead with the thing.** The first three words carry the meaning. "Transformer overloaded", not "It looks like
   the transformer might be overloaded".
2. **One idea per sentence. Two sentences per card, at most.**
3. **Short.** Labels ≤ 4 words. Goals and tips ≤ 12 words. Explanations ≤ 20 words per sentence.
4. **Plain words.** Reading age about 9–10 for game UI; about 12 for field notes. Keep the few science words we
   teach (power, energy, voltage, transformer, kW, kWh) and explain each once, the first time it appears.
5. **Same thing, same word.** Use only the glossary term (§4). Never switch to a synonym for variety.
6. **Say what to do, or what happened.** Not both in one sentence.
7. **Visible names.** Refer to controls by their on-screen label, in bold in help text: **Run day**, **Check day**.
8. **Numbers are exact and formatted the same way** (§5). The scene carries the feeling; numbers carry the facts.
9. **No metaphors in instructions.** Analogies only in field notes, marked "It's a bit like…".
10. **Never repeat on screen.** If the scene or an icon already says it, the text doesn't. No text says what a
    tooltip beside it also says.

## 3. Science wording

These are binding. They protect the ideas in [SIMULATION.md §9](SIMULATION.md#9-reality-vs-game).

| Say | Don't say | Why |
|---|---|---|
| Solar panels **turn sunlight into electricity**. Power stations **make electricity**. | Batteries/transformers make electricity. | Only generators convert energy into electricity. |
| A battery **stores energy** and **gives it back later**. | A battery stores electricity / is full of electricity. | Batteries store chemical energy. |
| A transformer **changes the voltage**. | A transformer boosts power / makes more power. | Power in ≈ power out. |
| Lines **carry electricity**. | Lines store electricity / fill up. | Lines have no storage. |
| **Power** (kW) is **how fast** electricity is used or made. | Power when you mean energy. | kW vs kWh is core to the game. |
| **Energy** (kWh) is **how much** is used or stored over time. | Energy when you mean power. | |
| The **moving dots show power flow**: which way and how much. | The dots are electrons / electricity particles. | In AC, electrons mostly jiggle in place. |
| **Lost as heat** in the line. | Leaks out / disappears. | Energy is conserved; it becomes heat. |
| **Too far for low voltage.** The voltage drops too much. | The electricity runs out. | Voltage drop is the real limit. |
| It **switched off to stay safe**. | It exploded / broke / blew up. | Protection trips; nothing is destroyed. |
| **Uses electricity**. | Eats / burns electricity. | "Use" is the curriculum-normal verb. |
| Solar makes **no CO₂ while it runs**. | Solar is clean / free / has no impact. | Manufacturing and land use are real. |
| **The grid** (the big network beyond the village). | The internet of power / the power company. | |

## 4. Glossary (the only terms)

First mention in the game uses the full term plus the short definition; afterwards the term alone.

| Term (on screen) | Short definition (≤ 12 words, used in tips and the inspector) | Not |
|---|---|---|
| Electricity | Energy carried along lines to make things work. | juice, current (as a general word) |
| Power | How fast electricity is used or made. Measured in kW. | energy |
| Energy | How much electricity is used or stored over time. Measured in kWh. | power |
| kW (kilowatt) | Unit of power. 1,000 watts. | KW, kw, Kw |
| kWh (kilowatt-hour) | Unit of energy. 1 kW for 1 hour. | kW/h, kwh |
| Voltage | How hard electricity is pushed along a line. | power, strength |
| Grid | The big network that connects power stations to everyone. | mains, power company |
| Grid connection | Where the village joins the grid. | source, plant |
| Line | Carries electricity between two things. | wire, cable, power line (in UI) |
| Low-voltage line (LV, 230 V) | Carries electricity a short way to buildings. | street line |
| Medium-voltage line (MV, 11,000 V) | Carries electricity far with little loss. | high-voltage line (reserved for later) |
| Transformer | Changes medium voltage to low voltage. Makes no electricity. | converter, booster |
| Limit | The most power something can carry. | capacity (UI), max |
| Overloaded | More power than its limit. It switched off to stay safe. | broken, blown |
| Solar field / rooftop solar | Turns sunlight into electricity. | solar farm, PV (UI) |
| Unused solar | Solar power the lines couldn't carry. | wasted sun, curtailment (UI) |
| Lost as heat | Energy that warms the line instead of reaching buildings. | leaked |
| Battery | Stores energy to use later. | storage (UI) |
| Charge / give back | Battery taking in / sending out energy. | fill up / empty out |
| Robotaxi | A self-driving electric taxi. You choose when it charges. | Tesla, Cybercab, Waymo (any brand) |
| Depot | Where robotaxis park and charge. | garage |
| Data centre | A building full of computers, running day and night. (Post-MVP) | server farm, AI factory |
| MW (megawatt) | 1,000 kW. (Post-MVP) | Mw, mW |
| Demand | How much power buildings need right now. | load, consumption (UI) |
| Evening peak | The busiest time of day for homes, around 18:30. | rush hour (except stage title) |
| Coins | Your building budget. | money, credits |

Words reserved for field notes only (with explanation): current, resistance, curtailment, inverter, kVA, duck
curve, diversity, frequency.

## 5. Formatting

- Numbers and units: `25 kW`, `10 kWh`, `230 V`, `11,000 V` (thin grouping comma), `72 %` in labels (no space in
  compact map labels: `72%`). One decimal place only below 10 (`7.5 kW`), none above.
- Time: 24-hour `18:30` by default; `6:30 pm` when the 12-hour clock is chosen. Durations: `3 hours`, `45 min`.
- Voltages come from the region setting, never hard-coded in strings: `{lvVoltage}` (`230 V` / `120/240 V`) and
  `{mvVoltage}` (`11,000 V` / `12,470 V`). Tests render every string in both regions.
- Coins: icon + number, never the word "coins" beside the icon.
- Sentence case everywhere, including buttons and titles. UK spelling ("colour", "metres"). No full stops on
  labels, buttons or one-line goals; full stops in multi-sentence text.
- No real brand or product names in the game (vehicles, companies, chips). Say "robotaxi", "data centre".
- Stage titles are short noun phrases: "Evening rush", "The far farm".

## 6. Patterns and examples

### Goals (≤ 12 words, imperative)

| Stage | Goal |
|---|---|
| 1 First light | Give every building power |
| 2 The far farm | Get power to the farm across the river |
| 3 Evening rush | Keep every home powered all day |
| 4 Sunny field | Keep the village powered. Use the sun |
| 5 After sunset | Keep the hill homes powered all evening |
| 6 Night shift | Charge every robotaxi by 06:00. Keep the lights on |

### Navigation coach (per input device, like Paint Clouds `paintingControlCopy`)

| Step | Title | Touch | Trackpad | Mouse |
|---|---|---|---|---|
| Move | Move around | Drag the ground with one finger | Slide two fingers, or drag the ground | Drag the ground, or use the arrow keys |
| Zoom | Look closer | Spread to zoom in. Pinch to zoom out | Pinch to zoom | Scroll the wheel to zoom |
| Fit | Back to the village | Tap Fit to see everything | Click Fit to see everything | Press 0 or click Fit |

Tips & controls summary line: touch "Drag to move · pinch to zoom · tap to build"; mouse "Drag to move · wheel to
zoom · click to build".

### First-use tips (≤ 12 words, shown once)

| Tool | Tip |
|---|---|
| Low-voltage line | Drag from the transformer to a building |
| Medium-voltage line | Carries power far. Connect a transformer at the end |
| Transformer | Put it near buildings. Low-voltage lines start here |
| Solar field | Sunny spots make more. Watch the shade |
| Battery | Drag its times on the timeline to choose when it helps |
| Robotaxi lane | Drag the charging block. It must finish by 06:00 |
| Timeline | Drag to see any time of day |

### Placement reasons (invalid, ≤ 8 words)

`Too far for low voltage` · `Needs low voltage here` · `Needs medium voltage here` · `That would make a loop` ·
`Not enough coins` · `Something is already here` · `This pole can't hold a bigger one` · `Choose a whole tile`

Map/inspector editability uses `helpGrab`, `helpFixed` and `helpDepotFixed` in the copy module. The depot-specific
wording belongs only to its transformer; authored robotaxis and other village objects use the generic fixed cue.

### Diagnosis cards

Template: **Title** (what) → **When + numbers** → **Why** (one sentence) → **Try** (2–3 ideas, never the answer).

| Code | Title | When + numbers | Why |
|---|---|---|---|
| `OVERLOAD` (transformer) | Transformer overloaded | At {time} the buildings needed {flow} kW. This transformer can carry {limit} kW. | It switched off to stay safe. {n} buildings lost power. |
| `OVERLOAD` (line) | Line overloaded | At {time} this line carried {flow} kW. Its limit is {limit} kW. | It switched off to stay safe. {n} buildings lost power. |
| `UNCONNECTED` | Not connected | {name} needs power from {time}. | No line reaches it yet. |
| + `BATTERY_EMPTY` | *(adds to Why)* | | The battery ran out of energy at {time}. |
| + `BATTERY_POWER_LIMIT` | *(adds to Why)* | | The battery gave its most: {max} kW. They needed {need} kW. |

Ideas are keyed by code and unlocked tools. Examples: "Use a bigger transformer" · "Split the buildings between
two transformers" · "Add a battery near these homes" · "Move a battery's give-back time" · "Charge robotaxis at a
quieter time".

### Completion

Title: stage name + "done" is never used. Use the result: **The lights stayed on.** Then stars, one line on the best
star achieved ("You spent only 14 coins."), then the field note.

### Field note example (stage 5)

> **Tap and tank**
> It's a bit like water: the tap is power (kW), how fast it flows. The tank is energy (kWh), how much you have.
> A big tank with a tiny tap can't fill a bath quickly.
> *Real world: a home battery often gives 5 kW and stores 10–13 kWh.*

## 7. Accessibility text

- Every icon-only control has an `aria-label` equal to its visible tooltip, which is a glossary term or action verb.
- The diagnosis card is announced as a live region: title, then the when + numbers sentence.
- Map labels have text equivalents in the inspector; the canvas has a short description that updates with the goal
  state ("3 of 14 homes powered at 18:30").

## 8. Copy lint

`npm run lint:copy` (and a test) checks every string in `src/content/copy/`:

1. Word limits per string type (label 4, goal/tip 12, reason 8, sentence 20).
2. Banned words and phrases from §3 "Don't say" and §4 "Not" columns (case-insensitive, whole word), with
   an allow-list for field notes' reserved words.
3. Unit formatting: `\d kW`, `\d kWh`, no `KW`, `kw`, `kW/h`.
4. No trailing full stop on labels, buttons and goals; sentence case on buttons and titles.
5. At most one `!` per screen group.
6. Every `{placeholder}` exists in the template's parameter list.
7. No duplicate string values across keys (warn), so one fact lives in one place.
