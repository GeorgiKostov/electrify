import type { State, Line, Node } from '../game/types';
function attachment(state: State, line: Line, node: Node, other: Node) {
  const incident = state.lines
    .filter((l) => l.tier === line.tier && (l.a === node.id || l.b === node.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const index = incident.findIndex((l) => l.id === line.id),
    spread = Math.max(
      -0.45,
      Math.min(0.45, (index - (incident.length - 1) / 2) * 0.09),
    );
  const dx = other.x - node.x,
    dz = other.z - node.z,
    length = Math.hypot(dx, dz) || 1,
    radius = node.kind === 'transformer' ? 0.5 : 0.12;
  return {
    x: node.x + (dx / length) * radius - (dz / length) * spread,
    y:
      node.kind === 'transformer'
        ? (line.tier === 'MV' ? 2.25 : 1.25) + (index % 3) * 0.07
        : 1.35,
    z: node.z + (dz / length) * radius + (dx / length) * spread,
  };
}
export function cableEndpoints(state: State, line: Line) {
  const a = state.nodes.find((n) => n.id === line.a)!,
    b = state.nodes.find((n) => n.id === line.b)!;
  return [
    attachment(state, line, a, b),
    attachment(state, line, b, a),
  ] as const;
}
export function pulseCount(flow: number, length: number) {
  return flow === 0
    ? 0
    : Math.max(1, Math.floor(length * Math.min(0.8, Math.abs(flow) / 20)));
}
export function pulsePhase(
  seconds: number,
  length: number,
  index: number,
  count: number,
  sign: number,
  reduced = false,
) {
  const phase = reduced
    ? (index + 0.5) / count
    : ((seconds * 2.5) / Math.max(0.01, length) + index / count) % 1;
  return sign >= 0 ? phase : 1 - phase;
}

export function cableRoute(state: State, line: Line) {
  const endpoints = cableEndpoints(state, line);
  const source = state.nodes.find(
    (n) => n.kind === 'transformer' && (n.id === line.a || n.id === line.b),
  );
  if (
    line.tier !== 'LV' ||
    !source ||
    state.lines.filter(
      (l) => l.tier === 'LV' && (l.a === source.id || l.b === source.id),
    ).length < 6
  )
    return [...endpoints];
  const forward = source.id === line.a;
  const start = endpoints[forward ? 0 : 1],
    end = endpoints[forward ? 1 : 0];
  // Parallel circuits use street supports; this does not change electrical edges or reach.
  const lane = source.z + 0.7;
  const route = [
    start,
    { x: source.x, y: 1.8, z: lane },
    { x: end.x, y: 1.8, z: lane },
    end,
  ];
  const distinct = route.filter(
    (point, i) =>
      i === 0 ||
      Math.hypot(
        point.x - route[i - 1].x,
        point.y - route[i - 1].y,
        point.z - route[i - 1].z,
      ) > 0.05,
  );
  return forward ? distinct : distinct.reverse();
}
