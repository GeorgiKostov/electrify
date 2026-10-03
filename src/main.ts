import './ui/style.css';

import type { State, Node, Line, DayResult } from './game/types';

import { apply, buildCost, movable, type Command } from './game/commands';

import { budgets, stageFocus, initialState, addGrowth } from './game/levels';

import {
  loadSave,
  storeSave,
  hasCampaign,
  archivedCampaign,
  archivedCampaigns,
  startNewCampaign,
  restoreCampaign,
  recordCompletion,
  stageState,
  nextStageState,
  type Save,
} from './game/save';

import {
  toolsFor,
  focusTools,
  learnFromState,
  learnFromDay,
  canRun,
  type Tool as BuildTool,
} from './game/progression';

import { simulate } from './sim/simulate';

import {
  goalMet as evaluateGoal,
  stars as evaluateStars,
  starTargets,
} from './content/goals';

import { World } from './render/scene';
import { supportsTier } from './sim/network';
import { MapGesture, pointerIntent } from './game/pointer';
import { draggedTile } from './render/navigation';

import {
  copy,
  tr,
  stageGoal,
  stageTitle,
  fieldNote,
  stageHints,
  clock,
  power,
  diagnosticPower,
  energy,
  voltage,
} from './content/copy/en';

type Tool = BuildTool | 'select' | 'move';

const app = document.getElementById('app')!;

app.innerHTML = `<canvas id="world" aria-label="${copy.title}" role="img" tabindex="0"></canvas><nav id="left-head" class="hud" aria-label="${copy.menu}"></nav><div id="right-head" class="hud"></div><header id="goal" class="hud"></header><div id="coins" class="hud glass"></div><nav id="camera-buttons" class="hud" aria-label="${copy.fitView}"></nav><div id="labels"></div><div id="map-feedback" class="map-feedback glass" hidden></div><div id="map-context"><section id="placement" hidden></section><section id="inspector" hidden></section></div><div id="bottom-area"><section id="timeline"></section><div id="tray-wrap"><button id="undo-button" class="icon-btn tray-undo" data-action="undo" aria-label="${copy.undo}"></button><nav id="tray" aria-label="${copy.tool}"></nav></div></div><section id="menu" class="hud glass" hidden></section><div id="coach" class="coach glass" hidden></div><p id="save-status" role="status" hidden></p><dialog id="overlay" aria-labelledby="menu-title"></dialog>`;

const el = (id: string) => document.getElementById(id)!;

const dialog = el('overlay') as HTMLDialogElement;

const world = new World(el('world') as HTMLCanvasElement);

let campaignExists = hasCampaign(),
  save: Save = loadSave(),
  state = save.state,
  result: DayResult = simulate(state),
  previewState: State | undefined,
  previewResult: DayResult | undefined,
  cursor = stageFocus[state.stage - 1],
  selected: string | undefined,
  tool: Tool = 'select',
  pending: Command | undefined,
  pendingError = '',
  lineStart: string | undefined,
  overlay = 'home',
  menuOpen = false,
  panel = '',
  hidden = false,
  expanded = false,
  running = false,
  speed = 1,
  runLast = 0,
  runFraction = 0,
  coachStep = -1,
  coachBegan = performance.now(),
  panTotal = 0,
  showEarlierTools = false,
  layoutFrame = 0,
  introStarted = false,
  restoreIndex: number | undefined,
  fitRequested = true;
let candidate: Command | undefined,
  candidateKey = '',
  candidateError = '',
  candidateCost = 0,
  portsState: State | undefined,
  portsTier: string | undefined,
  portsSource: string | undefined;

const menuHistory: string[] = [],
  undo: State[] = [],
  covers = new Map<number, string>();

let returnFocus: { action?: string; id?: string } | null = null;

const time = (v: number) => clock(v, save.settings.twelve);

const icon = (name: string) =>
  `<i class="ph ph-${name}" aria-hidden="true"></i>`;
const coinValue = (value: number | string, suffix = '') =>
  `<span class="coin-value">${icon('coins')}<span>${value}${suffix ? ` <span class="cost-unit">${suffix}</span>` : ''}</span></span>`;
function mapUIVisible() {
  return !overlay && !menuOpen && !hidden;
}

const button = (
  action: string,
  label: string,
  glyph: string,
  cls = 'icon-btn',
) =>
  `<button class="${cls}" data-action="${action}" aria-label="${label}" title="${label}">${icon(glyph)}${cls.startsWith('icon-btn') ? '' : ` ${label}`}</button>`;

const now = () => (previewResult ?? result).steps[cursor];

const lesson = () => (save.lessons[state.stage] ??= []);

function name(n: Node) {
  const key =
    n.id === 'farm'
      ? 'farm'
      : n.id === 'daycab'
        ? 'dayRobotaxi'
        : n.kind === 'grid'
          ? 'grid'
          : n.kind === 'transformer'
            ? n.size === 'L'
              ? 'transformerL'
              : 'transformerS'
            : n.kind === 'home'
              ? 'house'
              : n.kind === 'cafe'
                ? 'cafe'
                : n.kind === 'workshop'
                  ? 'workshop'
                  : n.kind === 'solar'
                    ? 'solar'
                    : n.kind === 'batteryQuick'
                      ? 'quick'
                      : n.kind === 'batteryLong'
                        ? 'long'
                        : n.kind === 'ev'
                          ? 'robotaxi'
                          : 'depot';
  const index = n.id.startsWith('street')
    ? Number(n.id.slice(6)) + 2
    : n.id.startsWith('hill')
      ? Number(n.id.slice(4)) + 14
      : !n.id.match(/\d/) || n.id === 'daycab'
        ? undefined
        : n.id.replace(/\D/g, '');
  return `${tr(key as keyof typeof copy)} ${index ?? ''}`.trim();
}

function lineName(l: Line) {
  return `${l.tier === 'LV' ? copy.lineLV : copy.lineMV} ${l.id.replace(/\D/g, '')}`.trim();
}

function selectedObject() {
  return (
    state.nodes.find((n) => n.id === selected) ||
    state.lines.find((l) => l.id === selected)
  );
}

function goalMet(r = previewResult ?? result) {
  return evaluateGoal(state.stage, r);
}

function starList(r = previewResult ?? result) {
  const names = {
    'Lights on': copy.lights,
    Thrifty: copy.thrifty,
    Clean: copy.clean,
    'No waste': copy.noWaste,
  };
  return evaluateStars(state.stage, r).map((star) => names[star]);
}

function clearCandidate() {
  candidate = undefined;
  candidateKey = '';
  el('map-feedback').hidden = true;
  world.highlightPort();
  if (!pending) world.clearGhost();
}
function clearPreview() {
  pending = undefined;
  pendingError = '';
  previewState = undefined;
  previewResult = undefined;
  clearCandidate();
  world.clearGhost();
}

function stopRun() {
  running = false;
  app.classList.remove('running');
}

function clearStageInteraction() {
  cancelGesture();
  stopRun();
  clearPreview();
  lineStart = undefined;
  tool = 'select';
  selected = undefined;
  menuOpen = false;
  panel = '';
  expanded = false;
  showEarlierTools = false;
  undo.length = 0;
}

function persist() {
  const stored = storeSave(save);
  if (stored) campaignExists = true;
  el('save-status').hidden = stored;
  el('save-status').innerHTML =
    `${copy.saveNotice} ${button('retry-save', copy.retrySave, 'arrow-counter-clockwise', 'secondary')}`;
  return stored;
}

function saveNow() {
  save.state = state;
  save.states[state.stage] = structuredClone(state);
  persist();
}

function setState(next: State, push = true) {
  stopRun();
  if (push) {
    undo.push(structuredClone(state));
    if (undo.length > 50) undo.shift();
  }
  state = next;
  result = simulate(state);
  clearPreview();
  save.lessons[state.stage] = learnFromState(lesson(), state);
  saveNow();
  refresh();
}

function commit(command: Command) {
  if (hidden) return;
  const applied = apply(state, command, lesson());
  if (applied.error) {
    pendingError = applied.error;
    refreshPlacement();
    return;
  }
  lineStart = undefined;
  setState(applied.state);
  if (command.type === 'place') {
    selected = state.nodes.at(-1)?.id;
    tool = 'select';
  }
  if (command.type === 'move') tool = 'select';
  if (command.type === 'connect') {
    tool = 'select';
    selected = undefined;
  }
  if (command.type === 'remove') {
    selected = undefined;
    tool = 'select';
  }
  refresh();
}

function commandGhost(command: Command, error: string) {
  if (!mapUIVisible() || running) {
    world.clearGhost();
    return;
  }
  if (command.type === 'place' || command.type === 'move') {
    const node =
      command.type === 'place'
        ? command
        : state.nodes.find((n) => n.id === command.id);
    if (node && Number.isFinite(command.x) && Number.isFinite(command.z))
      world.showGhost(command.x, command.z, node, !error);
    else world.clearGhost();
  }
  if (command.type === 'connect') {
    world.showLineGhost(
      state.nodes.find((n) => n.id === command.a),
      state.nodes.find((n) => n.id === command.b),
      !error,
      command.tier,
    );
    world.highlightPort(command.b, !error);
  }
}
function preview(command: Command) {
  if (!mapUIVisible() || running) return;
  clearCandidate();
  pending = command;
  const applied = apply(state, command, lesson());
  pendingError = applied.error ?? '';
  previewState = applied.error ? undefined : applied.state;
  previewResult = previewState ? simulate(previewState) : undefined;
  refreshPlacement();
  goal();
  refreshWorld();
  timeline();
  inspector();
  commandGhost(command, pendingError);
  measureLayout();
}
function feedback(
  text: string,
  glyph: string,
  point: { clientX: number; clientY: number },
  valid?: boolean,
) {
  const box = el('map-feedback');
  box.hidden = false;
  box.classList.toggle('error', valid === false);
  box.classList.toggle('valid', valid === true);
  box.innerHTML = `${icon(glyph)} <span>${text}</span>`;
  const rect = box.getBoundingClientRect();
  box.style.left = `${Math.max(8, Math.min(innerWidth - rect.width - 8, point.clientX + 18))}px`;
  box.style.top = `${Math.max(8, Math.min(innerHeight - rect.height - 8, point.clientY + 18))}px`;
}
function liveCandidate(
  command: Command,
  point: { clientX: number; clientY: number },
) {
  const key = JSON.stringify(command);
  if (key !== candidateKey) {
    const applied = apply(state, command, lesson());
    candidate = command;
    candidateKey = key;
    candidateError = applied.error ?? '';
    candidateCost = applied.error
      ? 0
      : buildCost(applied.state) - buildCost(state);
    commandGhost(command, candidateError);
  }
  feedback(
    candidateError ||
      `${copy.ready} · ${coinValue(Math.abs(candidateCost), candidateCost < 0 ? copy.refund : '')}`,
    candidateError ? 'x' : 'check-circle',
    point,
    !candidateError,
  );
}
function placementCommand(x: number, z: number): Command {
  return tool === 'move'
    ? { type: 'move', id: selected!, x, z }
    : {
        type: 'place',
        kind:
          tool === 'transformerS' || tool === 'transformerL'
            ? 'transformer'
            : (tool as Node['kind']),
        x,
        z,
        size: tool === 'transformerL' ? 'L' : 'S',
      };
}
function context() {
  const visible = mapUIVisible() && !running,
    tier = visible && (tool === 'LV' || tool === 'MV') ? tool : undefined;
  world.showGrid(visible && tool !== 'select');
  if (portsState !== state || portsTier !== tier || portsSource !== lineStart) {
    portsState = state;
    portsTier = tier;
    portsSource = lineStart;
    const status =
      tier && lineStart
        ? new Map(
            state.nodes.map((node) => [
              node.id,
              !apply(
                state,
                { type: 'connect', a: lineStart!, b: node.id, tier },
                lesson(),
              ).error,
            ]),
          )
        : undefined;
    world.showPorts(state.nodes, tier, lineStart, status);
  }
  if (!visible) {
    el('map-feedback').hidden = true;
    world.clearGhost();
    world.highlightPort();
  } else if (pending) commandGhost(pending, pendingError);
}

function hover(point: {
  clientX: number;
  clientY: number;
  pointerType?: string;
}) {
  if (!mapUIVisible() || running || pending) return;
  const tier = tool === 'LV' || tool === 'MV' ? tool : undefined,
    at = tier
      ? world.pickPort(
          point.clientX,
          point.clientY,
          tier,
          point.pointerType === 'touch',
        )
      : world.pick(point.clientX, point.clientY),
    node = state.nodes.find((n) => n.id === at);
  canvas.dataset.cursor =
    tool === 'select'
      ? node
        ? movable(node)
          ? 'grab'
          : 'pointer'
        : 'grab'
      : tier
        ? 'crosshair'
        : tool === 'move'
          ? 'grab'
          : 'crosshair';
  if (tier) {
    if (lineStart) {
      if (node && node.id !== lineStart)
        liveCandidate(
          { type: 'connect', a: lineStart, b: node.id, tier },
          point,
        );
      else {
        clearCandidate();
        const end = world.groundPoint(point.clientX, point.clientY);
        world.showLineGhost(
          state.nodes.find((n) => n.id === lineStart),
          end ? { x: end.x, z: end.z } : undefined,
          false,
          tier,
        );
        feedback(
          node?.id === lineStart
            ? copy.helpLineEnd
            : node && !supportsTier(node, tier)
              ? copy.wrongVoltage
              : copy.helpLineEnd,
          'plugs-connected',
          point,
        );
      }
    } else if (node) {
      clearCandidate();
      const valid = supportsTier(node, tier);
      world.highlightPort(node.id, valid);
      feedback(
        valid ? `${name(node)} · ${copy.helpLineStart}` : copy.wrongVoltage,
        valid ? 'plugs-connected' : 'x',
        point,
        valid,
      );
    } else clearCandidate();
    return;
  }
  if (tool !== 'select') {
    const tile = candidateTile(point.clientX, point.clientY);
    if (tile) liveCandidate(placementCommand(tile.x, tile.z), point);
    return;
  }
  clearCandidate();
  if (node)
    feedback(
      `${name(node)} · ${movable(node) ? copy.helpGrab : node.kind === 'transformer' && node.zone === 'depot' ? copy.helpDepotFixed : copy.helpFixed}`,
      movable(node) ? 'arrows-out-cardinal' : 'lock-key',
      point,
    );
}

function closeOverlay() {
  const starting = overlay === 'home';
  overlay = '';
  if (starting && !save.coachSeen && !introStarted) {
    introStarted = true;
    coachStep = 0;
    coachBegan = performance.now();
    panTotal = 0;
  }
  menuHistory.length = 0;
  if (dialog.open) dialog.close();
  refresh();
  const focus = returnFocus?.action
    ? app.querySelector<HTMLElement>(`[data-action="${returnFocus.action}"]`)
    : returnFocus?.id
      ? document.getElementById(returnFocus.id)
      : el('world');
  (focus?.getClientRects().length
    ? focus
    : app.querySelector<HTMLElement>('[data-action="menu"]')?.getClientRects()
          .length
      ? app.querySelector<HTMLElement>('[data-action="menu"]')
      : el('world')
  )?.focus();
  returnFocus = null;
}

function showOverlay(view: string, remember = true) {
  stopRun();
  spaceHeld = false;
  cancelGesture();
  if (!dialog.open) {
    const focused = document.activeElement as HTMLElement;
    returnFocus = {
      action: focused.closest('#menu')
        ? panel === 'resources'
          ? 'resources'
          : 'tasks'
        : focused.dataset.action,
      id: focused.id,
    };
  } else if (remember && view !== overlay) menuHistory.push(overlay);
  overlay = view;
  menuOpen = false;
  panel = '';
  clearPreview();
  refresh();
}

function backOverlay() {
  const view = menuHistory.pop();
  if (view) {
    overlay = view;
    refreshOverlay();
  } else closeOverlay();
}

function nextStage() {
  if (state.stage === 6) {
    showOverlay('home', false);
    return;
  }
  const next = nextStageState(save);
  if (!next) return;
  enterStage(next.stage);
}

function enterStage(stage: number) {
  const next = stageState(save, stage);
  if (!next) return;
  clearStageInteraction();
  state = next;
  result = simulate(state);
  cursor = stageFocus[stage - 1];
  saveNow();
  overlay = '';
  menuHistory.length = 0;
  if (dialog.open) dialog.close();
  refresh();
  fitRequested = true;
  measureLayout();
  (el('world') as HTMLCanvasElement).focus();
}

function finishCheck(watched = false) {
  clearPreview();
  stopRun();
  save.lessons[state.stage] = learnFromDay(lesson(), state, result);
  save.state = state;
  const success = recordCompletion(save, result, watched);
  saveNow();
  if (success) showOverlay('complete', false);
  else if (goalMet(result) && state.stage === 1) showOverlay('watch', false);
  else {
    cursor = result.firstFailure?.step ?? cursor;
    showOverlay('diagnosis', false);
  }
}

function startRun() {
  if (!canRun(state, lesson())) return;
  cancelGesture();
  if (running) {
    stopRun();
    refresh();
    return;
  }
  if (dialog.open) {
    overlay = '';
    menuHistory.length = 0;
    dialog.close();
  }
  clearPreview();
  menuOpen = false;
  panel = '';
  running = true;
  app.classList.add('running');
  cursor = 0;
  runFraction = 0;
  runLast = performance.now();
  refresh();
  requestAnimationFrame(runFrame);
}

function runFrame(nowMs: number) {
  if (!running) return;
  const delta = Math.min(0.1, (nowMs - runLast) / 1000);
  runLast = nowMs;
  runFraction += ((delta * 96) / 60) * speed;
  while (runFraction >= 1) {
    runFraction--;
    cursor++;
    if (result.firstFailure && cursor >= result.firstFailure.step) {
      cursor = result.firstFailure.step;
      finishCheck();
      return;
    }
    if (cursor >= 96) {
      cursor = 95;
      finishCheck(true);
      return;
    }
  }
  refreshWorld();
  refreshTimelineTime();
  requestAnimationFrame(runFrame);
}

function header() {
  el('left-head').innerHTML =
    button('menu', copy.menu, 'list') +
    `<button class="icon-btn" data-action="tasks" aria-label="${copy.tasks}" aria-expanded="${menuOpen && panel === 'tasks'}" aria-controls="menu">${icon('list-checks')}<small id="task-count">${goalMet() ? 1 : 0}/1</small></button>` +
    (hidden ? button('hide', copy.show, 'eye') : '');
  el('camera-buttons').innerHTML =
    button('zoomOut', copy.zoomOut, 'minus') +
    button('fit', copy.fitView, 'corners-out') +
    button('zoomIn', copy.zoomIn, 'plus');
  el('undo-button').innerHTML = icon('arrow-u-up-left');
  (el('undo-button') as HTMLButtonElement).disabled = !undo.length;
  app.classList.toggle('has-undo', !!undo.length);
}

function teaching() {
  const l = lesson();
  if (state.stage === 1)
    return goalMet(result) ? copy.lesson1Run : copy.lesson1Connect;
  if (state.stage === 2) {
    const focused = focusTools(state, l)[0];
    return focused === 'transformerS'
      ? copy.lesson2Place
      : focused === 'MV'
        ? copy.lesson2MV
        : copy.lesson2LV;
  }
  if (state.stage === 3) return copy.lesson3;
  if (state.stage === 4) return copy.lesson4;
  if (state.stage === 5)
    return !state.nodes.some((n) => n.kind === 'batteryQuick')
      ? copy.lesson5Quick
      : !l.includes('quick-observed')
        ? copy.lesson5Connect
        : state.nodes.some((n) => n.kind === 'batteryLong')
          ? copy.lesson5Together
          : copy.lesson5Long;
  return copy.lesson6;
}

function goal() {
  el('goal').innerHTML =
    `<h1>${stageTitle(state.stage)}</h1><p>${copy.stageLabel} ${state.stage} · ${stageGoal(state.stage)}</p>${save.settings.tips && !running ? `<p class="teaching" role="status">${teaching()}</p>` : ''}`;
  el('coins').innerHTML =
    `<button data-action="resources" aria-label="${copy.resources}: ${copy.coinsLeft} ${budgets[state.stage - 1] - buildCost(previewState ?? state)} / ${budgets[state.stage - 1]}" aria-expanded="${menuOpen && panel === 'resources'}" aria-controls="menu">${coinValue(`${budgets[state.stage - 1] - buildCost(previewState ?? state)} / ${budgets[state.stage - 1]}`)}<span class="star-value">${icon('star')} ${save.stars[state.stage]?.length ?? 0}</span>${previewState ? `<small>${copy.preview}</small>` : ''}</button>`;
}

const toolInfo: Record<Tool, [string, string, number]> = {
  select: [copy.select, 'cursor', 0],
  LV: [copy.lineLV, 'line-segment', 1],
  MV: [copy.lineMV, 'plugs-connected', 2],
  transformerS: [copy.transformerS, 'lightning', 3],
  transformerL: [copy.transformerL, 'lightning', 5],
  solar: [copy.solar, 'sun', 8],
  batteryQuick: [copy.quick, 'battery-charging', 3],
  batteryLong: [copy.long, 'battery-full', 4],
  move: [copy.move, 'arrows-out-cardinal', 0],
};

function tray() {
  const available = toolsFor(state, lesson()),
    focused = focusTools(state, lesson()),
    visible = showEarlierTools
      ? available
      : focused.filter((t) => available.includes(t));
  el('tray').innerHTML =
    visible
      .map((t) => {
        const [title, glyph, cost] = toolInfo[t];
        return `<button class="tool ${tool === t ? 'active' : ''}" data-tool="${t}" aria-pressed="${tool === t}" title="${title}"><span class="tool-art">${icon(glyph)}</span><span class="tool-name">${title}</span><span class="tool-cost">${coinValue(cost, t === 'LV' || t === 'MV' ? copy.perTile : '')}</span></button>`;
      })
      .join('') +
    (available.some((t) => !focused.includes(t))
      ? `<button class="tool more-tools" data-action="more-tools" aria-label="${showEarlierTools ? copy.fewerTools : copy.moreTools}" title="${showEarlierTools ? copy.fewerTools : copy.moreTools}" aria-expanded="${showEarlierTools}"><span class="tool-art">${icon(showEarlierTools ? 'x' : 'dots-three')}</span><span class="tool-name">${showEarlierTools ? copy.fewerTools : copy.moreTools}</span></button>`
      : '');
}

function options(nodes: Node[], chosen?: string) {
  return (
    `<option value="">${copy.select}</option>` +
    nodes
      .map(
        (n) =>
          `<option value="${n.id}" ${n.id === chosen ? 'selected' : ''}>${name(n)}</option>`,
      )
      .join('')
  );
}

function refreshPlacement() {
  const bar = el('placement'),
    visible = mapUIVisible() && !running && (tool !== 'select' || !!pending);
  bar.hidden = !visible;
  app.classList.toggle('placing', !running && (tool !== 'select' || !!pending));
  if (!visible) return;
  let inputs = '';
  const placeTool = [
    'transformerS',
    'transformerL',
    'solar',
    'batteryQuick',
    'batteryLong',
    'move',
  ].includes(tool);
  if (placeTool) {
    const p = pending && 'x' in pending ? pending : undefined;
    inputs = `<div class="coordinate-inputs"><label>${copy.x}<input id="place-x" type="number" min="1" max="23" step="1" value="${p?.x ?? (tool === 'move' ? state.nodes.find((n) => n.id === selected)?.x : state.stage === 2 ? 18 : state.stage === 5 ? 15 : 16)}"></label><label>${copy.z}<input id="place-z" type="number" min="2" max="17" step="1" value="${p?.z ?? (tool === 'move' ? state.nodes.find((n) => n.id === selected)?.z : state.stage === 5 ? 15 : 9)}"></label>${button('preview-coords', copy.preview, 'map-pin', 'secondary small')}</div>`;
  }

  if (tool === 'LV' || tool === 'MV') {
    const p = pending?.type === 'connect' ? pending : undefined;
    const nodes = state.nodes.filter((n) => n.kind !== 'site');
    inputs = `<div class="coordinate-inputs"><label>${copy.from}<select id="line-a">${options(nodes, p?.a ?? lineStart)}</select></label><label>${copy.to}<select id="line-b">${options(nodes, p?.b)}</select></label>${button('preview-line', copy.preview, 'plugs-connected', 'secondary small')}</div>`;
  }

  const title =
      pending?.type === 'remove'
        ? copy.remove
        : pending?.type === 'move'
          ? copy.move
          : pending?.type === 'place'
            ? toolInfo[
                pending.kind === 'transformer'
                  ? pending.size === 'L'
                    ? 'transformerL'
                    : 'transformerS'
                  : (pending.kind as Tool)
              ][0]
            : toolInfo[tool][0],
    action =
      pending?.type === 'connect'
        ? copy.connect
        : pending?.type === 'remove'
          ? copy.remove
          : pending?.type === 'move'
            ? copy.move
            : copy.place;
  const cost =
      pending && !pendingError
        ? buildCost(apply(state, pending, lesson()).state) - buildCost(state)
        : 0,
    detail = pending
      ? pendingError || copy.ready
      : placeTool
        ? copy.helpPlacement
        : lineStart
          ? `${copy.helpLineEnd} ${name(state.nodes.find((n) => n.id === lineStart)!)}`
          : copy.helpConnection;

  bar.innerHTML = `<div class="placement-heading"><h2>${title}</h2>${button('cancel', copy.cancel, 'x')}</div><div class="placement-summary"><p class="placement-detail ${pendingError ? 'error' : ''}" role="status">${pending ? icon(pendingError ? 'x' : 'check-circle') : ''}<span>${detail}</span></p>${pending && !pendingError ? `<span class="placement-cost">${coinValue(Math.abs(cost), cost < 0 ? copy.refund : '')}</span>` : ''}</div>${pending ? `<div class="actions">${button('confirm', action, 'check-circle', 'primary')}</div>` : ''}${inputs ? `<details><summary>${copy.keyboardBuild}</summary>${inputs}</details>` : ''}`;
  (
    bar.querySelector('[data-action=confirm]') as HTMLButtonElement | undefined
  )?.toggleAttribute('disabled', !!pendingError);
}

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
    view = previewResult ?? result,
    visible =
      mapUIVisible() && !running && !!thing && tool === 'select' && !pending;
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
      ? state.lines.filter((line) => line.a === n.id || line.b === n.id)
      : [];

  box.innerHTML = `<div class="placement-heading"><h2>${title}</h2>${button('close-inspector', copy.cancel, 'x')}</div>${description ? `<p class="placement-detail">${description}</p>` : ''}${n ? `<p class="placement-detail object-editability">${icon(movable(n) ? 'arrows-out-cardinal' : 'lock-key')} ${movable(n) ? copy.helpGrab : n.kind === 'transformer' && n.zone === 'depot' ? copy.helpDepotFixed : copy.helpFixed}</p>` : ''}${state.stage >= 3 ? `<strong>${value}</strong>` : now().served[n?.id ?? ''] === false ? `<p class="error">${copy.unpowered}</p>` : ''}<div class="actions">${n && movable(n) ? button('move', copy.move, 'arrows-out-cardinal', 'secondary small') : ''}${toolsFor(state, lesson()).includes('transformerL') && n?.kind === 'transformer' && n.size === 'S' && n.zone !== 'hill' && n.zone !== 'depot' ? button('upgrade', copy.upgrade, 'arrow-fat-up', 'primary small') : ''}${!thing.locked ? button('remove', copy.remove, 'trash', 'secondary small') : ''}</div>${battery && state.stage >= 5 ? batteryEditor(n!) : ''}${n?.kind === 'ev' && state.stage >= 6 ? evEditor(n) : ''}<details><summary>${copy.details}</summary>${state.stage >= 3 ? `<svg class="chart" viewBox="0 0 600 100" preserveAspectRatio="none" aria-label="${copy.today}">${graph(spark, 'var(--pp-accent)')}</svg><div class="inspector-stats"><span>${battery ? copy.batteryEnergy : copy.limit}</span><strong>${battery ? energy(cap) : cap ? power(cap) : copy.powered}</strong>${battery ? `<span>${copy.limit}</span><strong>${power(n!.kind === 'batteryQuick' ? 10 : 5)}</strong>` : ''}<span>${copy.lostHeat}</span><strong>${energy(view.metrics.lostAsHeatKWh)}</strong></div>` : ''}${n?.kind === 'transformer' && state.stage >= 2 ? `<p>${voltage('LV', save.settings.region)}</p>` : ''}${n ? `<h3>${copy.connections}</h3><div class="actions">${connections.map((line) => `<button class="secondary small" data-select-line="${line.id}">${lineName(line)}</button>`).join('')}</div>` : ''}</details>`;
}

function batteryEditor(n: Node) {
  const s = state.batteries[n.id] ?? { charge: [40, 60], discharge: [68, 88] };
  const choose = (slot: string, value: number) =>
    `<select data-battery="${n.id}" data-slot="${slot}">${Array.from({ length: 97 }, (_, i) => `<option value="${i}" ${value === i ? 'selected' : ''}>${time(i === 96 ? 0 : i)}</option>`).join('')}</select>`;
  return `<div class="schedule-editor"><label>${copy.charge} ${copy.start}${choose('c0', s.charge[0])}</label><label>${copy.charge} ${copy.end}${choose('c1', s.charge[1])}</label><label>${copy.giveBack} ${copy.start}${choose('d0', s.discharge[0])}</label><label>${copy.giveBack} ${copy.end}${choose('d1', s.discharge[1])}</label></div>`;
}

function evEditor(n: Node) {
  const start = state.evStarts[n.id] ?? n.window![0],
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

function timeline() {
  const view = previewResult ?? result,
    advanced = state.stage >= 3,
    expand = expanded && advanced;
  app.classList.toggle('timeline-expanded', expand);
  const chart = expand
    ? `<svg class="chart" viewBox="0 0 600 100" preserveAspectRatio="none" aria-label="${copy.demand}">${graph(
        view.steps.map((s) => s.demandKW),
        'var(--pp-ink-strong)',
      )}${graph(
        view.steps.map((s) => Math.max(0, s.gridKW)),
        'var(--pp-grid)',
      )}${
        state.stage >= 4
          ? graph(
              view.steps.map((s) => s.solarKW),
              'var(--pp-solar)',
            )
          : ''
      }</svg>`
    : '';

  const schedule =
    expand && state.stage >= 5
      ? `<div class="lanes">${state.nodes
          .filter(
            (n) =>
              (n.kind === 'ev' && state.stage >= 6) ||
              n.kind.startsWith('battery'),
          )
          .map((n) => {
            const start =
                n.kind === 'ev'
                  ? (state.evStarts[n.id] ?? n.window![0])
                  : (state.batteries[n.id]?.discharge[0] ?? 68),
              min = n.kind === 'ev' ? n.window![0] : 0,
              max =
                n.kind === 'ev'
                  ? n.window![1] -
                    Math.ceil((n.needKWh ?? 0) / ((n.chargerKW ?? 22) * 0.25))
                  : 95;
            return `<div class="lane"><strong>${name(n)}</strong><input type="range" min="${min}" max="${max}" step="1" value="${start}" data-lane="${n.id}" aria-label="${copy.start} ${name(n)}"><span>${time(start < 96 ? start : start - 96)}</span></div>`;
          })
          .join('')}</div>`
      : '';

  el('timeline').innerHTML =
    `<div class="timeline-row">${button('run', running ? copy.pause : copy.run, running ? 'pause' : 'play', running ? 'secondary' : 'run')}<span id="clock" class="clock">${time(cursor)}</span>${advanced ? `<input id="scrub" type="range" min="0" max="95" value="${cursor}" aria-label="${copy.step}"><button class="secondary small" data-action="speed" aria-label="${copy.speed}">${speed}×</button>` : ''}${state.stage >= 2 ? button('check', copy.check, 'magnifying-glass', 'secondary small') : ''}${advanced ? button('expand', expand ? copy.collapse : copy.expand, expand ? 'caret-down' : 'caret-up', 'icon-btn') : ''}</div>${expand ? `<div class="timeline-detail"><div class="phone-time"><span>${copy.step}</span><input id="phone-scrub" type="range" min="0" max="95" value="${cursor}" aria-label="${copy.step}"><button class="secondary small" data-action="speed" aria-label="${copy.speed}">${speed}×</button></div>${chart}${schedule}<p class="status">${energy(view.metrics.gridImportKWh)} ${copy.gridImport}</p></div>` : ''}`;
  (
    el('timeline').querySelector('[data-action=run]') as HTMLButtonElement
  ).disabled = !canRun(state, lesson());
  measureLayout();
}

function refreshTimelineTime() {
  el('clock').textContent = time(cursor);
  for (const id of ['scrub', 'phone-scrub']) {
    const scrub = el(id) as HTMLInputElement | null;
    if (scrub) scrub.value = String(cursor);
  }
}

function menu() {
  const box = el('menu');
  box.hidden = !menuOpen || !!overlay || hidden;
  if (box.hidden) return;
  box.dataset.panel = panel;
  if (panel === 'tasks')
    box.innerHTML = `<div class="popover-heading"><h2>${copy.tasks}</h2>${button('close-panel', copy.cancel, 'x')}</div><div class="task-line">${icon(goalMet() ? 'check-circle' : 'list-checks')}<span>${stageGoal(state.stage)}</span></div><p>${teaching()}</p><div class="actions">${button('hint', copy.hint, 'lightbulb', 'secondary')}${button('guide', copy.guide, 'book-open', 'secondary')}</div>`;
  else
    box.innerHTML = `<div class="popover-heading"><h2>${copy.resources}</h2>${button('close-panel', copy.cancel, 'x')}</div><dl class="resource-balance"><div><dt>${copy.coinsLeft}</dt><dd>${coinValue(budgets[state.stage - 1] - buildCost(previewState ?? state))}</dd></div><div><dt>${copy.budget}</dt><dd>${coinValue(budgets[state.stage - 1])}</dd></div></dl>${previewState ? `<p class="muted">${copy.preview}</p>` : ''}<div class="stars">${starList()
      .map((s) => `<span>${icon('star')} ${s}</span>`)
      .join('')}</div>`;
}

function coach() {
  const box = el('coach');
  box.hidden =
    coachStep < 0 || !save.settings.tips || !mapUIVisible() || running;
  if (box.hidden) return;
  const labels = [copy.navigation, copy.zoomIn, copy.fit],
    helps = [copy.navigationHelp, copy.navigationHelp, copy.helpFit];
  box.innerHTML = `<div class="kicker">${labels[coachStep]}</div><svg viewBox="0 0 180 100"><circle cx="65" cy="58" r="16"/><path d="M58 90V58a7 7 0 0 1 14 0v19l9-4c8-3 15 3 13 12l-6 8H64Z"/></svg><p>${helps[coachStep]}</p>${button('coach-skip', copy.skip, 'x', 'secondary small')}`;
}

function advanceCoach(kind: 'pan' | 'zoom' | 'fit') {
  if (coachStep < 0 || performance.now() - coachBegan < 1800) return;
  if (
    (kind === 'pan' && coachStep === 0 && panTotal >= 24) ||
    (kind === 'zoom' && coachStep === 1) ||
    (kind === 'fit' && coachStep === 2)
  ) {
    coachStep++;
    coachBegan = performance.now();
    if (coachStep > 2) {
      coachStep = -1;
      save.coachSeen = true;
      persist();
    }
    coach();
  }
}

function refreshWorld() {
  const visible = mapUIVisible();
  world.reduced = save.settings.reduced;
  world.paused = !!overlay || menuOpen;
  world.draw(
    visible ? (previewState ?? state) : state,
    visible ? (previewResult ?? result) : result,
    cursor,
    visible ? selected : undefined,
  );
  context();
  (el('world') as HTMLCanvasElement).setAttribute(
    'aria-label',
    `${stageGoal(state.stage)}. ${state.nodes.filter((n) => n.kind === 'home' && now().served[n.id]).length} ${copy.house} · ${time(cursor)}`,
  );
  labels();
}

function labels() {
  const host = el('labels');
  if (!mapUIVisible()) {
    host.innerHTML = '';
    return;
  }
  const step = (previewResult ?? result).steps[cursor],
    all = previewState ?? state,
    failed = all.nodes.filter(
      (n) => n.kind === 'transformer' && step.trips.includes(`tx:${n.id}`),
    ),
    selectedNode = all.nodes.filter(
      (n) => n.id === selected && !failed.includes(n),
    ),
    unpowered = all.nodes
      .filter((n) => step.served[n.id] === false && !selectedNode.includes(n))
      .slice(0, 2),
    rest =
      save.settings.numbers && state.stage >= 3
        ? all.nodes.filter(
            (n) =>
              n.kind !== 'site' &&
              !failed.includes(n) &&
              !selectedNode.includes(n) &&
              !unpowered.includes(n),
          )
        : [],
    placed: { x: number; y: number }[] = [];
  host.innerHTML = [...failed, ...selectedNode, ...unpowered, ...rest]
    .map((n) => {
      const problem = failed.includes(n) || step.served[n.id] === false,
        p = world.project(n.x, n.z, failed.includes(n) ? 3 : 1.4);
      if (placed.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 68)) return '';
      placed.push(p);
      const value = failed.includes(n)
        ? copy.overloadTransformer
        : n.kind === 'transformer' && state.stage >= 3
          ? power(step.requested[`tx:${n.id}`] ?? 0)
          : n.kind === 'solar'
            ? power(step.solarKW)
            : step.served[n.id] === false
              ? `${name(n)} · ${copy.unpowered}`
              : name(n);
      return `<span class="map-label ${problem ? 'error' : ''}" style="left:${p.x}px;top:${p.y}px">${value}</span>`;
    })
    .join('');
}

function measureLayout() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    const heading = el('goal').getBoundingClientRect(),
      bottom = el('bottom-area').getBoundingClientRect(),
      camera = el('camera-buttons').getBoundingClientRect(),
      landscape = innerHeight < 481 && innerWidth > 600,
      desktop = innerWidth >= 850 && !landscape,
      top = hidden
        ? 12
        : Math.max(
            heading.bottom,
            innerWidth < 850 && !landscape ? camera.bottom : 0,
          ) + 12,
      left = desktop ? 36 : 12,
      right = hidden
        ? innerWidth - 12
        : desktop
          ? innerWidth - 344
          : landscape
            ? bottom.left - 16
            : innerWidth - 12,
      end = hidden
        ? innerHeight - 12
        : landscape
          ? camera.top - 12
          : desktop
            ? bottom.top - 12
            : bottom.top - 152;
    el('map-context').style.setProperty(
      '--context-bottom',
      `${innerHeight - bottom.top + 10}px`,
    );
    world.setFrame({
      left,
      top,
      width: Math.max(100, right - left),
      height: Math.max(100, end - top),
    });
    if (fitRequested) {
      fitRequested = false;
      world.fit();
    }
  });
}

function cover(stage: number) {
  return covers.get(stage) ?? '';
}

function refresh() {
  app.classList.toggle('window-open', !!overlay || menuOpen);
  header();
  goal();
  tray();
  refreshPlacement();
  inspector();
  timeline();
  menu();
  coach();
  refreshOverlay();
  refreshWorld();
  measureLayout();
}

function refreshOverlay() {
  if (!overlay) {
    if (dialog.open) dialog.close();
    return;
  }
  let body = '',
    utility = true;
  const archive = archivedCampaign();
  const chrome = `<header class="menu-top"><button class="menu-back" data-action="back" ${menuHistory.length ? '' : 'hidden'}>${icon('caret-left')} ${copy.back}</button><span class="menu-wordmark">${copy.title}<span class="wordmark-dot"></span></span>${button('overlay-close', copy.keepPlaying, 'x', 'icon-btn menu-close')}</header>`;

  if (overlay === 'home') {
    utility = false;
    body = `<section class="home-view"><p class="menu-eyebrow">${copy.introEyebrow}</p><h1 id="menu-title">${copy.heroFirst}<br>${copy.heroLast}</h1><div class="home-art"><img src="${cover(state.stage)}" alt="${stageTitle(state.stage)}"></div><div class="home-bottom"><button class="menu-primary" data-action="continue">${icon('play')} ${campaignExists ? copy.continuePlaying : copy.startPlaying} ${icon('caret-right')}</button><p class="resume-caption">${copy.savedStage} ${state.stage} · ${stageTitle(state.stage)}</p><button class="browse-chapters" data-action="stages">${copy.exploreStages} ${icon('squares-four')}</button><footer class="home-footer"><button data-action="guide">${icon('question')} ${copy.howToPlay}</button><button data-action="settings">${copy.settings}</button>${campaignExists ? `<button data-action="new-campaign">${copy.startOver}</button>` : ''}${archive ? `<button data-action="restore-campaign">${copy.restorePrevious}</button>` : ''}<span>${copy.introHomeFoot}</span></footer></div></section>`;
  } else if (overlay === 'stages') {
    utility = false;
    body = `<section class="chapters-view"><p class="menu-eyebrow">${copy.title}</p><h1 id="menu-title">${copy.introStageHero}</h1><p class="menu-subtitle">${copy.introStages}</p><div class="chapter-cards">${Array.from(
      { length: 6 },
      (_, i) => {
        const stage = i + 1,
          done = !!save.stars[stage]?.length,
          locked = stage > save.unlocked,
          tint = ['peach', 'rose', 'sage', 'sky', 'sand', 'lavender'][i];
        return `<button class="chapter-card" data-stage="${stage}" ${locked ? 'disabled' : ''} style="--chapter-tint:var(--pp-${tint})"><div class="chapter-card-art"><span class="chapter-number">${String(stage).padStart(2, '0')}</span><img src="${cover(stage)}" alt="">${done ? `<span class="chapter-complete">${icon('check-circle')} ${copy.complete}</span>` : ''}</div><div class="chapter-card-copy"><h2>${stageTitle(stage)}</h2><p>${stageGoal(stage)}</p><div class="chapter-card-progress"><span>${locked ? `${copy.locked} · ${copy.stageLabel} ${stage - 1}` : done ? `${icon('star')} ${save.stars[stage].length}` : save.states[stage]?.lines.some((l) => !l.locked) ? copy.inProgress : copy.notStarted}</span>${icon(locked ? 'lock-key' : 'caret-right')}</div><div class="chapter-track"><span style="width:${done ? 100 : 0}%"></span></div></div></button>`;
      },
    ).join('')}</div></section>`;
  } else if (overlay === 'pause')
    body = `<h1 id="menu-title">${stageTitle(state.stage)}</h1><p class="menu-subtitle">${copy.stageLabel} ${state.stage} · ${stageGoal(state.stage)}</p><div class="menu-options">${button('continue', copy.keepPlaying, 'play', 'secondary')}${button('stages', copy.stages, 'squares-four', 'secondary')}${button('restart', copy.restart, 'arrow-counter-clockwise', 'secondary')}${button('guide', copy.howToPlay, 'question', 'secondary')}${button('settings', copy.settings, 'gear', 'secondary')}${button('hide', copy.hide, 'eye-slash', 'secondary')}${button('home', copy.home, 'door-open', 'secondary')}</div>`;
  else if (overlay === 'settings')
    body = `<h1 id="menu-title">${copy.settings}</h1><p class="menu-subtitle">${copy.introSettings}</p><div class="layer-options"><label>${copy.reducedMotion}<input type="checkbox" data-setting="reduced" ${save.settings.reduced ? 'checked' : ''}></label>${state.stage >= 3 ? `<label>${copy.numbers}<input type="checkbox" data-setting="numbers" ${save.settings.numbers ? 'checked' : ''}></label>` : ''}<label>${copy.tipsToggle}<input type="checkbox" data-setting="tips" ${save.settings.tips ? 'checked' : ''}></label><label>${copy.settingsRegion}<select data-setting="region"><option value="eu" ${save.settings.region === 'eu' ? 'selected' : ''}>${copy.regionEurope}</option><option value="na" ${save.settings.region === 'na' ? 'selected' : ''}>${copy.regionAmerica}</option></select></label><label>${copy.clock12}<input type="checkbox" data-setting="twelve" ${save.settings.twelve ? 'checked' : ''}></label></div><p>${copy.introSaved}</p><details><summary>${copy.settingsRegion}</summary><p>${voltage('LV', save.settings.region)} · ${voltage('MV', save.settings.region)}</p></details>`;
  else if (overlay === 'restore-campaign')
    body = `<h1 id="menu-title">${copy.restoreCampaign}</h1><p>${copy.introRestore}</p><div class="menu-options">${archivedCampaigns()
      .map(
        (campaign, index) =>
          `<button class="secondary" data-restore="${index}">${copy.savedStage} ${campaign.state.stage} · ${stageTitle(campaign.state.stage)} ${icon('caret-right')}</button>`,
      )
      .join('')}</div>`;
  else if (overlay === 'new-campaign' || overlay === 'confirm-restore')
    body = `<h1 id="menu-title">${overlay === 'new-campaign' ? copy.newCampaign : copy.restoreCampaign}</h1><p>${overlay === 'new-campaign' ? copy.introNewCampaign : copy.introRestore}</p><div class="completion-actions">${button(overlay === 'new-campaign' ? 'confirm-new' : 'confirm-restore', overlay === 'new-campaign' ? copy.startOver : copy.restorePrevious, 'arrow-counter-clockwise', 'menu-primary')}${button('back', copy.back, 'caret-left', 'browse-chapters')}</div>`;
  else if (overlay === 'complete')
    body = `<p class="menu-eyebrow">${stageTitle(state.stage)}</p><h1 id="menu-title">${copy.checkGood}</h1><p class="stars">${starList()
      .map((s) => `${icon('star')} ${s}`)
      .join(
        ' · ',
      )}</p><div class="help-tools"><p>${fieldNote(state.stage)}</p></div><div class="completion-actions">${button('next', state.stage === 6 ? copy.home : copy.next, 'caret-right', 'menu-primary')}${button('overlay-close', copy.replay, 'clock-counter-clockwise', 'browse-chapters')}</div><p>${copy.helpReplay}</p>`;
  else if (overlay === 'diagnosis') {
    const d = result.firstFailure,
      solarGoal =
        state.stage === 4 &&
        !d &&
        result.metrics.gridImportKWh > starTargets[3].cleanGrid,
      component = d?.componentId ?? '',
      isTx = component.startsWith('tx:'),
      title = solarGoal
        ? copy.clean
        : d?.code === 'OVERLOAD'
          ? isTx
            ? copy.overloadTransformer
            : copy.overloadLine
          : d?.code === 'GRID_LIMIT'
            ? copy.gridLimit
            : copy.notConnected,
      object = state.nodes.find((n) => n.id === component),
      detail = solarGoal
        ? `${energy(result.metrics.gridImportKWh)} ${copy.gridImport} / ${energy(starTargets[3].cleanGrid)}`
        : d?.code === 'UNCONNECTED'
          ? `${object ? name(object) : component} · ${copy.notConnected}`
          : d?.code === 'OVERLOAD' || d?.code === 'GRID_LIMIT'
            ? `${time(d.step)} · ${diagnosticPower(d.flowKW ?? 0)} / ${power(d.capacityKW ?? 0)}`
            : copy.checkBad,
      ideas =
        state.stage === 5 &&
        lesson().includes('quick-observed') &&
        !state.nodes.some((n) => n.kind === 'batteryLong')
          ? [copy.lesson5Long]
          : solarGoal
            ? [copy.trySolar]
            : d?.code === 'UNCONNECTED'
              ? [copy.tryLine]
              : state.stage === 6
                ? [copy.tryCab, copy.tryLate]
                : state.stage === 5
                  ? [copy.tryBattery, copy.trySchedule]
                  : [copy.tryBigger, copy.trySplit];
    body = `<h1 id="menu-title">${title}</h1><p>${detail}</p><div class="help-tools">${ideas.map((idea) => `<p>${idea}</p>`).join('')}</div><div class="completion-actions">${button('fix', copy.fix, 'wrench', 'menu-primary')}</div>`;
  } else if (overlay === 'guide' || overlay === 'tips')
    body = `<h1 id="menu-title">${copy.howToPlay}</h1><p>${copy.navigationHelp}</p><div class="help-tools"><p>${copy.helpFit}</p><p>${copy.helpConnection}</p><p>${copy.helpPlacement}</p><p>${copy.helpKeys}</p>${state.stage >= 3 ? `<p>${copy.helpTiming}</p>` : ''}</div><details><summary>${copy.fieldNotes}</summary>${Object.keys(
      save.stars,
    )
      .map(Number)
      .sort()
      .map((stage) => `<h2>${stageTitle(stage)}</h2><p>${fieldNote(stage)}</p>`)
      .join(
        '',
      )}</details>${button('practice', copy.practice, 'hand-pointing', 'browse-chapters')}`;
  else if (overlay === 'hint')
    body = `<h1 id="menu-title">${copy.hint}</h1><p>${stageHints[state.stage - 1]}</p>`;
  else if (overlay === 'watch')
    body = `<h1 id="menu-title">${copy.watchFirst}</h1><div class="completion-actions">${button('run', copy.run, 'play', 'menu-primary')}</div>`;

  const previousFocus = document.activeElement as HTMLInputElement,
    focusKey = previousFocus?.dataset.setting,
    opening = !dialog.open,
    changing = dialog.dataset.view !== overlay;
  dialog.dataset.view = overlay;
  dialog.innerHTML =
    chrome +
    (utility ? `<section class="utility-view">${body}</section>` : body);
  if (!dialog.open) dialog.showModal();
  world.paused = true;
  requestAnimationFrame(() => {
    if (focusKey && !opening && !changing) {
      dialog
        .querySelector<HTMLElement>(`[data-setting="${focusKey}"]`)
        ?.focus();
    } else if (opening || changing) {
      (
        dialog.querySelector<HTMLElement>('.menu-primary') ??
        dialog.querySelector<HTMLElement>('.menu-back:not([hidden])') ??
        dialog.querySelector<HTMLElement>('.menu-close')
      )?.focus();
    }
  });
}

app.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target !== canvas) cancelGesture();
  const lineButton = target.closest<HTMLButtonElement>('[data-select-line]');
  if (lineButton) {
    selected = lineButton.dataset.selectLine;
    inspector();
    refreshWorld();
    measureLayout();
    return;
  }
  const toolButton = target.closest<HTMLButtonElement>('[data-tool]');
  if (toolButton) {
    const next = toolButton.dataset.tool as BuildTool;
    if (!toolsFor(state, lesson()).includes(next)) return;
    stopRun();
    clearPreview();
    selected = undefined;
    tool = next;
    lineStart = undefined;
    refresh();
    return;
  }
  const restoreButton = target.closest<HTMLButtonElement>('[data-restore]');
  if (restoreButton) {
    restoreIndex = Number(restoreButton.dataset.restore);
    showOverlay('confirm-restore');
    return;
  }
  const stageButton = target.closest<HTMLButtonElement>('[data-stage]');
  if (stageButton) {
    enterStage(Number(stageButton.dataset.stage));
    return;
  }
  const action =
    target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'menu') {
    showOverlay('pause');
    return;
  }
  if (action === 'close-panel') {
    menuOpen = false;
    panel = '';
    refresh();
    app
      .querySelector<HTMLElement>(`[data-action="${el('menu').dataset.panel}"]`)
      ?.focus();
    return;
  }
  if (action === 'tasks' || action === 'resources') {
    clearCandidate();
    stopRun();
    menuOpen = !(menuOpen && panel === action);
    panel = action;
    refresh();
    return;
  }
  if (
    [
      'stages',
      'settings',
      'guide',
      'tips',
      'home',
      'hint',
      'new-campaign',
      'restore-campaign',
    ].includes(action)
  ) {
    showOverlay(action);
    return;
  }
  if (action === 'overlay-close' || action === 'continue' || action === 'fix') {
    closeOverlay();
    return;
  }
  if (action === 'back') {
    backOverlay();
    return;
  }
  if (action === 'practice') {
    closeOverlay();
    coachStep = 0;
    coachBegan = performance.now();
    panTotal = 0;
    refresh();
    return;
  }
  if (action === 'coach-skip') {
    coachStep = -1;
    save.coachSeen = true;
    persist();
    coach();
    return;
  }

  if (action === 'confirm-new' || action === 'confirm-restore') {
    const next =
      action === 'confirm-new'
        ? startNewCampaign(save)
        : restoreCampaign(save, localStorage, restoreIndex);
    if (!next) {
      el('save-status').hidden = false;
      return;
    }
    clearStageInteraction();
    introStarted = false;
    coachStep = -1;
    save = next;
    state = save.state;
    result = simulate(state);
    cursor = stageFocus[state.stage - 1];
    campaignExists = true;
    menuHistory.length = 0;
    overlay = 'home';
    fitRequested = true;
    refresh();
    return;
  }
  if (action === 'retry-save') {
    persist();
    return;
  }

  if (action === 'next') {
    nextStage();
    return;
  }
  if (action === 'run') {
    startRun();
    return;
  }
  if (action === 'check') {
    finishCheck();
    return;
  }
  if (action === 'speed') {
    speed = speed === 1 ? 3 : 1;
    timeline();
    return;
  }
  if (action === 'expand' && state.stage >= 3) {
    expanded = !expanded;
    timeline();
    return;
  }
  if (action === 'more-tools') {
    showEarlierTools = !showEarlierTools;
    tray();
    el('tray').scrollLeft = 0;
    measureLayout();
    return;
  }
  if (action === 'undo') {
    clearPreview();
    lineStart = undefined;
    const previous = undo.pop();
    if (previous) setState(previous, false);
    return;
  }
  if (action === 'restart') {
    const entry = save.entries[state.stage];
    if (entry) {
      clearStageInteraction();
      setState(structuredClone(entry));
      closeOverlay();
    }
    return;
  }
  if (action === 'hide') {
    hidden = !hidden;
    app.classList.toggle('hidden-ui', hidden);
    if (dialog.open) closeOverlay();
    refresh();
    return;
  }
  if (action === 'fit') {
    world.fit();
    advanceCoach('fit');
    return;
  }
  if (action === 'zoomIn' || action === 'zoomOut') {
    world.scale(action === 'zoomIn' ? 1.15 : 0.87);
    advanceCoach('zoom');
    return;
  }

  if (action === 'close-inspector') {
    selected = undefined;
    inspector();
    refreshWorld();
    measureLayout();
    return;
  }
  if (action === 'upgrade' && selected) {
    commit({ type: 'upgrade', id: selected });
    return;
  }
  if (action === 'remove' && selected) {
    preview({ type: 'remove', id: selected });
    return;
  }
  if (
    action === 'move' &&
    selected &&
    movable(state.nodes.find((n) => n.id === selected)!)
  ) {
    tool = 'move';
    clearPreview();
    refresh();
    return;
  }
  if (action === 'confirm' && pending) {
    commit(pending);
    return;
  }
  if (action === 'cancel') {
    clearPreview();
    tool = 'select';
    lineStart = undefined;
    selected = undefined;
    refresh();
    return;
  }
  if (action === 'preview-coords') {
    const x = Number((el('place-x') as HTMLInputElement).value),
      z = Number((el('place-z') as HTMLInputElement).value),
      kind =
        tool === 'transformerS' || tool === 'transformerL'
          ? 'transformer'
          : (tool as Node['kind']);
    preview(
      tool === 'move'
        ? { type: 'move', id: selected!, x, z }
        : {
            type: 'place',
            kind,
            x,
            z,
            size: tool === 'transformerL' ? 'L' : 'S',
          },
    );
    return;
  }
  if (action === 'preview-line') {
    const a = (el('line-a') as HTMLSelectElement).value,
      b = (el('line-b') as HTMLSelectElement).value;
    lineStart = a;
    if (a && b) preview({ type: 'connect', a, b, tier: tool as 'LV' | 'MV' });
    return;
  }
});

app.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  if (
    (input.id === 'scrub' || input.id === 'phone-scrub') &&
    state.stage >= 3
  ) {
    stopRun();
    cursor = Number(input.value);
    refreshWorld();
    refreshTimelineTime();
    inspector();
  } else if (input.dataset.lane) {
    const label = input.parentElement?.querySelector('span');
    if (label)
      label.textContent = time(
        Number(input.value) < 96
          ? Number(input.value)
          : Number(input.value) - 96,
      );
  }
});

app.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === 'scrub' || input.id === 'phone-scrub') {
    timeline();
    return;
  }
  if (input.dataset.setting) {
    const key = input.dataset.setting as keyof Save['settings'];
    (save.settings as unknown as Record<string, unknown>)[key] =
      input.type === 'checkbox' ? input.checked : input.value;
    persist();
    refresh();
    return;
  }
  if (input.dataset.ev) {
    commit({ type: 'ev', id: input.dataset.ev, start: Number(input.value) });
    return;
  }
  if (input.dataset.lane) {
    const id = input.dataset.lane,
      n = state.nodes.find((x) => x.id === id)!;
    if (n.kind === 'ev') commit({ type: 'ev', id, start: Number(input.value) });
    else {
      const old = state.batteries[id],
        start = Number(input.value),
        length = old.discharge[1] - old.discharge[0];
      commit({
        type: 'battery',
        id,
        schedule: { ...old, discharge: [start, Math.min(96, start + length)] },
      });
    }
    return;
  }
  if (input.dataset.battery) {
    const id = input.dataset.battery,
      s = structuredClone(state.batteries[id]),
      value = Number(input.value);
    if (input.dataset.slot === 'c0') s.charge[0] = value;
    if (input.dataset.slot === 'c1') s.charge[1] = value;
    if (input.dataset.slot === 'd0') s.discharge[0] = value;
    if (input.dataset.slot === 'd1') s.discharge[1] = value;
    commit({ type: 'battery', id, schedule: s });
  }
});

const gesture = new MapGesture();
let spaceHeld = false,
  spaceDragged = false,
  spaceTarget: HTMLElement | undefined,
  grabOrigin:
    | { node: { x: number; z: number }; point: { x: number; z: number } }
    | undefined;
const canvas = el('world') as HTMLCanvasElement;
function candidateTile(x: number, y: number) {
  const point = world.groundPoint(x, y);
  return grabOrigin && point
    ? draggedTile(grabOrigin.node, grabOrigin.point, point)
    : world.tile(x, y);
}
function cancelGesture() {
  grabOrigin = undefined;
  const ids = [...gesture.points.keys()];
  gesture.cancel();
  for (const id of ids)
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  canvas.dataset.cursor = 'grab';
  clearCandidate();
}
function insideMap(x: number, y: number) {
  return document.elementFromPoint(x, y) === canvas;
}
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  if (overlay || menuOpen) return;
  canvas.focus({ preventScroll: true });
  const tier = !hidden && (tool === 'LV' || tool === 'MV') ? tool : undefined,
    nodeId = hidden
      ? undefined
      : tier
        ? world.pickPort(e.clientX, e.clientY, tier, e.pointerType === 'touch')
        : world.pick(e.clientX, e.clientY),
    node = state.nodes.find((n) => n.id === nodeId),
    intent = hidden
      ? 'pan'
      : pointerIntent(
          tool,
          node ? (movable(node) ? 'movable' : 'fixed') : undefined,
          { button: e.button, space: spaceHeld, shift: e.shiftKey, running },
        );
  const ground = world.groundPoint(e.clientX, e.clientY);
  grabOrigin =
    intent === 'move' && tool === 'select' && node && ground
      ? { node: { x: node.x, z: node.z }, point: ground }
      : undefined;
  const hadPreview = !!previewState;
  canvas.setPointerCapture(e.pointerId);
  gesture.begin(e.pointerId, { x: e.clientX, y: e.clientY }, intent, nodeId);
  if (spaceHeld) spaceDragged = true;
  if (gesture.navigation) {
    if (!hidden) {
      clearPreview();
      lineStart = undefined;
      refresh();
    }
    return;
  }
  if (intent === 'pan') {
    clearCandidate();
    canvas.dataset.cursor = 'grabbing';
    return;
  }
  if (intent === 'connect' && node && !lineStart && supportsTier(node, tier!)) {
    clearPreview();
    lineStart = node.id;
    refreshPlacement();
    context();
  } else if (intent === 'place' || intent === 'move') {
    clearPreview();
    if (hadPreview) {
      refreshWorld();
      goal();
      timeline();
      refreshPlacement();
    }
  }
  hover(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (overlay || menuOpen) return;
  if (!gesture.points.has(e.pointerId)) {
    if (e.pointerType !== 'touch') hover(e);
    return;
  }
  if (hidden || spaceHeld || e.shiftKey) {
    gesture.navigate();
    clearCandidate();
    spaceDragged = spaceHeld || spaceDragged;
  }
  const motion = gesture.move(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!motion) return;
  if (motion.pinch) {
    world.panBetween(motion.from, motion.to);
    world.scale(motion.factor, motion.to.x, motion.to.y);
    panTotal += Math.hypot(
      motion.to.x - motion.from.x,
      motion.to.y - motion.from.y,
    );
    advanceCoach('zoom');
    canvas.dataset.cursor = 'grabbing';
    return;
  }
  const press = gesture.press!;
  if (press.intent === 'select' && press.moved) gesture.navigate();
  if (press.intent === 'pan' && press.moved) {
    world.panBetween(motion.from, motion.to);
    panTotal += Math.hypot(
      motion.to.x - motion.from.x,
      motion.to.y - motion.from.y,
    );
    advanceCoach('pan');
    canvas.dataset.cursor = 'grabbing';
    return;
  }
  if (
    press.intent === 'move' &&
    press.moved &&
    tool === 'select' &&
    press.node
  ) {
    selected = press.node;
    tool = 'move';
    refresh();
  }
  if (
    press.intent === 'connect' &&
    press.moved &&
    press.node &&
    lineStart !== press.node
  ) {
    lineStart = press.node;
    clearCandidate();
    refreshPlacement();
    context();
  }
  if (
    press.intent === 'place' ||
    press.intent === 'connect' ||
    (press.intent === 'move' && press.moved)
  ) {
    hover(e);
    canvas.dataset.cursor = press.intent === 'move' ? 'grabbing' : 'crosshair';
  }
});
canvas.addEventListener('pointerup', (e) => {
  const tile = candidateTile(e.clientX, e.clientY),
    press = gesture.end(e.pointerId, insideMap(e.clientX, e.clientY));
  grabOrigin = undefined;
  if (canvas.hasPointerCapture(e.pointerId))
    canvas.releasePointerCapture(e.pointerId);
  canvas.dataset.cursor = 'grab';
  if (!press || !mapUIVisible() || running) {
    clearCandidate();
    return;
  }
  if (press.intent === 'pan') {
    clearCandidate();
    return;
  }
  if (
    press.intent === 'select' ||
    (press.intent === 'move' && !press.moved && tool === 'select')
  ) {
    selected = press.node;
    clearCandidate();
    refresh();
    return;
  }
  if (press.intent === 'connect') {
    const tier = tool as 'LV' | 'MV',
      at = world.pickPort(
        e.clientX,
        e.clientY,
        tier,
        e.pointerType === 'touch',
      ),
      node = state.nodes.find((n) => n.id === at);
    if (node && lineStart && lineStart !== at)
      preview({ type: 'connect', a: lineStart, b: at!, tier });
    else if (node && !lineStart && supportsTier(node, tier)) {
      lineStart = at;
      clearCandidate();
      refreshPlacement();
      context();
    } else if (!node) {
      lineStart = undefined;
      clearCandidate();
      refreshPlacement();
      context();
    }
    return;
  }
  if (tile) preview(placementCommand(tile.x, tile.z));
});
canvas.addEventListener('pointercancel', () => {
  cancelGesture();
  if (!hidden) {
    clearPreview();
    lineStart = undefined;
  }
  refresh();
});
canvas.addEventListener('lostpointercapture', (e) => {
  if (gesture.points.has(e.pointerId)) {
    cancelGesture();
    if (!hidden) {
      clearPreview();
      lineStart = undefined;
    }
    refresh();
  }
});
canvas.addEventListener('pointerleave', () => {
  if (!gesture.points.size) clearCandidate();
});
canvas.addEventListener(
  'wheel',
  (e) => {
    if (overlay || menuOpen) return;
    e.preventDefault();
    world.wheel(e.deltaY, e.deltaMode, e.clientX, e.clientY);
    advanceCoach('zoom');
    hover(e);
  },
  { passive: false },
);
app.addEventListener(
  'pointerdown',
  (e) => {
    if (e.target !== canvas && gesture.points.size) {
      cancelGesture();
      if (!hidden) {
        clearPreview();
        lineStart = undefined;
      }
      refresh();
    }
  },
  true,
);
const keyAction: Record<string, string> = {
  Escape: 'cancel',
  Digit0: 'fit',
  Equal: 'zoomIn',
  Minus: 'zoomOut',
  BracketLeft: 'back',
  BracketRight: 'forward',
  ArrowLeft: 'panLeft',
  ArrowRight: 'panRight',
  ArrowUp: 'panUp',
  ArrowDown: 'panDown',
  KeyA: 'panLeft',
  KeyD: 'panRight',
  KeyW: 'panUp',
  KeyS: 'panDown',
};

addEventListener('keydown', (e) => {
  if (overlay) return;
  if (menuOpen) {
    if (e.code === 'Escape') {
      e.preventDefault();
      const action = panel;
      menuOpen = false;
      panel = '';
      refresh();
      app.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
    }
    return;
  }
  const t = e.target as HTMLElement;
  if (
    e.code === 'Space' &&
    !['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)
  ) {
    e.preventDefault();
    if (!spaceHeld) {
      spaceHeld = true;
      spaceTarget = ['BUTTON', 'SUMMARY'].includes(t.tagName) ? t : undefined;
      spaceDragged = !!gesture.points.size;
      if (gesture.points.size) {
        gesture.navigate();
        clearCandidate();
      }
    }
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUMMARY'].includes(t.tagName))
    return;
  if (e.code === 'Enter' && pending) {
    e.preventDefault();
    if (!hidden) commit(pending);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (hidden) return;
    const previous = undo.pop();
    if (previous) setState(previous, false);
    return;
  }
  const action = keyAction[e.code] ?? keyAction[e.key];
  if (!action) return;
  e.preventDefault();
  if (action === 'cancel') {
    cancelGesture();
    if (!hidden) lineStart = undefined;
    if (hidden) {
      hidden = false;
      app.classList.remove('hidden-ui');
    } else if (tool === 'select' && !selected) {
      showOverlay('pause');
      return;
    } else {
      tool = 'select';
      clearPreview();
      selected = undefined;
    }
    refresh();
  } else if (action === 'fit') {
    world.fit();
    advanceCoach('fit');
  } else if (action === 'zoomIn' || action === 'zoomOut') {
    world.scale(action === 'zoomIn' ? 1.15 : 0.87);
    advanceCoach('zoom');
  } else if (action === 'back' || action === 'forward') {
    if (hidden || state.stage < 3) return;
    stopRun();
    cursor = Math.max(0, Math.min(95, cursor + (action === 'back' ? -1 : 1)));
    refresh();
  } else {
    const command = pending ?? candidate;
    if (
      !hidden &&
      command &&
      (command.type === 'place' || command.type === 'move') &&
      e.code.startsWith('Arrow')
    ) {
      preview({
        ...command,
        x:
          command.x +
          (action === 'panLeft' ? -1 : action === 'panRight' ? 1 : 0),
        z: command.z + (action === 'panUp' ? -1 : action === 'panDown' ? 1 : 0),
      });
      return;
    }
    world.pan(
      action === 'panLeft' ? -20 : action === 'panRight' ? 20 : 0,
      action === 'panUp' ? -20 : action === 'panDown' ? 20 : 0,
    );
    panTotal += 20;
    advanceCoach('pan');
  }
});

addEventListener('keyup', (e) => {
  if (e.code === 'Space' && spaceHeld) {
    e.preventDefault();
    spaceHeld = false;
    if (!spaceDragged && !gesture.points.size && !overlay && !menuOpen) {
      if (spaceTarget?.isConnected) spaceTarget.click();
      else if (!hidden) startRun();
    }
    spaceTarget = undefined;
  }
});

dialog.addEventListener('cancel', (e) => {
  e.preventDefault();
  backOverlay();
});

addEventListener('blur', () => {
  spaceHeld = false;
  cancelGesture();
  clearPreview();
  lineStart = undefined;
  stopRun();
  refresh();
});

addEventListener('resize', measureLayout);
const layoutObserver = new ResizeObserver(measureLayout);
for (const id of ['bottom-area', 'goal', 'camera-buttons', 'map-context'])
  layoutObserver.observe(el(id));

world.onViewChange = () => labels();

refresh();

requestAnimationFrame(() => {
  let layout = initialState();
  for (let stage = 1; stage <= 6; stage++) {
    if (stage > 1) layout = addGrowth(layout, stage);
    const shown = save.states[stage] ?? layout;
    covers.set(stage, world.cover(shown, simulate(shown)));
  }
  refreshWorld();
  fitRequested = true;
  refreshOverlay();
  measureLayout();
});
