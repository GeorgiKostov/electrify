import type { State, DayResult, Node } from '../game/types';
import { buildTree, nodeVertex } from '../sim/network';
export function describeLoad(
  state: State,
  result: DayResult,
  node: Node,
  step = 0,
) {
  const tree = buildTree(state),
    samples = result.steps.map((s) => s.demand[node.id] ?? 0),
    positive = samples.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
  const peakKW = Math.max(...samples),
    peakStep = samples.indexOf(peakKW),
    current = result.steps[step];
  let vertex = nodeVertex(node),
    trip: string | undefined;
  while (tree.parent[vertex]) {
    const edge = tree.via[vertex];
    if (current.trips.includes(edge)) trip = edge;
    vertex = tree.parent[vertex];
  }
  if (current.events.some((e) => e.code === 'GRID_LIMIT')) trip = 'grid';
  const connected = tree.connected.has(nodeVertex(node)),
    reason = !connected
      ? 'disconnected'
      : trip
        ? 'trip'
        : (samples[step] ?? 0) === 0
          ? 'idle'
          : 'powered';
  const ev = node.kind === 'ev',
    start = ev
      ? (state.evStarts[node.id] ?? node.window![0])
      : (positive[0] ?? 0),
    end = ev
      ? start + Math.ceil((node.needKWh ?? 0) / ((node.chargerKW ?? 22) * 0.25))
      : (positive.at(-1) ?? -1) + 1;
  return {
    start,
    end,
    allDay: !ev && positive.length === 96,
    peakKW,
    peakStep,
    reason,
    trip,
    connections: state.lines
      .filter((l) => l.a === node.id || l.b === node.id)
      .map((l) => (l.a === node.id ? l.b : l.a)),
  };
}
