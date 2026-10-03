# Technical Design

## Stack

- TypeScript
- Three.js
- Vite
- JSON-authored levels
- Blender → GLB
- deterministic simulation
- automated puzzle audit

## Architecture

Separate:

1. World/grid state
2. Electrical graph
3. Time-series simulation
4. Rendering
5. UI
6. Level data
7. Diagnostics

Rendering must not determine electrical state.

## Core data

```ts
type VoltageTier = "LV" | "MV";

interface ElectricalNode {
  id: string;
  kind: "bus" | "grid" | "load" | "generator" | "battery";
  voltage: VoltageTier;
  x: number;
  y: number;
}

interface ElectricalEdge {
  id: string;
  from: string;
  to: string;
  voltage: VoltageTier;
  capacityMW: number;
}

interface Transformer {
  id: string;
  highBus: string;
  lowBus: string;
  capacityMW: number;
}

interface Battery {
  nodeId: string;
  capacityMWh: number;
  socMWh: number;
  maxChargeMW: number;
  maxDischargeMW: number;
}
```

## Simulation step

Every 15 minutes:

1. evaluate demand
2. evaluate variable generation
3. match reachable local supply
4. identify residual demand/surplus
5. charge batteries from reachable surplus
6. discharge batteries into shortages
7. import remaining demand from external grid
8. enforce line and transformer capacity
9. record curtailment, SOC, loading, unserved demand
10. return causal diagnostics

## Diagnostics

Failures should be structured:

- EDGE_OVERLOAD
- TRANSFORMER_OVERLOAD
- INSUFFICIENT_SUPPLY
- BATTERY_POWER_LIMIT
- BATTERY_EMPTY
- INVALID_VOLTAGE_CONNECTION

## Preview

The same evaluator powers:
- committed simulation
- placement preview
- hint system
- puzzle audit

## Radial MVP

The energized network is radial.

This enables:
- clear causal tracing
- simple branch load accumulation
- readable bottlenecks
- predictable puzzle authoring

## Tests

Every authored level should have at least one known valid solution.

Audit:
- replay known placements
- simulate full horizon
- assert all mandatory load is served
- assert capacities are respected
- assert budget valid
