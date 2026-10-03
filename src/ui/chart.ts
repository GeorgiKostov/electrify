import type { DayResult, State, Node } from '../game/types';
import { copy, clock, power } from '../content/copy/en';
export function scheduleTime(step: number, twelve = false) {
  return clock(step % 96, twelve) + (step >= 96 ? ' · ' + copy.nextDay : '');
}
export function laneRange(state: State, node: Node) {
  if (node.kind === 'ev')
    return {
      min: node.window![0],
      max:
        node.window![1] -
        Math.ceil((node.needKWh ?? 0) / ((node.chargerKW ?? 22) * 0.25)),
    };
  const schedule = state.batteries[node.id] ?? { discharge: [68, 88] },
    duration = schedule.discharge[1] - schedule.discharge[0];
  return { min: 0, max: 96 - duration };
}
export function chartScale(result: DayResult) {
  return (
    Math.ceil(
      Math.max(
        200,
        ...result.steps.flatMap((s) => [s.demandKW, s.gridKW, s.solarKW]),
      ) / 50,
    ) * 50
  );
}
export function chartPoints(values: number[], max: number) {
  return values
    .map((v, i) => `${60 + (i / 96) * 300},${160 - (v / max) * 132}`)
    .join(' ');
}
export function timelineChart(
  result: DayResult,
  cursor: number,
  twelve = false,
  solar = false,
) {
  const max = chartScale(result),
    series = [
      {
        label: copy.demand,
        colour: 'var(--pp-ink-strong)',
        values: result.steps.map((s) => s.demandKW),
      },
      {
        label: copy.gridImport,
        colour: 'var(--pp-grid)',
        values: result.steps.map((s) => Math.max(0, s.gridKW)),
      },
      ...(solar
        ? [
            {
              label: copy.solarMaking,
              colour: 'var(--pp-solar)',
              values: result.steps.map((s) => s.solarKW),
            },
          ]
        : []),
    ];
  return `<div class="chart-legend">${series.map((s) => `<span style="--series:${s.colour}">${s.label}</span>`).join('')}<span class="legend-limit">${copy.gridConnectionLimit} · ${power(200)}</span></div><svg class="chart timeline-chart" viewBox="0 0 380 200" role="img" aria-label="${copy.today} · ${copy.demand} · ${copy.gridImport} · ${copy.gridConnectionLimit}">${[0, max / 2, max].map((v) => `<line class="chart-grid" x1="60" y1="${160 - (v / max) * 132}" x2="360" y2="${160 - (v / max) * 132}"/><text class="axis-label" x="54" y="${164 - (v / max) * 132}" text-anchor="end">${v.toFixed(0)} kW</text>`).join('')}${[0, 24, 48, 72, 96].map((t) => `<text class="axis-label" x="${60 + (t / 96) * 300}" y="190" text-anchor="middle">${t === 96 ? clock(0, twelve) : clock(t, twelve)}</text>`).join('')}<line class="chart-limit" x1="60" x2="360" y1="${160 - (200 / max) * 132}" y2="${160 - (200 / max) * 132}"/>${series.map((s) => `<polyline points="${chartPoints(s.values, max)}" fill="none" stroke="${s.colour}" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')}<line id="chart-now" class="chart-now" x1="${60 + (cursor / 96) * 300}" x2="${60 + (cursor / 96) * 300}" y1="20" y2="168"/><text id="chart-now-label" class="axis-label now-label" x="${60 + (cursor / 96) * 300}" y="15" text-anchor="middle">${copy.now}</text></svg>`;
}
export function chartCursor(host: HTMLElement, cursor: number) {
  const x = String(60 + (cursor / 96) * 300),
    line = host.querySelector('#chart-now');
  line?.setAttribute('x1', x);
  line?.setAttribute('x2', x);
  host.querySelector('#chart-now-label')?.setAttribute('x', x);
}
