import { patch } from '../ui/dom';

import type { Node } from '../game/types';
import { apply, buildCost, movable, type Command } from '../game/commands';

import { supportsTier } from '../sim/network';
import { pointerIntent } from '../game/pointer';
import { draggedTile } from '../render/navigation';
import { copy } from '../content/copy/en';
import type { Session } from '../game/session';
import { clearHeldPreview, holdPreview } from '../game/session';
import {
  helpers,
  icon,
  coinValue,
  type GameView,
  type Actions,
} from '../ui/common';

export function createMapInput(
  session: Session,
  view: GameView,
  actions: Pick<
    Actions,
    | 'refreshPlacement'
    | 'goal'
    | 'refreshWorld'
    | 'timeline'
    | 'inspector'
    | 'measureLayout'
    | 'labels'
    | 'refresh'
    | 'advanceCoach'
    | 'showOverlay'
    | 'commit'
    | 'setState'
    | 'stopRun'
    | 'startRun'
  >,
  keyboard: Pick<Window, 'addEventListener'> = window,
) {
  const { lesson, mapUIVisible, name } = helpers(session);
  const { app, canvas, world, el } = view;
  function clearCandidate() {
    session.candidate = undefined;
    session.candidateKey = '';
    el('map-feedback').hidden = true;
    world.highlightPort();
    if (!session.pending) world.clearGhost();
  }
  function clearPreview() {
    clearHeldPreview(session);
    clearCandidate();
    world.clearGhost();
    el('line-confirm').hidden = true;
  }
  function commandGhost(command: Command, error: string) {
    if (!mapUIVisible() || session.running) {
      world.clearGhost();
      return;
    }
    if (command.type === 'place' || command.type === 'move') {
      const node =
        command.type === 'place'
          ? command
          : session.state.nodes.find((n) => n.id === command.id);
      if (node && Number.isFinite(command.x) && Number.isFinite(command.z))
        world.showGhost(command.x, command.z, node, !error);
      else world.clearGhost();
    }
    if (command.type === 'connect') {
      world.showLineGhost(
        session.state.nodes.find((n) => n.id === command.a),
        session.state.nodes.find((n) => n.id === command.b),
        !error,
        command.tier,
      );
      world.highlightPort(command.b, !error);
    }
  }
  function preview(command: Command) {
    if (!mapUIVisible() || session.running) return;
    clearCandidate();
    holdPreview(session, command);
    actions.refreshPlacement();
    actions.goal();
    actions.refreshWorld();
    actions.timeline();
    actions.inspector();
    commandGhost(command, session.pendingError);
    actions.measureLayout();
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
    patch(box, `${icon(glyph)} <span>${text}</span>`);
    const rect = box.getBoundingClientRect();
    box.style.left = `${Math.max(8, Math.min(innerWidth - rect.width - 8, point.clientX + 18))}px`;
    box.style.top = `${Math.max(8, Math.min(innerHeight - rect.height - 8, point.clientY + 18))}px`;
  }
  function liveCandidate(
    command: Command,
    point: { clientX: number; clientY: number },
  ) {
    const key = JSON.stringify(command);
    if (key !== session.candidateKey) {
      const applied = apply(session.state, command, lesson());
      session.candidate = command;
      session.candidateKey = key;
      session.candidateError = applied.error ?? '';
      session.candidateCost = applied.error
        ? 0
        : buildCost(applied.state) - buildCost(session.state);
      commandGhost(command, session.candidateError);
    }
    feedback(
      session.candidateError ||
        `${copy.ready} · ${coinValue(Math.abs(session.candidateCost), session.candidateCost < 0 ? copy.refund : '')}`,
      session.candidateError ? 'x' : 'check-circle',
      point,
      !session.candidateError,
    );
  }
  function placementCommand(x: number, z: number): Command {
    return session.tool === 'move'
      ? { type: 'move', id: session.selected!, x, z }
      : {
          type: 'place',
          kind:
            session.tool === 'transformerS' || session.tool === 'transformerL'
              ? 'transformer'
              : (session.tool as Node['kind']),
          x,
          z,
          size: session.tool === 'transformerL' ? 'L' : 'S',
        };
  }
  function context() {
    const visible = mapUIVisible() && !session.running,
      tier =
        visible && (session.tool === 'LV' || session.tool === 'MV')
          ? session.tool
          : undefined;
    world.showGrid(visible && session.tool !== 'select');
    if (
      session.portsState !== session.state ||
      session.portsTier !== tier ||
      session.portsSource !== session.lineStart
    ) {
      session.portsState = session.state;
      session.portsTier = tier;
      session.portsSource = session.lineStart;
      const status =
        tier && session.lineStart
          ? new Map(
              session.state.nodes.map((node) => [
                node.id,
                !apply(
                  session.state,
                  { type: 'connect', a: session.lineStart!, b: node.id, tier },
                  lesson(),
                ).error,
              ]),
            )
          : undefined;
      world.showPorts(session.state.nodes, tier, session.lineStart, status);
    }
    if (!visible) {
      el('map-feedback').hidden = true;
      el('line-confirm').hidden = true;
      world.clearGhost();
      world.highlightPort();
    } else if (session.pending)
      commandGhost(session.pending, session.pendingError);
  }
  function hover(point: {
    clientX: number;
    clientY: number;
    pointerType?: string;
  }) {
    if (!mapUIVisible() || session.running || session.pending) return;
    const tier =
        session.tool === 'LV' || session.tool === 'MV'
          ? session.tool
          : undefined,
      at = tier
        ? world.pickPort(
            point.clientX,
            point.clientY,
            tier,
            point.pointerType === 'touch',
          )
        : world.pick(point.clientX, point.clientY),
      node = session.state.nodes.find((n) => n.id === at);
    if (session.hoveredNode !== node?.id) {
      session.hoveredNode = node?.id;
      actions.labels();
    }
    canvas.dataset.cursor =
      session.tool === 'select'
        ? node
          ? movable(node)
            ? 'grab'
            : 'pointer'
          : 'grab'
        : tier
          ? 'crosshair'
          : session.tool === 'move'
            ? 'grab'
            : 'crosshair';
    if (tier) {
      if (session.lineStart) {
        if (node && node.id !== session.lineStart)
          liveCandidate(
            { type: 'connect', a: session.lineStart, b: node.id, tier },
            point,
          );
        else {
          clearCandidate();
          const end = world.groundPoint(point.clientX, point.clientY);
          world.showLineGhost(
            session.state.nodes.find((n) => n.id === session.lineStart),
            end ? { x: end.x, z: end.z } : undefined,
            false,
            tier,
          );
          feedback(
            node?.id === session.lineStart
              ? copy.helpLineEnd
              : node && !supportsTier(node, tier)
                ? copy.wrongVoltage
                : copy.helpLineEnd,
            'path',
            point,
          );
        }
      } else if (node) {
        clearCandidate();
        const valid = supportsTier(node, tier);
        world.highlightPort(node.id, valid);
        feedback(
          valid ? `${name(node)} · ${copy.helpLineStart}` : copy.wrongVoltage,
          valid ? 'path' : 'x',
          point,
          valid,
        );
      } else clearCandidate();
      return;
    }
    if (session.tool !== 'select') {
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
  function candidateTile(x: number, y: number) {
    const point = world.groundPoint(x, y);
    return session.grabOrigin && point
      ? draggedTile(session.grabOrigin.node, session.grabOrigin.point, point)
      : world.tile(x, y);
  }
  function cancelGesture() {
    session.grabOrigin = undefined;
    const ids = [...session.gesture.points.keys()];
    session.gesture.cancel();
    for (const id of ids)
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.dataset.cursor = 'grab';
    clearCandidate();
  }
  function insideMap(x: number, y: number) {
    return document.elementFromPoint(x, y) === canvas;
  }
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
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (session.overlay || session.menuOpen) return;
    canvas.focus({ preventScroll: true });
    const tier =
        !session.hidden && (session.tool === 'LV' || session.tool === 'MV')
          ? session.tool
          : undefined,
      nodeId = session.hidden
        ? undefined
        : tier
          ? world.pickPort(
              e.clientX,
              e.clientY,
              tier,
              e.pointerType === 'touch',
            )
          : world.pick(e.clientX, e.clientY),
      node = session.state.nodes.find((n) => n.id === nodeId),
      intent = session.hidden
        ? 'pan'
        : pointerIntent(
            session.tool,
            node ? (movable(node) ? 'movable' : 'fixed') : undefined,
            {
              button: e.button,
              space: session.spaceHeld,
              shift: e.shiftKey,
              running: session.running,
            },
          );
    const ground = world.groundPoint(e.clientX, e.clientY);
    session.grabOrigin =
      intent === 'move' && session.tool === 'select' && node && ground
        ? { node: { x: node.x, z: node.z }, point: ground }
        : undefined;
    const hadPreview = !!session.previewState;
    canvas.setPointerCapture(e.pointerId);
    session.gesture.begin(
      e.pointerId,
      { x: e.clientX, y: e.clientY },
      intent,
      nodeId,
    );
    if (session.spaceHeld) session.spaceDragged = true;
    if (session.gesture.navigation) {
      if (!session.hidden) {
        clearPreview();
        session.lineStart = undefined;
        actions.refresh();
      }
      return;
    }
    if (intent === 'pan') {
      clearCandidate();
      canvas.dataset.cursor = 'grabbing';
      return;
    }
    if (
      intent === 'connect' &&
      node &&
      !session.lineStart &&
      supportsTier(node, tier!)
    ) {
      clearPreview();
      session.lineStart = node.id;
      actions.refreshPlacement();
      context();
    } else if (intent === 'place' || intent === 'move') {
      clearPreview();
      if (hadPreview) {
        actions.refreshWorld();
        actions.goal();
        actions.timeline();
        actions.refreshPlacement();
      }
    }
    hover(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (session.overlay || session.menuOpen) return;
    if (!session.gesture.points.has(e.pointerId)) {
      if (e.pointerType !== 'touch') hover(e);
      return;
    }
    if (session.hidden || session.spaceHeld || e.shiftKey) {
      session.gesture.navigate();
      clearCandidate();
      session.spaceDragged = session.spaceHeld || session.spaceDragged;
    }
    const motion = session.gesture.move(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    if (!motion) return;
    if (motion.pinch) {
      world.panBetween(motion.from, motion.to);
      world.scale(motion.factor, motion.to.x, motion.to.y);
      session.panTotal += Math.hypot(
        motion.to.x - motion.from.x,
        motion.to.y - motion.from.y,
      );
      actions.advanceCoach('zoom');
      canvas.dataset.cursor = 'grabbing';
      return;
    }
    const press = session.gesture.press!;
    if (press.intent === 'select' && press.moved) session.gesture.navigate();
    if (press.intent === 'pan' && press.moved) {
      world.panBetween(motion.from, motion.to);
      session.panTotal += Math.hypot(
        motion.to.x - motion.from.x,
        motion.to.y - motion.from.y,
      );
      actions.advanceCoach('pan');
      canvas.dataset.cursor = 'grabbing';
      return;
    }
    if (
      press.intent === 'move' &&
      press.moved &&
      session.tool === 'select' &&
      press.node
    ) {
      session.selected = press.node;
      session.tool = 'move';
      actions.refresh();
    }
    if (
      press.intent === 'connect' &&
      press.moved &&
      press.node &&
      session.lineStart !== press.node
    ) {
      session.lineStart = press.node;
      clearCandidate();
      actions.refreshPlacement();
      context();
    }
    if (
      press.intent === 'place' ||
      press.intent === 'connect' ||
      (press.intent === 'move' && press.moved)
    ) {
      hover(e);
      canvas.dataset.cursor =
        press.intent === 'move' ? 'grabbing' : 'crosshair';
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    const tile = candidateTile(e.clientX, e.clientY),
      press = session.gesture.end(e.pointerId, insideMap(e.clientX, e.clientY));
    session.grabOrigin = undefined;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    canvas.dataset.cursor = 'grab';
    if (!press || !mapUIVisible() || session.running) {
      clearCandidate();
      return;
    }
    if (press.intent === 'pan') {
      if (e.button === 2 && !press.moved) {
        clearPreview();
        session.lineStart = undefined;
        session.tool = 'select';
        session.selected = undefined;
        actions.refresh();
      }
      clearCandidate();
      return;
    }
    if (
      press.intent === 'select' ||
      (press.intent === 'move' && !press.moved && session.tool === 'select')
    ) {
      session.selected = press.node;
      clearCandidate();
      actions.refresh();
      return;
    }
    if (press.intent === 'connect') {
      const tier = session.tool as 'LV' | 'MV',
        at = world.pickPort(
          e.clientX,
          e.clientY,
          tier,
          e.pointerType === 'touch',
        ),
        node = session.state.nodes.find((n) => n.id === at);
      if (node && session.lineStart && session.lineStart !== at)
        preview({ type: 'connect', a: session.lineStart, b: at!, tier });
      else if (node && !session.lineStart && supportsTier(node, tier)) {
        session.lineStart = at;
        clearCandidate();
        actions.refreshPlacement();
        context();
      } else if (!node) {
        session.lineStart = undefined;
        clearCandidate();
        actions.refreshPlacement();
        context();
      }
      return;
    }
    if (tile) preview(placementCommand(tile.x, tile.z));
  });
  canvas.addEventListener('pointercancel', () => {
    cancelGesture();
    if (!session.hidden) {
      clearPreview();
      session.lineStart = undefined;
    }
    actions.refresh();
  });
  canvas.addEventListener('lostpointercapture', (e) => {
    if (session.gesture.points.has(e.pointerId)) {
      cancelGesture();
      if (!session.hidden) {
        clearPreview();
        session.lineStart = undefined;
      }
      actions.refresh();
    }
  });
  canvas.addEventListener('pointerleave', () => {
    session.hoveredNode = undefined;
    actions.labels();
    if (!session.gesture.points.size) clearCandidate();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (session.overlay || session.menuOpen) return;
      e.preventDefault();
      world.wheel(e.deltaY, e.deltaMode, e.clientX, e.clientY);
      actions.advanceCoach('zoom');
      hover(e);
    },
    { passive: false },
  );
  app.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target !== canvas && session.gesture.points.size) {
        cancelGesture();
        if (!session.hidden) {
          clearPreview();
          session.lineStart = undefined;
        }
        actions.refresh();
      }
    },
    true,
  );
  keyboard.addEventListener('keydown', (e) => {
    if (session.overlay) return;
    if (session.menuOpen) {
      if (e.code === 'Escape') {
        e.preventDefault();
        const action = session.panel;
        session.menuOpen = false;
        session.panel = '';
        actions.refresh();
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
      if (!session.spaceHeld) {
        session.spaceHeld = true;
        session.spaceTarget = ['BUTTON', 'SUMMARY'].includes(t.tagName)
          ? t
          : undefined;
        session.spaceDragged = !!session.gesture.points.size;
        if (session.gesture.points.size) {
          session.gesture.navigate();
          clearCandidate();
        }
      }
      return;
    }
    if (e.code === 'Escape' && !session.hidden) {
      cancelGesture();
      session.lineStart = undefined;
      if (session.tool === 'select' && !session.selected && !session.pending) {
        actions.showOverlay('pause');
        return;
      }
      session.tool = 'select';
      clearPreview();
      session.selected = undefined;
      actions.refresh();
      return;
    }
    if (
      ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'SUMMARY'].includes(t.tagName)
    )
      return;
    if (e.code === 'Enter' && session.pending) {
      e.preventDefault();
      if (!session.hidden) actions.commit(session.pending);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (session.hidden) return;
      const previous = session.undo.pop();
      if (previous) actions.setState(previous, false);
      return;
    }
    const action = keyAction[e.code] ?? keyAction[e.key];
    if (!action) return;
    e.preventDefault();
    if (action === 'cancel') {
      cancelGesture();
      if (!session.hidden) session.lineStart = undefined;
      if (session.hidden) {
        session.hidden = false;
        app.classList.remove('hidden-ui');
      } else if (session.tool === 'select' && !session.selected) {
        actions.showOverlay('pause');
        return;
      } else {
        session.tool = 'select';
        clearPreview();
        session.selected = undefined;
      }
      actions.refresh();
    } else if (action === 'fit') {
      world.fit();
      actions.advanceCoach('fit');
    } else if (action === 'zoomIn' || action === 'zoomOut') {
      world.scale(action === 'zoomIn' ? 1.15 : 0.87);
      actions.advanceCoach('zoom');
    } else if (action === 'back' || action === 'forward') {
      if (session.hidden || session.state.stage < 3) return;
      actions.stopRun();
      session.cursor = Math.max(
        0,
        Math.min(95, session.cursor + (action === 'back' ? -1 : 1)),
      );
      actions.refresh();
    } else {
      const command = session.pending ?? session.candidate;
      if (
        !session.hidden &&
        command &&
        (command.type === 'place' || command.type === 'move') &&
        e.code.startsWith('Arrow')
      ) {
        preview({
          ...command,
          x:
            command.x +
            (action === 'panLeft' ? -1 : action === 'panRight' ? 1 : 0),
          z:
            command.z +
            (action === 'panUp' ? -1 : action === 'panDown' ? 1 : 0),
        });
        return;
      }
      world.pan(
        action === 'panLeft' ? -20 : action === 'panRight' ? 20 : 0,
        action === 'panUp' ? -20 : action === 'panDown' ? 20 : 0,
      );
      session.panTotal += 20;
      actions.advanceCoach('pan');
    }
  });
  keyboard.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && session.spaceHeld) {
      e.preventDefault();
      session.spaceHeld = false;
      if (
        !session.spaceDragged &&
        !session.gesture.points.size &&
        !session.overlay &&
        !session.menuOpen
      ) {
        if (session.spaceTarget?.isConnected) session.spaceTarget.click();
        else if (!session.hidden) actions.startRun();
      }
      session.spaceTarget = undefined;
    }
  });
  return {
    clearCandidate,
    clearPreview,
    commandGhost,
    preview,
    context,
    hover,
    cancelGesture,
  };
}
