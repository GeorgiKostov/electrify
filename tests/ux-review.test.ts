import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fixture } from './ui-fixture';
import { initialState, addGrowth } from '../src/game/levels';
import { buildCost } from '../src/game/commands';
import { witnesses } from '../src/content/witnesses';
import { simulate } from '../src/sim/simulate';
import { loadSave, storeSave } from '../src/game/save';
import { describeLoad } from '../src/ui/load-details';
import {
  chartScale,
  chartPoints,
  laneRange,
  scheduleTime,
  timelineChart,
} from '../src/ui/chart';
import { daylightAt } from '../src/render/daylight';
import {
  cableEndpoints,
  pulsePhase,
  pulseCount,
} from '../src/render/network-view';
import { World } from '../src/render/scene';
import { patch } from '../src/ui/dom';

const solved = witnesses();
test('touch wiring requires local confirmation, chains while armed, and retains cumulative LV reach', () => {
  const view = fixture();
  const tap = (x: number) => {
    view.pointer('pointerdown', 1, x);
    view.pointer('pointerup', 1, x);
  };
  tap(500);
  tap(600);
  assert.deepEqual(view.session.pending, {
    type: 'connect',
    a: 'tv',
    b: 'h1',
    tier: 'LV',
  });
  assert.equal(buildCost(view.session.state), 0);
  assert.equal(view.el('line-confirm').hidden, false);
  view.click('confirm');
  assert.equal(view.session.tool, 'LV');
  assert.equal(view.session.lineStart, 'h1');
  assert.equal(buildCost(view.session.state), 3);
  tap(700);
  view.click('confirm');
  assert.equal(view.session.lineStart, 'h2');
  assert.equal(buildCost(view.session.state), 5);
  tap(800);
  assert.match(view.session.pendingError, /Too far/);
  assert.match(
    view.el('line-confirm').innerHTML,
    /data-action="confirm" disabled/,
  );
  view.click('confirm');
  assert.equal(buildCost(view.session.state), 5);
  assert.equal(view.session.lineStart, 'h2');
  view.click('line-source');
  assert.equal(view.session.lineStart, undefined);
  assert.equal(view.session.tool, 'LV');
  assert.equal(view.session.pending, undefined);
});
test('stationary secondary click cancels, secondary drag pans and UI interception cannot commit', () => {
  const held = { type: 'connect', a: 'tv', b: 'h1', tier: 'LV' } as const;
  const view = fixture(initialState(), held);
  view.pointer('pointerdown', 1, 500, 300, { button: 2 });
  view.pointer('pointermove', 1, 530, 300, { button: 2 });
  view.pointer('pointerup', 1, 530, 300, { button: 2 });
  assert.equal(view.shown.pans, 1);
  assert.equal(view.session.tool, 'LV');
  assert.equal(buildCost(view.session.state), 0);
  view.pointer('pointerdown', 2, 500, 300, { button: 2 });
  view.pointer('pointerup', 2, 500, 300, { button: 2 });
  assert.equal(view.session.tool, 'select');
  assert.equal(view.session.pending, undefined);
  assert.equal(view.session.lineStart, undefined);
  const touch = fixture(initialState(), held);
  touch.pointer('pointerdown', 1, 600);
  touch.ui();
  touch.pointer('pointerup', 1, 600);
  assert.equal(touch.session.pending, undefined);
  assert.equal(buildCost(touch.session.state), 0);
  assert.equal(touch.el('line-confirm').hidden, true);
});
test('all unpowered buildings keep badges while the current target text is suppressed', () => {
  const view = fixture();
  assert.equal(
    (view.el('labels').innerHTML.match(/class="map-badge"/g) ?? []).length,
    3,
  );
  view.session.hoveredNode = 'h1';
  view.controller.labels();
  assert.equal(
    (view.el('labels').innerHTML.match(/class="map-badge"/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(
    view.el('labels').innerHTML,
    />Home 1 · No power<\/span>/,
  );
});
test('failure playback pauses at the actual 18:30 trip without changing the layout', () => {
  const entry = addGrowth(solved[1], 3),
    view = fixture(entry, undefined, 'select'),
    failure = view.session.result.firstFailure!;
  assert.equal(failure.step, 74);
  view.controller.startRun();
  view.session.runLast = 1000;
  for (let frame = 1; frame <= 500 && view.session.running; frame++)
    view.controller.runFrame(1000 + frame * 500);
  assert.equal(view.session.running, false);
  assert.equal(view.session.cursor, 74);
  assert.equal(view.session.overlay, 'diagnosis');
  assert.equal(view.session.state, entry);
  assert.equal(view.session.runFraction, 0);
});
test('demand and inspector reasons use simulator samples and distinguish missing line from upstream trip', () => {
  const empty = initialState(),
    r = simulate(empty),
    home = empty.nodes.find((n) => n.id === 'h1')!;
  for (const step of r.steps)
    assert.ok(
      Math.abs(
        Object.values(step.demand).reduce((a, b) => a + b, 0) - step.demandKW,
      ) < 1e-9,
    );
  assert.equal(describeLoad(empty, r, home, 72).reason, 'disconnected');
  const entry = addGrowth(solved[1], 3),
    day = simulate(entry),
    connected = entry.nodes.find((n) => n.id === 'h1')!;
  assert.equal(describeLoad(entry, day, connected, 48).reason, 'powered');
  assert.equal(describeLoad(entry, day, connected, 74).reason, 'trip');
  assert.equal(describeLoad(entry, day, connected, 74).trip, 'tx:tv');
  assert.ok(describeLoad(entry, day, connected, 74).peakKW > 0);
});
test('overnight EV timing remains 22:00–00:00 next day, and slider starts survive save/reload', () => {
  const state = solved[5],
    cab = state.nodes.find((n) => n.id === 'cab1')!,
    info = describeLoad(state, simulate(state), cab, 88);
  assert.equal(info.start, 88);
  assert.equal(info.end, 96);
  assert.equal(info.allDay, false);
  assert.match(scheduleTime(info.end), /00:00.*next day/i);
  assert.deepEqual(laneRange(state, cab), { min: 88, max: 112 });
  const view = fixture(state, undefined, 'select');
  assert.equal(storeSave(view.session.save), true);
  const loaded = loadSave();
  assert.deepEqual(loaded.state.evStarts, state.evStarts);
  assert.equal(loaded.state.evStarts.cab3, 96);
  assert.equal(loaded.state.evStarts.cab5, 104);
  const long = state.nodes.find((n) => n.kind === 'batteryLong')!;
  const range = laneRange(state, long),
    duration =
      state.batteries[long.id].discharge[1] -
      state.batteries[long.id].discharge[0];
  assert.equal(range.max + duration, 96);
});
test('timeline series share one kW scale and label the actual grid threshold', () => {
  const day = simulate(solved[5]),
    scale = chartScale(day);
  assert.ok(scale >= 200);
  assert.equal(chartPoints([100], 200), '60,94');
  assert.equal(chartPoints([50], 200), '60,127');
  const chart = timelineChart(day, 48, false, true);
  assert.match(chart, /Grid import/);
  assert.match(chart, /Grid connection limit.*200 kW/);
  assert.match(chart, /id="chart-now"[^>]*x1="210"/);
  assert.match(chart, /00:00/);
  assert.match(chart, /12:00/);
});
test('daylight interpolates visual fractions and is periodic without touching simulation', () => {
  const noon = daylightAt(48),
    dusk = daylightAt(72),
    night = daylightAt(88);
  assert.ok(noon.sun > dusk.sun && dusk.sun > night.sun);
  assert.equal(noon.night, 0);
  assert.equal(night.night, 1);
  assert.deepEqual(daylightAt(0), daylightAt(96));
  assert.notEqual(daylightAt(25).sun, daylightAt(25.5).sun);
});
test('visual cable attachments are distinct and deterministic under ordering without changing saves or results', () => {
  const state = solved[0],
    before = JSON.stringify(state),
    result = JSON.stringify(simulate(state)),
    lines = state.lines.filter((l) => l.a === 'tv' && l.tier === 'LV');
  const points = lines.map((l) => cableEndpoints(state, l)[0]);
  assert.equal(new Set(points.map((p) => JSON.stringify(p))).size, 3);
  const reversed = structuredClone(state);
  reversed.lines.reverse();
  reversed.nodes.reverse();
  for (const line of lines)
    assert.deepEqual(
      cableEndpoints(state, line),
      cableEndpoints(reversed, line),
    );
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(simulate(state)), result);
});
test('pulse speed stays constant across line length and flow density, signed direction and reduced motion', () => {
  for (const length of [5, 10])
    for (const flow of [2, 30]) {
      const count = pulseCount(flow, length),
        before = pulsePhase(0.1, length, 0, count, 1),
        after = pulsePhase(0.2, length, 0, count, 1);
      assert.ok(Math.abs((after - before) * length - 0.25) < 1e-9);
      assert.equal(pulsePhase(0.2, length, 0, count, -1), 1 - after);
      assert.equal(
        pulsePhase(0.1, length, 0, count, 1, true),
        pulsePhase(8, length, 0, count, 1, true),
      );
    }
  assert.equal(pulseCount(0, 10), 0);
});
function worldFixture() {
  // Use real Three geometry and the production draw/update methods, without a WebGL context.
  return Object.assign(Object.create(World.prototype), {
    canvas: { style: {} },
    hemisphere: new THREE.HemisphereLight(),
    sun: new THREE.DirectionalLight(),
    group: new THREE.Group(),
    pulses: new THREE.Group(),
    grid: new THREE.Group(),
    nodeViews: new Map(),
    lineViews: new Map(),
    topologyKey: '',
    gridStage: 0,
    pulseRuns: [],
    lightingKey: '',
  }) as World;
}
test('step, selection, schedule and grid visibility updates retain meshes; layout edits rebuild them', () => {
  const state = solved[4],
    day = simulate(state),
    world = worldFixture();
  world.draw(state, day, 48, undefined, 48, 0);
  world.showGrid(true);
  const group = world.nodeViews.get('h1')!.group,
    cable = world.lineViews.get(state.lines[0].id)!.meshes[0],
    grid = world.grid.children[0],
    pulse = world.pulseMesh,
    battery = state.nodes.find((n) => n.kind === 'batteryLong')!,
    energy = world.nodeViews.get(battery.id)!.group.getObjectByName('energy0')!;
  world.draw(state, day, 76, 'h1', 76.5, 0);
  assert.equal(world.nodeViews.get('h1')!.group, group);
  assert.equal(world.lineViews.get(state.lines[0].id)!.meshes[0], cable);
  assert.equal(world.pulseMesh, pulse);
  assert.equal(world.nodeViews.get('h1')!.ring.visible, true);
  assert.equal(
    world.nodeViews.get(battery.id)!.group.getObjectByName('energy0'),
    energy,
  );
  world.showGrid(false);
  world.showGrid(true);
  assert.equal(world.grid.children[0], grid);
  const schedule = structuredClone(state);
  schedule.batteries[battery.id].discharge = [72, 88];
  world.draw(schedule, simulate(schedule), 80, undefined, 80, 0);
  assert.equal(world.nodeViews.get('h1')!.group, group);
  const moved = structuredClone(schedule);
  moved.nodes.find((n) => n.id === battery.id)!.x++;
  world.draw(moved, simulate(moved), 80, undefined, 80, 1);
  assert.notEqual(world.nodeViews.get('h1')!.group, group);
  world.clear(world.group);
  world.clear(world.pulses);
  world.clear(world.grid);
});
test('section patch skips unchanged DOM and preserves scroll, details, text selection and select focus', () => {
  let writes = 0,
    html = '',
    focused: any = {
      id: 'region',
      dataset: {},
      tagName: 'SELECT',
      focus: () => {
        focused.reached = true;
      },
    },
    details = [{ open: true }];
  const host = {
    scrollTop: 45,
    scrollLeft: 12,
    contains: () => true,
    querySelectorAll: (selector: string) =>
      selector === 'details' ? details : [],
    querySelector: () => focused,
    get innerHTML() {
      return html;
    },
    set innerHTML(v: string) {
      writes++;
      html = v;
      details = [{ open: false }];
      focused = {
        ...focused,
        focus: () => {
          focused.reached = true;
        },
      };
    },
  } as unknown as HTMLElement;
  Object.assign(globalThis, { document: { activeElement: focused } });
  assert.equal(patch(host, 'a'), true);
  assert.equal(focused.reached, true);
  assert.equal(details[0].open, true);
  assert.equal(host.scrollTop, 45);
  assert.equal(host.scrollLeft, 12);
  assert.equal(patch(host, 'a'), false);
  assert.equal(writes, 1);
  let selection: number[] = [];
  focused = {
    id: 'name',
    dataset: {},
    selectionStart: 2,
    selectionEnd: 4,
    focus: () => {},
    setSelectionRange: (a: number, b: number) => {
      selection = [a, b];
    },
  };
  (document as any).activeElement = focused;
  patch(host, 'b');
  assert.deepEqual(selection, [2, 4]);
});
test('cover rendering restores the active camera, selection, electrical cursor and fractional visual time', () => {
  const view = fixture(solved[3], undefined, 'select'),
    world = worldFixture();
  Object.assign(world, {
    camera: new THREE.OrthographicCamera(-16, 16, 10, -10, 0.1, 200),
    renderer: { render: () => {}, setSize: () => {} },
    canvas: {
      style: {},
      width: 1280,
      height: 720,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
      }),
    },
    panX: 2,
    panZ: 3,
    zoom: 1.4,
    baseSpan: 27,
    frameRect: { left: 36, top: 162, width: 900, height: 430 },
  });
  const image = {
    width: 0,
    height: 0,
    toDataURL: () => 'data:image/png;mock',
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      drawImage: () => {},
    }),
  };
  (document as any).createElement = () => image;
  world.camera.zoom = 1.4;
  world.resize();
  world.draw(solved[3], view.session.result, 48, 'h1', 48.5);
  const before = {
    panX: world.panX,
    panZ: world.panZ,
    zoom: world.camera.zoom,
    span: world.baseSpan,
    frame: world.frameRect,
    position: world.camera.position.clone(),
  };
  assert.equal(
    world.cover(solved[2], simulate(solved[2]), 74),
    'data:image/png;mock',
  );
  assert.equal(world.panX, before.panX);
  assert.equal(world.panZ, before.panZ);
  assert.equal(world.camera.zoom, before.zoom);
  assert.equal(world.baseSpan, before.span);
  assert.deepEqual(world.frameRect, before.frame);
  assert.deepEqual(world.camera.position, before.position);
  assert.equal(world.state, solved[3]);
  assert.equal(world.step, 48);
  assert.equal(world.visualStep, 48.5);
  assert.equal(world.selected, 'h1');
  world.clear(world.group);
  world.clear(world.pulses);
});

test('editing a lower timeline lane preserves its internal scroll and keyboard focus', () => {
  const view = fixture(solved[5], undefined, 'select');
  view.session.expanded = true;
  view.refresh();
  const host = view.el('timeline') as unknown as HTMLElement;
  const before = host.innerHTML;
  let html = before,
    focused = false;
  let detail = {
    dataset: { scrollKey: 'timeline-detail' },
    scrollTop: 900,
    scrollLeft: 0,
  };
  const lane = {
    dataset: { lane: 'cab5' },
    value: '105',
    selectionStart: null,
    selectionEnd: null,
    focus: () => {
      focused = true;
    },
  };
  // Model what a DOM replacement does: it creates a fresh overflow element at scroll zero.
  Object.defineProperty(host, 'innerHTML', {
    get: () => html,
    set: (value) => {
      html = value;
      detail = {
        dataset: { scrollKey: 'timeline-detail' },
        scrollTop: 0,
        scrollLeft: 0,
      };
    },
  });
  host.querySelectorAll = ((selector: string) =>
    selector === '[data-scroll-key]'
      ? [detail]
      : []) as unknown as typeof host.querySelectorAll;
  host.contains = () => true;
  const query = host.querySelector.bind(host);
  host.querySelector = ((selector: string) =>
    selector === '[data-lane="cab5"]'
      ? lane
      : query(selector)) as typeof host.querySelector;
  Object.assign(document, { activeElement: lane });
  view.change(lane);
  assert.equal(view.session.state.evStarts.cab5, 105);
  assert.notEqual(host.innerHTML, before);
  assert.match(host.innerHTML, /value="105" data-lane="cab5"/);
  assert.equal(detail.scrollTop, 900);
  assert.equal(focused, true);
  assert.equal(view.shown.fit, 0);
});
