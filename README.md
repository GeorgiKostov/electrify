# Power Places

**Build the grid. Grow the place. See how it works.**

A calm isometric game about building the electrical network behind a growing village. Connect homes, carry power
far at higher voltage, survive the evening peak, catch the sun, store energy for after sunset and choose when cars
charge. Every rule is simple; every cause and effect is real.

Three.js · TypeScript · Vite. Web core now; final Blender assets, audio, iOS/Android and Steam later.

## Status

The six-stage web core is playable, with deterministic simulation, construction, schedules, progression and local
saves. Review and device performance checks remain. See [PROJECT_STATUS.md](PROJECT_STATUS.md) and the
[level audit](docs/LEVEL_AUDIT.md).

## Docs

- [MVP design spec](docs/MVP_SPEC.md)
- [Simulation model](docs/SIMULATION.md)
- [Design language](docs/DESIGN_LANGUAGE.md)
- [Voice and copy](docs/VOICE_AND_COPY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design review of the seed package](docs/reviews/DESIGN_REVIEW_2026-09-29.md)

Agents: start with [AGENTS.md](AGENTS.md).

## Setup (once per machine)

```sh
git lfs install
```

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run lint:copy
npm run levels:audit
npm run build
```

The dev server binds `127.0.0.1:5186`. `npm run levels:audit -- --write` refreshes the level report.
