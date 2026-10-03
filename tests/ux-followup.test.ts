import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './ui-fixture';
import { addGrowth } from '../src/game/levels';
import { witnesses } from '../src/content/witnesses';
import { simulate } from '../src/sim/simulate';
import { daylightAt } from '../src/render/daylight';
import { cableRoute, pulseCount } from '../src/render/network-view';
import { helpers } from '../src/ui/common';

const solved = witnesses();
test('building at night holds dusk light and sky while run retains night; daytime stays unchanged', () => {
  const dusk = daylightAt(72, true);
  for (const step of [0, 76, 88, 95]) {
    const build = daylightAt(step, true),
      run = daylightAt(step);
    assert.ok(build.ambient >= dusk.ambient);
    assert.ok(build.sun >= dusk.sun);
    assert.equal(build.skyTop, dusk.skyTop);
    assert.ok(run.ambient < build.ambient);
  }
  assert.deepEqual(daylightAt(48, true), daylightAt(48));
});
test('power dots occupy less than half a span even at high load', () => {
  for (const length of [1, 5, 10, 30])
    for (const flow of [1, 25, 200])
      assert.ok(pulseCount(flow, length) * 0.09 <= length * 0.5);
});
test('held placement and movement have one nearby confirmation, including invalid placement', () => {
  const entry = addGrowth(solved[0], 2);
  const view = fixture(
    entry,
    { type: 'place', kind: 'transformer', x: 18, z: 9, size: 'S' },
    'transformerS',
  );
  assert.equal(view.el('line-confirm').hidden, false);
  assert.match(view.el('line-confirm').innerHTML, /Place<\/button>/);
  assert.doesNotMatch(view.el('placement').innerHTML, /data-action="confirm"/);
  view.click('confirm');
  const placed = view.session.state.nodes.at(-1)!;
  assert.equal(helpers(view.session).name(placed), 'Small transformer 1');
  view.controller.preview({ type: 'move', id: placed.id, x: 18, z: 10 });
  assert.match(view.el('line-confirm').innerHTML, /Move<\/button>/);
  view.controller.preview({
    type: 'place',
    kind: 'transformer',
    x: 18,
    z: 9,
    size: 'S',
  });
  assert.match(
    view.el('line-confirm').innerHTML,
    /data-action="confirm" disabled/,
  );
});
test('a consumer endpoint keeps the upstream line source and tool armed', () => {
  const state = structuredClone(solved[1]);
  const line = state.lines.find((l) => l.b === 'farm' || l.a === 'farm')!;
  state.lines = state.lines.filter((l) => l.id !== line.id);
  const source = line.a === 'farm' ? line.b : line.a;
  const view = fixture(state);
  view.controller.commit({ type: 'connect', a: source, b: 'farm', tier: 'LV' });
  assert.equal(view.session.lineStart, source);
  assert.equal(view.session.tool, 'LV');
});
test('completion shows earned, missed and other-stage stars and Replay resets only this stage', () => {
  const view = fixture(solved[0]);
  view.controller.showOverlay('complete');
  const html = view.dialog.innerHTML;
  assert.equal((html.match(/class="completion-star /g) ?? []).length, 4);
  assert.match(html, /ph-fill ph-star/);
  assert.match(html, /On other stages/);
  assert.match(html, /data-action="restart"/);
  view.session.result.metrics.buildCost = 11;
  view.controller.refreshOverlay();
  assert.match(view.dialog.innerHTML, /Try for this/);
  assert.equal((view.dialog.innerHTML.match(/ph-fill ph-star/g) ?? []).length, 1);
  view.session.save.entries[1] = addGrowth(solved[0], 1);
  view.session.save.entries[1].lines =
    view.session.save.entries[1].lines.filter((l) => l.locked);
  view.session.save.states[2] = structuredClone(solved[1]);
  const later = structuredClone(view.session.save.states[2]);
  view.click('restart');
  assert.deepEqual(view.session.state, view.session.save.entries[1]);
  assert.deepEqual(view.session.save.states[2], later);
  assert.equal(view.session.overlay, '');
});
test('nearby power warnings merge with a count and list all affected buildings', () => {
  const view = fixture(addGrowth(solved[4], 6));
  view.world.project = () => ({ x: 200, y: 200 });
  view.controller.labels();
  const html = view.el('labels').innerHTML;
  assert.equal((html.match(/class="map-badge"/g) ?? []).length, 1);
  assert.match(html, /×7/);
  assert.match(html, /Robotaxi 1/);
  assert.match(html, /Robotaxi 6/);
});
test('schedule edits retain topology revision; layout edits and stage entry advance it', () => {
  const view = fixture(solved[5]);
  const initial = view.session.revision;
  const next = structuredClone(view.session.state);
  next.evStarts.cab1++;
  view.controller.setState(next);
  assert.equal(view.session.revision, initial);
  const moved = structuredClone(next);
  moved.nodes[0].x++;
  view.controller.setState(moved);
  assert.equal(view.session.revision, initial + 1);
  view.controller.enterStage(1);
  assert.equal(view.session.revision, initial + 2);
});
test('dense transformer circuits use street supports without changing the saved network or simulation', () => {
  const state = solved[5],
    before = JSON.stringify(state),
    result = JSON.stringify(simulate(state));
  const circuits = state.lines.filter(
    (l) => l.tier === 'LV' && (l.a === 'th' || l.b === 'th'),
  );
  assert.ok(circuits.length >= 6);
  for (const line of circuits) {
    const route = cableRoute(state, line);
    assert.ok(route.length >= 3);
    for (let i = 1; i < route.length; i++)
      assert.ok(
        Math.hypot(
          route[i].x - route[i - 1].x,
          route[i].y - route[i - 1].y,
          route[i].z - route[i - 1].z,
        ) > 0,
      );
  }
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(simulate(state)), result);
});
