import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCost } from '../src/game/commands';
import { initialState } from '../src/game/levels';
import { fixture as productionFixture } from './ui-fixture';

function fixture() {
  const committed = initialState(),
    command = { type: 'connect', a: 'tv', b: 'h1', tier: 'LV' } as const,
    view = productionFixture(committed, command);
  const result = view.session.result;
  let previewCalls = 0,
    pending = view.session.pending;
  Object.defineProperty(view.session, 'pending', {
    get: () => pending,
    set: (value) => {
      pending = value;
      if (value) previewCalls++;
    },
    configurable: true,
  });
  function restored() {
    assert.equal(view.session.pending, undefined);
    assert.equal(view.session.previewState, undefined);
    assert.equal(view.session.previewResult, undefined);
    assert.equal(view.session.lineStart, undefined);
    assert.equal(view.shown.state, committed);
    assert.equal(view.shown.result, result);
    assert.equal(view.shown.timeline, result);
    assert.equal(view.shown.inspector, result);
    assert.equal(view.el('line-confirm').hidden, true);
    assert.doesNotMatch(
      view.el('placement').innerHTML,
      /data-action="confirm"/,
    );
    assert.match(view.el('coins').innerHTML, /15 \/ 15/);
    assert.equal(view.session.state, committed);
    assert.equal(previewCalls, 0);
    assert.equal(buildCost(committed), 0);
  }
  assert.match(view.el('coins').innerHTML, /12 \/ 15/);
  assert.equal(view.shown.state.lines.length, 2);
  return {
    down: (id: number) => view.pointer('pointerdown', id, 500 + id * 50),
    up: (id: number) => view.pointer('pointerup', id, 500 + id * 50),
    restored,
    ui: view.ui,
  };
}
test('held valid connection then second touch restores committed scene and every preview view; releases do nothing', () => {
  const view = fixture();
  view.down(1);
  view.down(2);
  view.restored();
  view.up(2);
  view.up(1);
  view.restored();
});
test('UI pointer cancellation restores the committed scene and budget; the captured release does nothing', () => {
  const view = fixture();
  view.down(1);
  view.ui();
  view.restored();
  view.up(1);
  view.restored();
});
