import { patch } from '../ui/dom';
import { scheduleTime } from '../ui/chart';
import { describeLoad } from '../ui/load-details';

import type { Node, Line } from '../game/types';
import { movable } from '../game/commands';

import { toolsFor } from '../game/progression';

import { copy, power, energy, voltage } from '../content/copy/en';
import type { Session } from '../game/session';

import { helpers, icon, button, type GameView } from '../ui/common';

export function createInspector(session: Session, view: GameView) {
  const { time, now, lesson, mapUIVisible, name, lineName, selectedObject } =
    helpers(session);
  const { app, el } = view;
  function graph(values: number[], colour: string, height = 100) {
    const max = Math.max(1, ...values),
      pts = values
        .map(
          (v, i) =>
            `${(i / (values.length - 1)) * 600},${height - (v / max) * height}`,
        )
        .join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${colour}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  }
  function inspector() {
    const box = el('inspector'),
      thing = selectedObject(),
      view = session.previewResult ?? session.result,
      visible =
        mapUIVisible() &&
        !session.running &&
        !!thing &&
        session.tool === 'select' &&
        !session.pending;
    app.classList.toggle('inspecting', visible);
    box.hidden = !visible;
    if (!visible) return;
    const n = 'kind' in thing ? (thing as Node) : undefined,
      l = n ? undefined : (thing as Line),
      title = n ? name(n) : lineName(l!),
      battery = n?.kind === 'batteryQuick' || n?.kind === 'batteryLong';
    const cap = battery
      ? n.kind === 'batteryQuick'
        ? 10
        : 40
      : n?.kind === 'transformer'
        ? n.size === 'L'
          ? 50
          : 25
        : n?.kind === 'solar'
          ? 30
          : n?.kind === 'ev'
            ? (n.chargerKW ?? 22)
            : l
              ? l.tier === 'LV'
                ? 40
                : 200
              : 0;

    const spark = view.steps.map((s) =>
      n?.kind === 'transformer'
        ? (s.requested[`tx:${n.id}`] ?? 0)
        : battery
          ? (s.batteryKW[n!.id] ?? 0)
          : n?.kind === 'solar'
            ? s.solarKW
            : n?.kind === 'ev'
              ? (s.evServedKWh[n.id] ?? 0) * 4
              : l
                ? (s.requested[l.id] ?? 0)
                : n
                  ? (s.demand[n.id] ?? 0)
                  : 0,
    );

    const value = battery
      ? `${energy(now().socKWh[n!.id] ?? 0)} / ${energy(cap)}`
      : n?.kind === 'transformer'
        ? `${power(now().requested[`tx:${n.id}`] ?? 0)} / ${power(cap)}`
        : l
          ? `${power(now().requested[l.id] ?? 0)} / ${power(cap)}`
          : n?.kind === 'solar'
            ? power(now().solarKW)
            : n?.kind === 'ev'
              ? now().evServedKWh[n.id]
                ? copy.charge
                : copy.unpowered
              : now().served[n!.id]
                ? copy.powered
                : copy.unpowered;

    const loadDetails =
      n && ['home', 'cafe', 'workshop', 'ev'].includes(n.kind)
        ? describeLoad(
            session.previewState ?? session.state,
            view,
            n,
            session.cursor,
          )
        : undefined;
    const details = loadDetails
      ? `<dl class="load-details"><div><dt>${copy.demand}</dt><dd>${power(now().demand[n!.id] ?? 0)}</dd></div><div><dt>${copy.needsPower}</dt><dd>${loadDetails.allDay ? copy.allDay : `${scheduleTime(loadDetails.start, session.save.settings.twelve)}–${scheduleTime(loadDetails.end, session.save.settings.twelve)}`}</dd></div><div><dt>${copy.peakAt}</dt><dd>${time(loadDetails.peakStep)} · ${power(loadDetails.peakKW)}</dd></div><div><dt>${copy.connections}</dt><dd>${
          loadDetails.connections
            .map((id) => {
              const other = session.state.nodes.find((node) => node.id === id);
              return other ? name(other) : id;
            })
            .join(', ') || copy.notConnected
        }</dd></div></dl><p class="placement-detail ${loadDetails.reason === 'disconnected' || loadDetails.reason === 'trip' ? 'error' : 'ok'}">${icon(loadDetails.reason === 'disconnected' ? 'plug' : loadDetails.reason === 'trip' ? 'lightning-slash' : 'check-circle')} ${loadDetails.reason === 'disconnected' ? copy.tryLine : loadDetails.reason === 'trip' ? copy.upstreamTrip : loadDetails.reason === 'idle' ? copy.idle : copy.powered}${loadDetails.trip ? ` · ${loadDetails.trip === 'grid' ? copy.gridLimit : loadDetails.trip.startsWith('tx:') ? copy.overloadTransformer : copy.overloadLine}` : ''}</p>`
      : '';
    const description = battery
        ? copy.helpBattery
        : n?.kind === 'transformer'
          ? copy.helpTransformer
          : n?.kind === 'solar'
            ? copy.helpSolar
            : l
              ? copy.helpLine
              : undefined,
      connections = n
        ? session.state.lines.filter(
            (line) => line.a === n.id || line.b === n.id,
          )
        : [];

    patch(
      box,
      `<div class="placement-heading"><h2>${title}</h2>${button('close-inspector', copy.cancel, 'x')}</div>${description ? `<p class="placement-detail">${description}</p>` : ''}${n ? `<p class="placement-detail object-editability">${icon(movable(n) ? 'arrows-out-cardinal' : 'lock-key')} ${movable(n) ? copy.helpGrab : n.kind === 'transformer' && n.zone === 'depot' ? copy.helpDepotFixed : copy.helpFixed}</p>` : ''}${details}${!loadDetails && session.state.stage >= 3 ? `<strong>${value}</strong>` : now().served[n?.id ?? ''] === false ? `<p class="error">${copy.unpowered}</p>` : ''}<div class="actions">${n && movable(n) ? button('move', copy.move, 'arrows-out-cardinal', 'secondary small') : ''}${toolsFor(session.state, lesson()).includes('transformerL') && n?.kind === 'transformer' && n.size === 'S' && n.zone !== 'hill' && n.zone !== 'depot' ? button('upgrade', copy.upgrade, 'arrow-fat-up', 'primary small') : ''}${!thing.locked ? button('remove', copy.remove, 'trash', 'secondary small') : ''}</div>${battery && session.state.stage >= 5 ? batteryEditor(n!) : ''}${n?.kind === 'ev' && session.state.stage >= 6 ? evEditor(n) : ''}<details><summary>${copy.details}</summary>${session.state.stage >= 3 ? `<svg class="chart" viewBox="0 0 600 100" preserveAspectRatio="none" aria-label="${copy.today}">${graph(spark, 'var(--pp-accent)')}</svg><div class="inspector-stats"><span>${battery ? copy.batteryEnergy : copy.limit}</span><strong>${battery ? energy(cap) : cap ? power(cap) : copy.powered}</strong>${battery ? `<span>${copy.limit}</span><strong>${power(n!.kind === 'batteryQuick' ? 10 : 5)}</strong>` : ''}<span>${copy.lostHeat}</span><strong>${energy(view.metrics.lostAsHeatKWh)}</strong></div>` : ''}${n?.kind === 'transformer' && session.state.stage >= 2 ? `<p>${voltage('LV', session.save.settings.region)}</p>` : ''}${n ? `<h3>${copy.connections}</h3><div class="actions">${connections.map((line) => `<button class="secondary small" data-select-line="${line.id}">${lineName(line)}</button>`).join('')}</div>` : ''}</details>`,
    );
  }
  function batteryEditor(n: Node) {
    const s = session.state.batteries[n.id] ?? {
      charge: [40, 60],
      discharge: [68, 88],
    };
    const choose = (slot: string, value: number) =>
      `<select data-battery="${n.id}" data-slot="${slot}">${Array.from({ length: 97 }, (_, i) => `<option value="${i}" ${value === i ? 'selected' : ''}>${time(i === 96 ? 0 : i)}</option>`).join('')}</select>`;
    return `<div class="schedule-editor"><label>${copy.charge} ${copy.start}${choose('c0', s.charge[0])}</label><label>${copy.charge} ${copy.end}${choose('c1', s.charge[1])}</label><label>${copy.giveBack} ${copy.start}${choose('d0', s.discharge[0])}</label><label>${copy.giveBack} ${copy.end}${choose('d1', s.discharge[1])}</label></div>`;
  }
  function evEditor(n: Node) {
    const start = session.state.evStarts[n.id] ?? n.window![0],
      duration = Math.ceil((n.needKWh ?? 0) / ((n.chargerKW ?? 22) * 0.25)),
      last = n.window![1] - duration;
    return `<div class="schedule-editor ev-schedule"><label>${copy.start}<select data-ev="${n.id}">${Array.from(
      { length: last - n.window![0] + 1 },
      (_, i) => n.window![0] + i,
    )
      .map(
        (v) =>
          `<option value="${v}" ${v === start ? 'selected' : ''}>${time(v < 96 ? v : v - 96)}</option>`,
      )
      .join(
        '',
      )}</select></label></div><p class="muted">${energy(n.needKWh ?? 0)} · ${power(n.chargerKW ?? 0)}</p>`;
  }
  return { inspector };
}
