import assert from 'node:assert/strict';
import { initialState } from '../src/game/levels';
import { newSave } from '../src/game/save';
import { createSession, holdPreview, type Tool } from '../src/game/session';
import { createController } from '../src/game/controller';
import { inferLesson } from '../src/game/progression';
import type { Command } from '../src/game/commands';
import type { State, DayResult } from '../src/game/types';
import type { GameView } from '../src/ui/common';

type Handler = (event: any) => void;
export function fixture(
  state = initialState(),
  command?: Command,
  tool: Tool = 'LV',
  selected?: string,
) {
  const canvasHandlers = new Map<string, Handler>(),
    appHandlers = new Map<string, Handler>(),
    keyHandlers = new Map<string, Handler>(),
    captures = new Set<number>(),
    classes = new Set<string>(),
    focus: string[] = [];
  const classList = {
    toggle: (name: string, on: boolean) =>
      on ? classes.add(name) : classes.delete(name),
    add: (name: string) => classes.add(name),
    remove: (name: string) => classes.delete(name),
  };
  const elements = new Map<string, ReturnType<typeof element>>();
  function element(id: string) {
    const children = new Map<string, any>();
    return {
      id,
      innerHTML: '',
      hidden: false,
      dataset: {} as Record<string, string>,
      scrollLeft: 0,
      scrollTop: 0,
      disabled: false,
      tagName: 'DIV',
      isConnected: true,
      classList,
      style: { setProperty: () => {} },
      setAttribute: () => {},
      toggleAttribute: () => {},
      focus: () => focus.push(id),
      getClientRects: () => [{}],
      contains: () => false,
      querySelectorAll: () => [],
      getBoundingClientRect: () =>
        id === 'goal'
          ? { bottom: 150, width: 300, height: 100 }
          : id === 'bottom-area'
            ? { left: 442, top: 210, width: 400, height: 100 }
            : id === 'camera-buttons'
              ? { bottom: 378, top: 334 }
              : { bottom: 0, top: 0, left: 0, width: 100, height: 40 },
      querySelector: (selector: string) => {
        if (!children.has(selector))
          children.set(selector, {
            innerHTML: '',
            textContent: '',
            style: { setProperty: () => {} },
            setAttribute: () => {},
            toggleAttribute: () => {},
            disabled: false,
            focus: () => focus.push(selector),
          });
        return children.get(selector);
      },
    };
  }
  const el = (id: string) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id)!;
  };
  const canvas = {
    ...el('world'),
    tagName: 'CANVAS',
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
    addEventListener: (name: string, handler: Handler) =>
      canvasHandlers.set(name, handler),
    closest: () => undefined,
  };
  const dialog = {
    ...el('dialog'),
    open: false,
    showModal: () => {
      dialog.open = true;
    },
    close: () => {
      dialog.open = false;
    },
    addEventListener: () => {},
  };
  const save = newSave(false);
  save.state = state;
  save.entries[state.stage] = structuredClone(state);
  save.states[state.stage] = structuredClone(state);
  save.unlocked = state.stage;
  save.lessons[state.stage] = inferLesson(state);
  save.stars[1] = ['Lights on', 'Thrifty'];
  save.coachSeen = true;
  const session = createSession(save, true);
  Object.assign(session, {
    overlay: '',
    tool,
    selected,
    lineStart: command?.type === 'connect' ? command.a : undefined,
    coachStep: 0,
    fitRequested: false,
    introStarted: true,
  });
  if (command) holdPreview(session, command);
  const result = session.result;
  const shown: {
    state: State;
    result: DayResult;
    timeline: DayResult;
    inspector: DayResult;
    selected?: string;
    grid: boolean;
    tier?: string;
    ghost?: { kind: string; valid: boolean };
    fit: number;
    picks: number;
    pans: number;
    zooms: number;
    edits: number;
    frame?: { left: number; top: number; width: number; height: number };
  } = {
    state,
    result,
    timeline: result,
    inspector: result,
    grid: false,
    fit: 0,
    picks: 0,
    pans: 0,
    zooms: 0,
    edits: 0,
  };
  let lastCommitted = state;
  const world = {
    paused: false,
    reduced: false,
    draw: (next: State, day: DayResult, _cursor: number, selected?: string) => {
      if (session.state !== lastCommitted) {
        shown.edits++;
        lastCommitted = session.state;
      }
      shown.state = next;
      shown.result = day;
      shown.selected = selected;
    },
    showGrid: (visible: boolean) => {
      shown.grid = visible;
    },
    showPorts: (_nodes: unknown, tier?: string) => {
      shown.tier = tier;
    },
    clearGhost: () => {
      shown.ghost = undefined;
    },
    highlightPort: () => {},
    showGhost: (
      _x: number,
      _z: number,
      node: { kind: string },
      valid: boolean,
    ) => {
      shown.ghost = { kind: node.kind, valid };
    },
    showLineGhost: (_a: unknown, _b: unknown, valid: boolean) => {
      shown.ghost = { kind: 'line', valid };
    },
    project: (x: number, z: number) => ({ x: x * 70, y: z * 70 }),
    pick: () => {
      shown.picks++;
      return 'tv';
    },
    pickPort: (x: number) => {
      shown.picks++;
      return x < 550 ? 'tv' : x < 650 ? 'h1' : x < 750 ? 'h2' : 'cafe';
    },
    groundPoint: () => ({ x: 18, z: 9 }),
    tile: () => ({ x: 18, z: 9 }),
    panBetween: () => {
      shown.pans++;
    },
    pan: () => {
      shown.pans++;
    },
    scale: () => {
      shown.zooms++;
    },
    wheel: () => {
      shown.zooms++;
    },
    fit: () => {
      shown.fit++;
    },
    setFrame: (frame: typeof shown.frame) => {
      shown.frame = frame;
    },
  };
  const app = {
    ...el('app'),
    addEventListener: (name: string, handler: Handler) =>
      appHandlers.set(name, handler),
    querySelector: (selector: string) => ({
      focus: () => focus.push(selector),
      getClientRects: () => [{}],
    }),
  };
  const storage = new Map<string, string>();
  Object.assign(globalThis, {
    innerWidth: 1280,
    innerHeight: 720,
    window: {
      addEventListener: (name: string, handler: Handler) =>
        keyHandlers.set(name, handler),
    },
    document: {
      activeElement: canvas,
      elementFromPoint: () => canvas,
      getElementById: el,
    },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    requestAnimationFrame: (callback: Function) => {
      if (callback.name !== 'runFrame') callback(0);
      return 1;
    },
    cancelAnimationFrame: () => {},
  });
  const controller = createController(
    session,
    { app, canvas, dialog, world, el } as unknown as GameView,
    globalThis.window,
  );
  const timeline = controller.timeline,
    inspector = controller.inspector;
  controller.timeline = () => {
    shown.timeline = session.previewResult ?? session.result;
    timeline();
  };
  controller.inspector = () => {
    shown.inspector = session.previewResult ?? session.result;
    inspector();
  };
  controller.refresh();
  const globals = session as unknown as Record<string, any>;
  for (const name of ['innerWidth', 'innerHeight'])
    Object.defineProperty(globals, name, {
      get: () => Reflect.get(globalThis, name),
      set: (value) => Reflect.set(globalThis, name, value),
    });
  const click = (action: string) =>
    appHandlers.get('click')!({
      target: {
        closest: (selector: string) =>
          selector === '[data-action]' ? { dataset: { action } } : null,
      },
    });
  const key = (code: string, extra: Record<string, unknown> = {}) =>
    keyHandlers.get('keydown')!({
      code,
      key: code,
      target: canvas,
      preventDefault: () => {},
      ...extra,
    });
  const keyup = (code: string) =>
    keyHandlers.get('keyup')!({ code, preventDefault: () => {} });
  const pointer = (
    event: string,
    id: number,
    x: number,
    y = 300,
    extra: Record<string, unknown> = {},
  ) =>
    canvasHandlers.get(event)!({
      pointerId: id,
      clientX: x,
      clientY: y,
      button: 0,
      pointerType: 'touch',
      shiftKey: false,
      target: canvas,
      ...extra,
    });
  const kept = () => {
    assert.equal(session.state, state);
    assert.equal(session.pending, command);
    assert.equal(session.tool, tool);
    assert.equal(session.selected, selected);
    assert.equal(shown.fit, 0);
  };
  const suppressed = () => {
    assert.equal(el('placement').hidden, true);
    assert.equal(el('inspector').hidden, true);
    assert.equal(el('coach').hidden, true);
    assert.equal(el('labels').innerHTML, '');
    assert.equal(el('map-feedback').hidden, true);
    assert.equal(shown.grid, false);
    assert.equal(shown.tier, undefined);
    assert.equal(shown.ghost, undefined);
    assert.equal(shown.state, state);
    assert.equal(shown.result, result);
    assert.equal(shown.selected, undefined);
  };
  return {
    globals,
    session,
    controller,
    shown,
    el,
    classes,
    focus,
    click,
    change: (input: unknown) => appHandlers.get('change')!({ target: input }),
    key,
    keyup,
    pointer,
    wheel: () =>
      canvasHandlers.get('wheel')!({
        deltaY: -100,
        deltaMode: 0,
        clientX: 500,
        clientY: 300,
        preventDefault: () => {},
      }),
    escape: () => key('Escape', { target: { tagName: 'BUTTON' } }),
    refresh: controller.refresh,
    kept,
    suppressed,
    ui: () =>
      appHandlers.get('pointerdown')!({ target: { tagName: 'BUTTON' } }),
    storage,
  };
}
