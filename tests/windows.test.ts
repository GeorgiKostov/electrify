import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, type Command } from '../src/game/commands';
import { initialState, addGrowth } from '../src/game/levels';
import type { Tool } from '../src/game/session';
import type { State } from '../src/game/types';
import { fixture } from './ui-fixture';

const validLine = { type: 'connect', a: 'tv', b: 'h1', tier: 'LV' } as const;
test('Tasks → Resources → Escape restores a held line and its simulated scene without spending or fitting', () => {
  const view = fixture(initialState(), validLine);
  assert.equal(view.shown.ghost?.valid, true);
  assert.equal(view.el('placement').hidden, false);
  const pendingState = view.globals.previewState,
    pendingResult = view.globals.previewResult;
  for (const action of ['tasks', 'resources']) {
    view.click(action);
    view.suppressed();
    view.kept();
    assert.equal(view.el('menu').dataset.panel, action);
    assert.equal(view.classes.has('window-open'), true);
    assert.equal(view.classes.has('placing'), true);
    assert.equal(view.globals.previewState, pendingState);
    assert.equal(view.globals.previewResult, pendingResult);
  }
  assert.match(view.el('menu').innerHTML, /Coins left/);
  assert.match(view.el('menu').innerHTML, /Budget/);
  assert.doesNotMatch(view.el('menu').innerHTML, /Remove · Undo/);
  view.escape();
  view.kept();
  assert.equal(view.classes.has('window-open'), false);
  assert.equal(view.shown.state, pendingState);
  assert.equal(view.shown.result, pendingResult);
  assert.equal(view.el('placement').hidden, false);
  assert.equal(view.shown.grid, true);
  assert.equal(view.shown.tier, 'LV');
  assert.equal(view.shown.ghost?.valid, true);
  assert.match(view.focus.at(-1)!, /resources/);
});

test('an invalid held line stays invalid after closing Resources; no hover leaks into the window', () => {
  const command = { ...validLine, b: 'tv' },
    view = fixture(initialState(), command);
  assert.ok(view.globals.pendingError);
  assert.equal(view.shown.ghost?.valid, false);
  view.click('resources');
  view.suppressed();
  view.controller.hover({ clientX: 500, clientY: 300 });
  assert.equal(view.shown.picks, 0);
  view.click('close-panel');
  view.kept();
  assert.equal(view.shown.ghost?.valid, false);
  assert.equal(view.globals.previewState, undefined);
  assert.match(view.el('placement').innerHTML, /Choose two objects/);
});

test('held object placement and move restore their ghost after popover close', () => {
  const stage = addGrowth(initialState(), 2),
    placed = apply(stage, {
      type: 'place',
      kind: 'transformer',
      size: 'S',
      x: 18,
      z: 9,
    });
  assert.equal(placed.error, undefined);
  const cases: [State, Command, Tool, string | undefined][] = [
    [
      stage,
      { type: 'place', kind: 'transformer', size: 'S', x: 18, z: 9 },
      'transformerS',
      undefined,
    ],
    [
      placed.state,
      { type: 'move', id: placed.state.nodes.at(-1)!.id, x: 18, z: 8 },
      'move',
      placed.state.nodes.at(-1)!.id,
    ],
  ];
  for (const [state, command, tool, selected] of cases) {
    const view = fixture(state, command, tool, selected);
    assert.equal(view.shown.ghost?.kind, 'transformer');
    view.click('tasks');
    view.suppressed();
    view.click('tasks');
    view.kept();
    assert.equal(view.el('placement').hidden, false);
    assert.equal(view.shown.ghost?.kind, 'transformer');
    assert.equal(view.shown.ghost?.valid, true);
  }
});

test('selected inspection and labels return after Tasks without losing the selection', () => {
  const view = fixture(initialState(), undefined, 'select', 'tv');
  assert.equal(view.el('inspector').hidden, false);
  assert.ok(view.el('labels').innerHTML);
  view.click('tasks');
  view.suppressed();
  view.escape();
  view.kept();
  assert.equal(view.el('inspector').hidden, false);
  assert.equal(view.shown.selected, 'tv');
  assert.ok(view.el('labels').innerHTML);
  assert.equal(view.el('coach').hidden, false);
});

test('full dialogs retain preview-cancel semantics and return the existing tool and selection', () => {
  const view = fixture(initialState(), validLine, 'LV', 'tv');
  view.click('menu');
  view.suppressed();
  assert.equal(view.globals.pending, undefined);
  assert.equal(view.globals.previewState, undefined);
  assert.equal(view.globals.tool, 'LV');
  assert.equal(view.globals.selected, 'tv');
  view.click('continue');
  assert.equal(view.shown.fit, 0);
  assert.equal(view.globals.state, view.shown.state);
  assert.equal(view.shown.ghost, undefined);
  assert.equal(view.shown.tier, 'LV');
});

test('Hide interface suppresses context and restores a held preview on Show interface', () => {
  const view = fixture(initialState(), validLine);
  view.click('hide');
  view.suppressed();
  view.kept();
  assert.equal(view.classes.has('hidden-ui'), true);
  view.click('hide');
  view.kept();
  assert.equal(view.el('placement').hidden, false);
  assert.equal(view.shown.ghost?.valid, true);
  assert.equal(view.classes.has('hidden-ui'), false);
});

test('Run after a window shows day controls while hiding construction and clearing its preview', () => {
  const applied = apply(initialState(), validLine);
  assert.equal(applied.error, undefined);
  const view = fixture(applied.state, undefined, 'LV');
  view.click('tasks');
  view.click('close-panel');
  view.click('run');
  assert.equal(view.globals.running, true);
  assert.equal(view.classes.has('placing'), false);
  assert.equal(view.el('placement').hidden, true);
  assert.equal(view.el('inspector').hidden, true);
  assert.equal(view.el('coach').hidden, true);
  assert.equal(view.shown.grid, false);
  assert.equal(view.shown.tier, undefined);
  assert.match(view.el('timeline').innerHTML, /Pause/);
  assert.equal(view.shown.fit, 0);
});

test('short landscape reserves the right tray horizontally and lower-left camera vertically', () => {
  const view = fixture();
  view.globals.innerWidth = 844;
  view.globals.innerHeight = 390;
  view.refresh();
  assert.deepEqual(
    { ...view.shown.frame },
    { left: 12, top: 162, width: 414, height: 160 },
  );
  assert.equal(view.shown.fit, 0);
});

test('expanded timeline owns teaching visibility and More tools starts from the first tile', () => {
  const stage = addGrowth(addGrowth(initialState(), 2), 3),
    view = fixture(stage, undefined, 'select');
  view.click('expand');
  assert.equal(view.classes.has('timeline-expanded'), true);
  view.click('expand');
  assert.equal(view.classes.has('timeline-expanded'), false);
  view.el('tray').scrollLeft = 180;
  view.click('more-tools');
  assert.equal(view.el('tray').scrollLeft, 0);
});

test('Menu → Hide interface routes line endpoints and placement taps to navigation without preview or Enter edits', () => {
  for (const [state, tool] of [
    [initialState(), 'LV'],
    [addGrowth(initialState(), 2), 'transformerS'],
  ] as const) {
    const view = fixture(state, undefined, tool);
    view.click('menu');
    view.click('hide');
    for (const x of [500, 600]) {
      view.pointer('pointerdown', 1, x);
      view.pointer('pointerup', 1, x);
    }
    view.key('Enter');
    view.suppressed();
    view.kept();
    assert.equal(view.globals.pending, undefined);
    assert.equal(view.globals.lineStart, undefined);
    assert.equal(view.shown.picks, 0);
    assert.equal(view.shown.edits, 0);
    view.click('hide');
    view.kept();
    assert.equal(view.el('placement').hidden, false);
    assert.doesNotMatch(
      view.el('placement').innerHTML,
      /data-action="confirm"/,
    );
  }
});

test('hidden held placement blocks confirmation, undo, arrow edits and direct preview/ghost while preserving navigation', () => {
  const state = addGrowth(initialState(), 2),
    command = {
      type: 'place',
      kind: 'transformer',
      size: 'S',
      x: 18,
      z: 9,
    } as const,
    view = fixture(state, command, 'transformerS');
  const pendingState = view.globals.previewState,
    pendingResult = view.globals.previewResult;
  view.globals.undo = [initialState()];
  view.click('hide');
  view.key('Enter');
  view.key('KeyZ', { key: 'z', ctrlKey: true });
  view.key('ArrowRight');
  view.key('BracketRight');
  view.key('Space');
  view.keyup('Space');
  view.controller.preview({
    type: 'place',
    kind: 'transformer',
    size: 'S',
    x: 18,
    z: 8,
  });
  view.controller.commandGhost(
    view.session.pending!,
    view.session.pendingError,
  );
  view.controller.commit(view.session.pending!);
  view.pointer('pointerdown', 1, 500);
  view.pointer('pointermove', 1, 530);
  view.pointer('pointerup', 1, 530);
  view.wheel();
  view.key('Equal');
  view.suppressed();
  view.kept();
  assert.equal(view.globals.previewState, pendingState);
  assert.equal(view.globals.previewResult, pendingResult);
  assert.equal((view.globals.undo as State[]).length, 1);
  assert.equal(view.shown.edits, 0);
  assert.equal(view.globals.running, false);
  assert.equal(view.globals.cursor, 72);
  assert.equal(view.shown.picks, 0);
  assert.equal(view.shown.pans, 2);
  assert.equal(view.shown.zooms, 2);
  view.click('hide');
  view.kept();
  assert.equal(view.shown.state, pendingState);
  assert.equal(view.shown.ghost?.valid, true);
  assert.equal(view.el('placement').hidden, false);
});

test('hidden pinch, cancellation and Escape retain the held line and restore its source/ghost', () => {
  const view = fixture(initialState(), validLine);
  view.click('hide');
  view.pointer('pointerdown', 1, 500);
  view.pointer('pointerdown', 2, 600);
  view.pointer('pointermove', 2, 630);
  view.pointer('pointerup', 2, 630);
  view.pointer('pointerup', 1, 500);
  view.pointer('pointerdown', 3, 500);
  view.pointer('pointercancel', 3, 500);
  view.suppressed();
  view.kept();
  assert.equal(view.globals.lineStart, 'tv');
  assert.equal(view.shown.zooms, 1);
  assert.equal(view.shown.edits, 0);
  view.key('Escape');
  view.kept();
  assert.equal(view.globals.hidden, false);
  assert.equal(view.globals.lineStart, 'tv');
  assert.equal(view.shown.ghost?.valid, true);
  assert.equal(view.el('placement').hidden, false);
});
