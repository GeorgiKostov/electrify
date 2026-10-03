# Codex Bootstrap — Power Places

Build a new Three.js + TypeScript + Vite prototype for Power Places.

Read the entire `docs/` folder first.

## First playable slice

Create:
- small isometric village
- external MV connection
- two houses
- café
- placeable transformer
- LV/MV line routing
- 24-hour demand profile
- transformer capacity
- clear overload diagnosis

## Interaction

Implement:
- pan/zoom
- tile hover
- placement ghost
- place/remove/reposition
- undo
- drag line between ports
- timeline scrub
- Run Day
- Pause
- 1× / 4×
- Analyse

## Architecture

Separate:
- rendering
- world state
- electrical graph
- simulation
- content
- UI
- diagnostics

Do not derive gameplay state from Three.js scene objects.

## Scientific constraints

Do not accidentally teach:
- transformers create power
- solar cannot power industry
- MW and MWh are interchangeable
- radial branch flow is full AC power flow
- 15-minute adequacy means frequency stability

## Definition of done

- valid/invalid voltage connections work
- transformer limits enforced
- daily demand changes
- failure pauses simulation
- exact cause is shown
- valid solution passes automated test
- build/typecheck/tests pass
