import { patch } from '../ui/dom';
import { scheduleTime } from '../ui/chart';

import type { State, Node } from '../game/types';
import { apply, movable, type Command } from '../game/commands';
import { stageFocus } from '../game/levels';
import {
  storeSave,
  startNewCampaign,
  restoreCampaign,
  recordCompletion,
  stageState,
  nextStageState,
  type Save,
} from '../game/save';
import {
  toolsFor,
  learnFromDay,
  canRun,
  type Tool as BuildTool,
} from '../game/progression';
import { simulate } from '../sim/simulate';

import { copy, stageGoal } from '../content/copy/en';
import type { Session } from './session';
import { updateState } from './session';
import { helpers, button, type GameView, type Actions } from '../ui/common';
import { createHud } from '../ui/hud';
import { createTray } from '../ui/tray';
import { createTimeline } from '../ui/timeline';
import { createInspector } from '../ui/inspector';
import { createOverlays } from '../ui/overlays';
import { createMapInput } from '../input/map-input';
export function createController(
  session: Session,
  view: GameView,
  keyboard: Pick<Window, 'addEventListener'> = window,
) {
  const { app, canvas, dialog, world, el } = view;
  const { time, now, lesson, mapUIVisible, goalMet } = helpers(session);
  const core = {
    stopRun,
    clearStageInteraction,
    persist,
    saveNow,
    setState,
    commit,
    nextStage,
    enterStage,
    finishCheck,
    startRun,
    runFrame,
    refreshWorld,
    refresh,
  };
  const hud = createHud(session, view, { persist });
  const { coach, advanceCoach, labels, measureLayout } = hud;
  const trayUI = createTray(session, view);
  const { tray, refreshPlacement, updateLineConfirm } = trayUI;
  const timelineUI = createTimeline(session, view, { measureLayout });
  const { timeline, refreshTimelineTime } = timelineUI;
  const inspectorUI = createInspector(session, view);
  const { inspector } = inspectorUI;
  const overlays = createOverlays(session, view, {
    refresh,
    stopRun,
    cancelGesture: () => mapInput.cancelGesture(),
    clearPreview: () => mapInput.clearPreview(),
  });
  const { closeOverlay, showOverlay, backOverlay } = overlays;
  const mapInput = createMapInput(
    session,
    view,
    { ...core, ...hud, ...trayUI, ...timelineUI, ...inspectorUI, showOverlay },
    keyboard,
  );
  const { clearCandidate, clearPreview, preview, context, cancelGesture } =
    mapInput;
  const actions: Actions = {
    ...core,
    ...hud,
    ...trayUI,
    ...timelineUI,
    ...inspectorUI,
    ...overlays,
    ...mapInput,
  };
  function stopRun() {
    session.running = false;
    session.runFraction = 0;
    app.classList.remove('running');
  }
  function clearStageInteraction() {
    cancelGesture();
    stopRun();
    clearPreview();
    session.lineStart = undefined;
    session.tool = 'select';
    session.selected = undefined;
    session.menuOpen = false;
    session.panel = '';
    session.expanded = false;
    session.showEarlierTools = false;
    session.undo.length = 0;
  }
  function persist() {
    const stored = storeSave(session.save);
    if (stored) session.campaignExists = true;
    el('save-status').hidden = stored;
    patch(
      el('save-status'),
      `${copy.saveNotice} ${button('retry-save', copy.retrySave, 'arrow-counter-clockwise', 'secondary')}`,
    );
    return stored;
  }
  function saveNow() {
    session.save.state = session.state;
    session.save.states[session.state.stage] = structuredClone(session.state);
    persist();
  }
  function setState(next: State, push = true) {
    stopRun();
    updateState(session, next, push);
    clearPreview();
    saveNow();
    refresh();
  }
  function commit(command: Command) {
    if (session.hidden) return;
    const applied = apply(session.state, command, lesson());
    if (applied.error) {
      session.pendingError = applied.error;
      refreshPlacement();
      return;
    }
    const target =
      command.type === 'connect'
        ? session.state.nodes.find((n) => n.id === command.b)
        : undefined;
    session.lineStart =
      command.type === 'connect'
        ? target?.kind === 'home' ||
          target?.kind === 'transformer' ||
          target?.kind === 'grid'
          ? command.b
          : command.a
        : undefined;
    if (command.type === 'connect') {
      session.tool = command.tier;
      session.selected = undefined;
    }
    if (command.type === 'place') {
      session.selected = applied.state.nodes.at(-1)?.id;
      session.tool = 'select';
    }
    if (command.type === 'move') session.tool = 'select';
    if (command.type === 'remove') {
      session.selected = undefined;
      session.tool = 'select';
    }
    setState(applied.state);
  }
  function nextStage() {
    if (session.state.stage === 6) {
      showOverlay('home', false);
      return;
    }
    const next = nextStageState(session.save);
    if (!next) return;
    enterStage(next.stage);
  }
  function enterStage(stage: number) {
    const next = stageState(session.save, stage);
    if (!next) return;
    clearStageInteraction();
    session.state = next;
    session.revision++;
    session.result = simulate(session.state);
    session.cursor = stageFocus[stage - 1];
    saveNow();
    session.overlay = '';
    session.menuHistory.length = 0;
    if (dialog.open) dialog.close();
    refresh();
    session.fitRequested = true;
    measureLayout();
    (el('world') as HTMLCanvasElement).focus();
  }
  function finishCheck(watched = false) {
    clearPreview();
    stopRun();
    session.save.lessons[session.state.stage] = learnFromDay(
      lesson(),
      session.state,
      session.result,
    );
    session.save.state = session.state;
    const success = recordCompletion(session.save, session.result, watched);
    saveNow();
    if (success) showOverlay('complete', false);
    else if (goalMet(session.result) && session.state.stage === 1)
      showOverlay('watch', false);
    else {
      session.cursor = session.result.firstFailure?.step ?? session.cursor;
      showOverlay('diagnosis', false);
    }
  }
  function startRun() {
    if (!canRun(session.state, lesson())) return;
    cancelGesture();
    if (session.running) {
      stopRun();
      refresh();
      return;
    }
    if (dialog.open) {
      session.overlay = '';
      session.menuHistory.length = 0;
      dialog.close();
    }
    clearPreview();
    session.menuOpen = false;
    session.panel = '';
    session.running = true;
    app.classList.add('running');
    session.cursor = 0;
    session.runFraction = 0;
    session.runLast = performance.now();
    refresh();
    requestAnimationFrame(runFrame);
  }
  function runFrame(nowMs: number) {
    if (!session.running) return;
    const delta = Math.min(0.1, (nowMs - session.runLast) / 1000);
    session.runLast = nowMs;
    session.runFraction += ((delta * 96) / 60) * session.speed;
    while (session.runFraction >= 1) {
      session.runFraction--;
      session.cursor++;
      if (
        session.result.firstFailure &&
        session.cursor >= session.result.firstFailure.step
      ) {
        session.cursor = session.result.firstFailure.step;
        finishCheck();
        return;
      }
      if (session.cursor >= 96) {
        session.cursor = 95;
        finishCheck(true);
        return;
      }
    }
    refreshWorld();
    refreshTimelineTime();
    requestAnimationFrame(runFrame);
  }
  function refreshWorld() {
    const visible = mapUIVisible();
    world.reduced = session.save.settings.reduced;
    world.paused = !!session.overlay || session.menuOpen;
    world.building = !session.running;
    world.draw(
      visible ? (session.previewState ?? session.state) : session.state,
      visible ? (session.previewResult ?? session.result) : session.result,
      session.cursor,
      visible ? session.selected : undefined,
      session.cursor + (session.running ? session.runFraction : 0),
      session.previewState && visible ? session.previewState : session.revision,
    );
    context();
    updateLineConfirm();
    (el('world') as HTMLCanvasElement).setAttribute(
      'aria-label',
      `${stageGoal(session.state.stage)}. ${session.state.nodes.filter((n) => n.kind === 'home' && now().served[n.id]).length} ${copy.house} · ${time(session.cursor)}`,
    );
    labels();
  }
  function refresh() {
    app.classList.toggle('window-open', !!session.overlay || session.menuOpen);
    app.classList.toggle('reduced-motion', session.save.settings.reduced);
    actions.header();
    actions.goal();
    actions.tray();
    actions.refreshPlacement();
    actions.inspector();
    actions.timeline();
    actions.menu();
    actions.coach();
    actions.refreshOverlay();
    actions.refreshWorld();
    actions.measureLayout();
  }
  app.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target !== canvas) cancelGesture();
    const lineButton = target.closest<HTMLButtonElement>('[data-select-line]');
    if (lineButton) {
      session.selected = lineButton.dataset.selectLine;
      inspector();
      refreshWorld();
      measureLayout();
      return;
    }
    const toolButton = target.closest<HTMLButtonElement>('[data-tool]');
    if (toolButton) {
      const next = toolButton.dataset.tool as BuildTool;
      if (!toolsFor(session.state, lesson()).includes(next)) return;
      stopRun();
      clearPreview();
      session.selected = undefined;
      session.tool = next;
      session.lineStart = undefined;
      refresh();
      return;
    }
    const restoreButton = target.closest<HTMLButtonElement>('[data-restore]');
    if (restoreButton) {
      session.restoreIndex = Number(restoreButton.dataset.restore);
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
      session.menuOpen = false;
      session.panel = '';
      refresh();
      app
        .querySelector<HTMLElement>(
          `[data-action="${el('menu').dataset.panel}"]`,
        )
        ?.focus();
      return;
    }
    if (action === 'tasks' || action === 'resources') {
      clearCandidate();
      stopRun();
      session.menuOpen = !(session.menuOpen && session.panel === action);
      session.panel = action;
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
    if (
      action === 'overlay-close' ||
      action === 'continue' ||
      action === 'fix'
    ) {
      closeOverlay();
      return;
    }
    if (action === 'back') {
      backOverlay();
      return;
    }
    if (action === 'practice') {
      closeOverlay();
      session.coachStep = 0;
      session.coachBegan = performance.now();
      session.panTotal = 0;
      refresh();
      return;
    }
    if (action === 'coach-skip') {
      session.coachStep = -1;
      session.save.coachSeen = true;
      persist();
      coach();
      return;
    }

    if (action === 'confirm-new' || action === 'confirm-restore') {
      const next =
        action === 'confirm-new'
          ? startNewCampaign(session.save)
          : restoreCampaign(session.save, localStorage, session.restoreIndex);
      if (!next) {
        el('save-status').hidden = false;
        return;
      }
      clearStageInteraction();
      session.introStarted = false;
      session.coachStep = -1;
      session.save = next;
      session.state = session.save.state;
      session.revision++;
      session.result = simulate(session.state);
      session.cursor = stageFocus[session.state.stage - 1];
      session.campaignExists = true;
      session.menuHistory.length = 0;
      session.overlay = 'home';
      session.fitRequested = true;
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
      session.speed = session.speed === 1 ? 3 : 1;
      timeline();
      return;
    }
    if (action === 'expand' && session.state.stage >= 3) {
      session.expanded = !session.expanded;
      timeline();
      return;
    }
    if (action === 'more-tools') {
      session.showEarlierTools = !session.showEarlierTools;
      tray();
      el('tray').scrollLeft = 0;
      measureLayout();
      return;
    }
    if (action === 'undo') {
      clearPreview();
      session.lineStart = undefined;
      const previous = session.undo.pop();
      if (previous) setState(previous, false);
      return;
    }
    if (action === 'restart') {
      const entry = session.save.entries[session.state.stage];
      if (entry) {
        clearStageInteraction();
        session.cursor = stageFocus[session.state.stage - 1];
        setState(structuredClone(entry));
        closeOverlay();
      }
      return;
    }
    if (action === 'hide') {
      session.hidden = !session.hidden;
      app.classList.toggle('hidden-ui', session.hidden);
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
      session.selected = undefined;
      inspector();
      refreshWorld();
      measureLayout();
      return;
    }
    if (action === 'upgrade' && session.selected) {
      commit({ type: 'upgrade', id: session.selected });
      return;
    }
    if (action === 'remove' && session.selected) {
      preview({ type: 'remove', id: session.selected });
      return;
    }
    if (
      action === 'move' &&
      session.selected &&
      movable(session.state.nodes.find((n) => n.id === session.selected)!)
    ) {
      session.tool = 'move';
      clearPreview();
      refresh();
      return;
    }
    if (action === 'line-source') {
      clearPreview();
      session.lineStart = undefined;
      refresh();
      return;
    }
    if (action === 'confirm' && session.pending) {
      commit(session.pending);
      return;
    }
    if (action === 'cancel') {
      clearPreview();
      session.tool = 'select';
      session.lineStart = undefined;
      session.selected = undefined;
      refresh();
      return;
    }
    if (action === 'preview-coords') {
      const x = Number((el('place-x') as HTMLInputElement).value),
        z = Number((el('place-z') as HTMLInputElement).value),
        kind =
          session.tool === 'transformerS' || session.tool === 'transformerL'
            ? 'transformer'
            : (session.tool as Node['kind']);
      preview(
        session.tool === 'move'
          ? { type: 'move', id: session.selected!, x, z }
          : {
              type: 'place',
              kind,
              x,
              z,
              size: session.tool === 'transformerL' ? 'L' : 'S',
            },
      );
      return;
    }
    if (action === 'preview-line') {
      const a = (el('line-a') as HTMLSelectElement).value,
        b = (el('line-b') as HTMLSelectElement).value;
      session.lineStart = a;
      if (a && b)
        preview({ type: 'connect', a, b, tier: session.tool as 'LV' | 'MV' });
      return;
    }
  });
  app.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    if (
      (input.id === 'scrub' || input.id === 'phone-scrub') &&
      session.state.stage >= 3
    ) {
      stopRun();
      session.cursor = Number(input.value);
      refreshWorld();
      refreshTimelineTime();
      inspector();
    } else if (input.dataset.lane) {
      const label = input.closest('.lane')?.querySelector('.lane-value');
      if (label)
        label.textContent = scheduleTime(
          Number(input.value),
          session.save.settings.twelve,
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
      (session.save.settings as unknown as Record<string, unknown>)[key] =
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
        n = session.state.nodes.find((x) => x.id === id)!;
      if (n.kind === 'ev')
        commit({ type: 'ev', id, start: Number(input.value) });
      else {
        const old = session.state.batteries[id],
          start = Number(input.value),
          length = old.discharge[1] - old.discharge[0];
        commit({
          type: 'battery',
          id,
          schedule: {
            ...old,
            discharge: [start, Math.min(96, start + length)],
          },
        });
      }
      return;
    }
    if (input.dataset.battery) {
      const id = input.dataset.battery,
        s = structuredClone(session.state.batteries[id]),
        value = Number(input.value);
      if (input.dataset.slot === 'c0') s.charge[0] = value;
      if (input.dataset.slot === 'c1') s.charge[1] = value;
      if (input.dataset.slot === 'd0') s.discharge[0] = value;
      if (input.dataset.slot === 'd1') s.discharge[1] = value;
      commit({ type: 'battery', id, schedule: s });
    }
  });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    backOverlay();
  });
  keyboard.addEventListener('blur', () => {
    session.spaceHeld = false;
    cancelGesture();
    clearPreview();
    session.lineStart = undefined;
    stopRun();
    refresh();
  });
  keyboard.addEventListener('resize', measureLayout);
  return actions;
}
