import type {
  State,
  Node,
  DayResult,
  StepResult,
  Diagnostic,
  Metrics,
} from '../game/types';
import { profiles } from '../content/profiles';
import { buildTree, nodeVertex, subtree, type Tree } from './network';
import { buildCost } from '../game/commands';
const isLoad = (n: Node) =>
  n.kind === 'home' || n.kind === 'cafe' || n.kind === 'workshop';
const isBattery = (n: Node) =>
  n.kind === 'batteryQuick' || n.kind === 'batteryLong';
const bSize = (n: Node) =>
  n.kind === 'batteryQuick' ? { kw: 10, kwh: 10 } : { kw: 5, kwh: 40 };
const abs = (n: number) => (n < 0 ? -n : n);
function evDuration(n: Node) {
  let duration = 0;
  while (duration * (n.chargerKW ?? 22) * 0.25 < (n.needKWh ?? 0)) duration++;
  return duration;
}
function evActive(n: Node, start: number, step: number) {
  const duration = evDuration(n);
  const local = start >= 96 ? start - 96 : start;
  return (
    (step >= local && step < local + duration) ||
    (local + duration > 96 && step < local + duration - 96)
  );
}
function descendants(tree: Tree, v: string) {
  return subtree(tree, v)
    .map((id) => tree.nodes.get(id))
    .filter((n): n is Node => !!n);
}
function flowPass(
  tree: Tree,
  base: Record<string, number>,
  disabled: Set<string>,
  solar: Record<string, number>,
  charge: Record<string, number>,
  discharge: Record<string, number>,
) {
  const net: Record<string, number> = {},
    flow: Record<string, number> = Object.fromEntries(
      tree.edges.map((e) => [e.id, 0]),
    ),
    loss: Record<string, number> = {};
  const children: Record<string, string[]> = {};
  for (const v of tree.order) {
    if (tree.parent[v]) (children[tree.parent[v]] ??= []).push(v);
  }
  for (let i = tree.order.length - 1; i >= 0; i--) {
    const v = tree.order[i];
    if (disabled.has(v)) {
      net[v] = 0;
      continue;
    }
    let total = base[v] ?? 0;
    const n = tree.nodes.get(v);
    if (n)
      total +=
        (charge[n.id] ?? 0) - (discharge[n.id] ?? 0) - (solar[n.id] ?? 0);
    for (const ch of children[v] ?? []) total += flow[tree.via[ch]] ?? 0;
    net[v] = total;
    const eid = tree.via[v],
      edge = tree.edgeById.get(eid);
    if (edge) {
      const ll =
        edge.lossCoeff *
        edge.length *
        (total / edge.capacity) *
        (total / edge.capacity);
      loss[eid] = ll;
      flow[eid] = total + ll;
    }
  }
  return { net, flow, loss, root: net[tree.order[0]] ?? 0 };
}
export function simulate(state: State): DayResult {
  const tree = buildTree(state);
  const nodes = [...state.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const batteryNodes = nodes
    .filter(isBattery)
    .sort(
      (a, b) =>
        (a.placedOrder ?? 0) - (b.placedOrder ?? 0) || a.id.localeCompare(b.id),
    );
  const soc: Record<string, number> = {};
  for (const n of batteryNodes) soc[n.id] = 0;
  const result: StepResult[] = [];
  const metrics: Metrics = {
    unservedKWh: 0,
    evShortKWh: 0,
    gridImportKWh: 0,
    unusedSolarKWh: 0,
    lostAsHeatKWh: 0,
    buildCost: buildCost(state),
    peakLoading: {},
  };
  let firstFailure: Diagnostic | undefined;
  const evSession: Record<string, number> = {};
  for (let t = 0; t < 192; t++) {
    const step = t < 96 ? t : t - 96;
    const base: Record<string, number> = {},
      solar: Record<string, number> = {},
      available: Record<string, number> = {},
      charge: Record<string, number> = {},
      discharge: Record<string, number> = {};
    const demand: Record<string, number> = {},
      activeEv: Record<string, boolean> = {};
    for (const n of nodes) {
      if (isLoad(n)) {
        const profile =
          n.kind === 'home'
            ? profiles.household
            : n.kind === 'cafe'
              ? profiles.cafe
              : profiles.workshop;
        demand[n.id] = (n.peakKW ?? 0) * profile[step];
        base[n.id] = demand[n.id];
      } else if (n.kind === 'ev') {
        const start = state.evStarts[n.id] ?? n.window?.[0] ?? 88;
        activeEv[n.id] = evActive(n, start, step);
        demand[n.id] = activeEv[n.id] ? (n.chargerKW ?? 22) : 0;
        base[n.id] = demand[n.id];
      } else if (n.kind === 'solar') {
        available[n.id] = 30 * profiles.solar[step] * (n.siteFactor ?? 1);
        solar[n.id] = tree.connected.has(n.id) ? available[n.id] : 0;
      }
    }
    const sectionNet: Record<string, number> = {};
    for (const n of nodes) {
      const section = tree.section[nodeVertex(n)];
      if (section) {
        sectionNet[section] =
          (sectionNet[section] ?? 0) + (demand[n.id] ?? 0) - (solar[n.id] ?? 0);
      }
    }
    for (const n of batteryNodes) {
      if (!tree.connected.has(n.id)) continue;
      const schedule = state.batteries[n.id] ?? {
        charge: [40, 60],
        discharge: [68, 88],
      };
      const cap = bSize(n),
        section = tree.section[n.id];
      if (step >= schedule.charge[0] && step < schedule.charge[1])
        charge[n.id] = Math.min(cap.kw, (cap.kwh - soc[n.id]) / (0.25 * 0.95));
      else if (step >= schedule.discharge[0] && step < schedule.discharge[1]) {
        const out = Math.min(
          cap.kw,
          (soc[n.id] * 0.95) / 0.25,
          Math.max(0, sectionNet[section] ?? 0),
        );
        discharge[n.id] = out;
        sectionNet[section] = (sectionNet[section] ?? 0) - out;
      }
    }
    const disabled = new Set<string>();
    const trips: string[] = [];
    const events: Diagnostic[] = [];
    const trippedFlow: Record<string, number> = {};
    let pass = flowPass(tree, base, disabled, solar, charge, discharge);
    // Every change to an injection starts a fresh leaves-to-root pass. The finite charge, solar and edge sets bound this loop.
    for (let iteration = 0; iteration < 128; iteration++) {
      let changed = false;
      for (let i = tree.order.length - 1; i >= 1 && !changed; i--) {
        const v = tree.order[i],
          eid = tree.via[v],
          edge = tree.edgeById.get(eid);
        if (!edge || disabled.has(v)) continue;
        const f = pass.flow[eid] ?? 0;
        if (abs(f) <= edge.capacity + 1e-7) continue;
        const down = descendants(tree, v);
        if (f < 0) {
          const candidates = down.filter(
            (n) => n.kind === 'solar' && (solar[n.id] ?? 0) > 0,
          );
          const total = candidates.reduce((a, n) => a + (solar[n.id] ?? 0), 0);
          if (total > 0) {
            const reduction = Math.min(total, -f - edge.capacity + 1e-6);
            for (const n of candidates)
              solar[n.id] -= reduction * (solar[n.id] / total);
            changed = true;
          }
        } else {
          let excess = f - edge.capacity + 1e-6;
          for (const n of down.filter(isBattery)) {
            const take = Math.min(charge[n.id] ?? 0, excess);
            if (take > 0) {
              charge[n.id] -= take;
              excess -= take;
              changed = true;
            }
          }
          if (!changed) {
            const affected = subtree(tree, v);
            for (const child of affected) disabled.add(child);
            trips.push(eid);
            trippedFlow[eid] = f;
            events.push({
              code: 'OVERLOAD',
              step,
              componentId: eid,
              flowKW: f,
              capacityKW: edge.capacity,
              downstreamLoadIds: down
                .filter((n) => isLoad(n) || n.kind === 'ev')
                .map((n) => n.id),
            });
            for (const battery of down.filter(isBattery)) {
              const schedule = state.batteries[battery.id];
              if (
                !schedule ||
                step < schedule.discharge[0] ||
                step >= schedule.discharge[1]
              )
                continue;
              if (soc[battery.id] < 1e-6)
                events.push({
                  code: 'BATTERY_EMPTY',
                  step,
                  componentId: battery.id,
                });
              else if ((discharge[battery.id] ?? 0) >= bSize(battery).kw - 1e-6)
                events.push({
                  code: 'BATTERY_POWER_LIMIT',
                  step,
                  componentId: battery.id,
                  flowKW: f - edge.capacity,
                  capacityKW: bSize(battery).kw,
                });
            }
            changed = true;
          }
        }
        if (changed)
          pass = flowPass(tree, base, disabled, solar, charge, discharge);
      }
      if (!changed && abs(pass.root) > 200 + 1e-7) {
        if (pass.root < 0) {
          const candidates = nodes.filter(
            (n) => n.kind === 'solar' && (solar[n.id] ?? 0) > 0,
          );
          const total = candidates.reduce((a, n) => a + (solar[n.id] ?? 0), 0);
          if (total > 0) {
            const reduction = Math.min(total, -pass.root - 200 + 1e-6);
            for (const n of candidates)
              solar[n.id] -= reduction * (solar[n.id] / total);
            changed = true;
          }
        } else {
          trippedFlow.grid = pass.root;
          events.push({
            code: 'GRID_LIMIT',
            step,
            componentId: 'grid',
            flowKW: pass.root,
            capacityKW: 200,
          });
          for (const v of tree.order.slice(1)) disabled.add(v);
          changed = true;
        }
        if (changed)
          pass = flowPass(tree, base, disabled, solar, charge, discharge);
      }
      if (!changed) break;
      if (iteration === 127) throw new Error('Power flow did not settle');
    }
    const requested = { ...pass.flow, ...trippedFlow };
    const served: Record<string, boolean> = {},
      batteryKW: Record<string, number> = {},
      socKWh: Record<string, number> = {},
      evServedKWh: Record<string, number> = {};
    let demandKW = 0,
      solarKW = 0,
      unusedSolarKW = 0,
      lossKW = 0;
    for (const n of nodes) {
      const on =
        tree.connected.has(nodeVertex(n)) && !disabled.has(nodeVertex(n));
      if (isLoad(n) || n.kind === 'ev') {
        served[n.id] = on;
        demandKW += demand[n.id] ?? 0;
        if (!on && (demand[n.id] ?? 0) > 0)
          events.push({ code: 'UNCONNECTED', step, componentId: n.id });
        if (n.kind === 'ev' && on && activeEv[n.id])
          evServedKWh[n.id] = (n.chargerKW ?? 0) * 0.25;
      }
      if (n.kind === 'solar') {
        const used = on ? (solar[n.id] ?? 0) : 0;
        solarKW += used;
        unusedSolarKW += (available[n.id] ?? 0) - used;
      }
      if (isBattery(n)) {
        const charging = on ? (charge[n.id] ?? 0) : 0,
          draining = on ? (discharge[n.id] ?? 0) : 0;
        batteryKW[n.id] = draining - charging;
        soc[n.id] = Math.max(
          0,
          Math.min(
            bSize(n).kwh,
            soc[n.id] + charging * 0.95 * 0.25 - (draining / 0.95) * 0.25,
          ),
        );
        socKWh[n.id] = soc[n.id];
      }
    }
    for (const v of Object.values(pass.loss)) lossKW += v;
    if (t >= 96) {
      for (const n of nodes.filter(isLoad)) {
        if (!served[n.id]) metrics.unservedKWh += (demand[n.id] ?? 0) * 0.25;
      }
      metrics.gridImportKWh += Math.max(0, pass.root) * 0.25;
      metrics.unusedSolarKWh += unusedSolarKW * 0.25;
      metrics.lostAsHeatKWh += lossKW * 0.25;
      for (const [eid, flow] of Object.entries(requested)) {
        const cap = tree.edgeById.get(eid)?.capacity ?? 1;
        metrics.peakLoading[eid] = Math.max(
          metrics.peakLoading[eid] ?? 0,
          abs(flow) / cap,
        );
      }
    }
    for (const n of nodes.filter((x) => x.kind === 'ev')) {
      const [windowStart, windowEnd] = n.window ?? [88, 120];
      const sessionStart = windowEnd > 96 ? windowStart : 96 + windowStart,
        sessionEnd = windowEnd > 96 ? windowEnd : 96 + windowEnd;
      if (t >= sessionStart && t < sessionEnd)
        evSession[n.id] = (evSession[n.id] ?? 0) + (evServedKWh[n.id] ?? 0);
    }
    if (t >= 96) {
      const loading: Record<string, number> = {};
      for (const [eid, flow] of Object.entries(requested))
        loading[eid] = abs(flow) / (tree.edgeById.get(eid)?.capacity ?? 1);
      const record: StepResult = {
        step,
        flow: pass.flow,
        requested,
        loading,
        lossKW,
        solarKW,
        unusedSolarKW,
        batteryKW,
        socKWh,
        demandKW,
        gridKW: pass.root,
        served,
        evServedKWh,
        trips,
        events,
      };
      result.push(record);
      if (!firstFailure && events.length) firstFailure = events[0];
    }
  }
  for (const n of nodes.filter((x) => x.kind === 'ev'))
    metrics.evShortKWh += Math.max(
      0,
      (n.needKWh ?? 0) - (evSession[n.id] ?? 0),
    );
  return { steps: result, metrics, firstFailure, placementErrors: tree.errors };
}
