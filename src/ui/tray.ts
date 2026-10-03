import { patch } from '../ui/dom';

import type { Node } from '../game/types';
import { apply, buildCost } from '../game/commands';

import { toolsFor, focusTools } from '../game/progression';

import { copy, power } from '../content/copy/en';
import type { Session, Tool } from '../game/session';

import {
  helpers,
  icon,
  coinValue,
  button,
  toolInfo,
  type GameView,
} from '../ui/common';

export function createTray(session: Session, view: GameView) {
  const { lesson, mapUIVisible, name } = helpers(session);
  const { app, world, el } = view;
  function tray() {
    const available = toolsFor(session.state, lesson()),
      focused = focusTools(session.state, lesson()),
      visible = session.showEarlierTools
        ? available
        : focused.filter((t) => available.includes(t));
    patch(
      el('tray'),
      visible
        .map((t) => {
          const [title, glyph, cost] = toolInfo[t];
          return `<button class="tool ${session.tool === t ? 'active' : ''}" data-tool="${t}" aria-pressed="${session.tool === t}" title="${title}"><span class="tool-art">${icon(glyph)}</span><span class="tool-name">${title}${t === 'transformerS' || t === 'transformerL' ? `<small>${power(t === 'transformerS' ? 25 : 50)}</small>` : ''}</span><span class="tool-cost">${coinValue(cost, t === 'LV' || t === 'MV' ? copy.perTile : '')}</span></button>`;
        })
        .join('') +
        (available.some((t) => !focused.includes(t))
          ? `<button class="tool more-tools" data-action="more-tools" aria-label="${session.showEarlierTools ? copy.fewerTools : copy.moreTools}" title="${session.showEarlierTools ? copy.fewerTools : copy.moreTools}" aria-expanded="${session.showEarlierTools}"><span class="tool-art">${icon(session.showEarlierTools ? 'x' : 'dots-three')}</span><span class="tool-name">${session.showEarlierTools ? copy.fewerTools : copy.moreTools}</span></button>`
          : ''),
    );
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
      visible =
        mapUIVisible() &&
        !session.running &&
        (session.tool !== 'select' || !!session.pending);
    bar.hidden = !visible;
    app.classList.toggle(
      'placing',
      !session.running &&
        (!!session.pending ||
          (session.tool !== 'select' &&
            session.tool !== 'LV' &&
            session.tool !== 'MV')),
    );
    updateLineConfirm();
    if (!visible) return;
    let inputs = '';
    const placeTool = [
      'transformerS',
      'transformerL',
      'solar',
      'batteryQuick',
      'batteryLong',
      'move',
    ].includes(session.tool);
    if (placeTool) {
      const p =
        session.pending && 'x' in session.pending ? session.pending : undefined;
      inputs = `<div class="coordinate-inputs"><label>${copy.x}<input id="place-x" type="number" min="1" max="23" step="1" value="${p?.x ?? (session.tool === 'move' ? session.state.nodes.find((n) => n.id === session.selected)?.x : session.state.stage === 2 ? 18 : session.state.stage === 5 ? 15 : 16)}"></label><label>${copy.z}<input id="place-z" type="number" min="2" max="17" step="1" value="${p?.z ?? (session.tool === 'move' ? session.state.nodes.find((n) => n.id === session.selected)?.z : session.state.stage === 5 ? 15 : 9)}"></label>${button('preview-coords', copy.preview, 'map-pin', 'secondary small')}</div>`;
    }

    if (session.tool === 'LV' || session.tool === 'MV') {
      const p =
        session.pending?.type === 'connect' ? session.pending : undefined;
      const nodes = session.state.nodes.filter((n) => n.kind !== 'site');
      inputs = `<div class="coordinate-inputs"><label>${copy.from}<select id="line-a">${options(nodes, p?.a ?? session.lineStart)}</select></label><label>${copy.to}<select id="line-b">${options(nodes, p?.b)}</select></label>${button('preview-line', copy.preview, 'plugs-connected', 'secondary small')}</div>`;
    }

    const title =
        session.pending?.type === 'remove'
          ? copy.remove
          : session.pending?.type === 'move'
            ? copy.move
            : session.pending?.type === 'place'
              ? toolInfo[
                  session.pending.kind === 'transformer'
                    ? session.pending.size === 'L'
                      ? 'transformerL'
                      : 'transformerS'
                    : (session.pending.kind as Tool)
                ][0]
              : toolInfo[session.tool][0],
      action =
        session.pending?.type === 'connect'
          ? copy.connect
          : session.pending?.type === 'remove'
            ? copy.remove
            : session.pending?.type === 'move'
              ? copy.move
              : copy.place;
    const cost =
        session.pending && !session.pendingError
          ? buildCost(apply(session.state, session.pending, lesson()).state) -
            buildCost(session.state)
          : 0,
      detail = session.pending
        ? session.pendingError || copy.ready
        : placeTool
          ? copy.helpPlacement
          : session.lineStart
            ? `${copy.helpLineEnd} ${name(session.state.nodes.find((n) => n.id === session.lineStart)!)}`
            : copy.helpConnection;

    patch(
      bar,
      `<div class="placement-heading"><h2>${title}</h2>${button('cancel', copy.cancel, 'x')}</div><div class="placement-summary"><p class="placement-detail ${session.pendingError ? 'error' : ''}" role="status">${session.pending ? icon(session.pendingError ? 'x' : 'check-circle') : ''}<span>${detail}</span></p>${session.pending && !session.pendingError ? `<span class="placement-cost">${coinValue(Math.abs(cost), cost < 0 ? copy.refund : '')}</span>` : ''}</div>${session.pending ? `<div class="actions">${button('confirm', action, 'check-circle', 'primary')}</div>` : ''}${session.tool === 'LV' || session.tool === 'MV' ? `<div class="actions">${button('line-source', copy.changeStart, 'arrow-counter-clockwise', 'secondary small')}</div>` : ''}${inputs ? `<details><summary>${copy.keyboardBuild}</summary>${inputs}</details>` : ''}`,
    );
    (
      bar.querySelector('[data-action=confirm]') as
        | HTMLButtonElement
        | undefined
    )?.toggleAttribute('disabled', !!session.pendingError);
  }
  function updateLineConfirm() {
    const box = el('line-confirm'),
      line = session.pending?.type === 'connect' ? session.pending : undefined;
    box.hidden = !line || !mapUIVisible() || session.running;
    if (box.hidden || !line) return;
    patch(
      box,
      `<button class="primary" data-action="confirm" ${session.pendingError ? 'disabled' : ''}>${icon('check-circle')} ${copy.connect}</button><button class="icon-btn" data-action="line-source" aria-label="${copy.changeStart}" title="${copy.changeStart}">${icon('arrow-counter-clockwise')}</button>`,
    );
    const target = session.state.nodes.find((n) => n.id === line.b)!;
    const p = world.project(target.x, target.z, 1.4),
      rect = box.getBoundingClientRect();
    box.style.left = `${Math.max(8, Math.min(innerWidth - rect.width - 8, p.x + 22))}px`;
    box.style.top = `${Math.max(8, Math.min(innerHeight - rect.height - 8, p.y - rect.height - 16))}px`;
  }
  return { tray, refreshPlacement, updateLineConfirm };
}
