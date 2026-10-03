import { patch } from '../ui/dom';

import { buildCost } from '../game/commands';
import { budgets } from '../game/levels';

import { focusTools } from '../game/progression';

import { copy, stageGoal, stageTitle, power } from '../content/copy/en';
import type { Session } from '../game/session';

import {
  helpers,
  icon,
  coinValue,
  button,
  type GameView,
  type Actions,
} from '../ui/common';

export function createHud(
  session: Session,
  view: GameView,
  actions: Pick<Actions, 'persist'>,
) {
  const { lesson, mapUIVisible, name, goalMet, starList } = helpers(session);
  const { app, world, el } = view;
  function header() {
    patch(
      el('left-head'),
      button('menu', copy.menu, 'list') +
        `<button class="icon-btn" data-action="tasks" aria-label="${copy.tasks}" aria-expanded="${session.menuOpen && session.panel === 'tasks'}" aria-controls="menu">${icon('list-checks')}<small id="task-count">${goalMet() ? 1 : 0}/1</small></button>` +
        (session.hidden ? button('hide', copy.show, 'eye') : ''),
    );
    patch(
      el('camera-buttons'),
      button('zoomOut', copy.zoomOut, 'minus') +
        button('fit', copy.fitView, 'corners-out') +
        button('zoomIn', copy.zoomIn, 'plus'),
    );
    patch(el('undo-button'), icon('arrow-u-up-left'));
    (el('undo-button') as HTMLButtonElement).disabled = !session.undo.length;
    app.classList.toggle('has-undo', !!session.undo.length);
  }
  function teaching() {
    const l = lesson();
    if (session.state.stage === 1)
      return goalMet(session.result) ? copy.lesson1Run : copy.lesson1Connect;
    if (session.state.stage === 2) {
      const focused = focusTools(session.state, l)[0];
      return focused === 'transformerS'
        ? copy.lesson2Place
        : focused === 'MV'
          ? copy.lesson2MV
          : copy.lesson2LV;
    }
    if (session.state.stage === 3) return copy.lesson3;
    if (session.state.stage === 4) return copy.lesson4;
    if (session.state.stage === 5)
      return !session.state.nodes.some((n) => n.kind === 'batteryQuick')
        ? copy.lesson5Quick
        : !l.includes('quick-observed')
          ? copy.lesson5Connect
          : session.state.nodes.some((n) => n.kind === 'batteryLong')
            ? copy.lesson5Together
            : copy.lesson5Long;
    return copy.lesson6;
  }
  function goal() {
    patch(
      el('goal'),
      `<h1>${stageTitle(session.state.stage)}</h1><p>${copy.stageLabel} ${session.state.stage} · ${stageGoal(session.state.stage)}</p>${session.save.settings.tips && !session.running ? `<p class="teaching" role="status">${teaching()}</p>` : ''}`,
    );
    patch(
      el('coins'),
      `<button data-action="resources" aria-label="${copy.resources}: ${copy.coinsLeft} ${budgets[session.state.stage - 1] - buildCost(session.previewState ?? session.state)} / ${budgets[session.state.stage - 1]}" aria-expanded="${session.menuOpen && session.panel === 'resources'}" aria-controls="menu">${coinValue(`${budgets[session.state.stage - 1] - buildCost(session.previewState ?? session.state)} / ${budgets[session.state.stage - 1]}`)}<span class="star-value">${icon('star')} ${session.save.stars[session.state.stage]?.length ?? 0}</span>${session.previewState ? `<small>${copy.preview}</small>` : ''}</button>`,
    );
  }
  function menu() {
    const box = el('menu');
    box.hidden = !session.menuOpen || !!session.overlay || session.hidden;
    if (box.hidden) return;
    box.dataset.panel = session.panel;
    if (session.panel === 'tasks')
      patch(
        box,
        `<div class="popover-heading"><h2>${copy.tasks}</h2>${button('close-panel', copy.cancel, 'x')}</div><div class="task-line">${icon(goalMet() ? 'check-circle' : 'list-checks')}<span>${stageGoal(session.state.stage)}</span></div><p>${teaching()}</p><div class="actions">${button('hint', copy.hint, 'lightbulb', 'secondary')}${button('guide', copy.guide, 'book-open', 'secondary')}</div>`,
      );
    else
      patch(
        box,
        `<div class="popover-heading"><h2>${copy.resources}</h2>${button('close-panel', copy.cancel, 'x')}</div><dl class="resource-balance"><div><dt>${copy.coinsLeft}</dt><dd>${coinValue(budgets[session.state.stage - 1] - buildCost(session.previewState ?? session.state))}</dd></div><div><dt>${copy.budget}</dt><dd>${coinValue(budgets[session.state.stage - 1])}</dd></div></dl>${session.previewState ? `<p class="muted">${copy.preview}</p>` : ''}<div class="stars">${starList()
          .map((s) => `<span>${icon('star')} ${s}</span>`)
          .join('')}</div>`,
      );
  }
  function coach() {
    const box = el('coach');
    box.hidden =
      session.coachStep < 0 ||
      !session.save.settings.tips ||
      !mapUIVisible() ||
      session.running;
    if (box.hidden) return;
    const labels = [copy.navigation, copy.zoomIn, copy.fit],
      helps = [copy.navigationHelp, copy.navigationHelp, copy.helpFit];
    patch(
      box,
      `<div class="kicker">${labels[session.coachStep]}</div><svg viewBox="0 0 180 100"><circle cx="65" cy="58" r="16"/><path d="M58 90V58a7 7 0 0 1 14 0v19l9-4c8-3 15 3 13 12l-6 8H64Z"/></svg><p>${helps[session.coachStep]}</p>${button('coach-skip', copy.skip, 'x', 'secondary small')}`,
    );
  }
  function advanceCoach(kind: 'pan' | 'zoom' | 'fit') {
    if (session.coachStep < 0 || performance.now() - session.coachBegan < 1800)
      return;
    if (
      (kind === 'pan' && session.coachStep === 0 && session.panTotal >= 24) ||
      (kind === 'zoom' && session.coachStep === 1) ||
      (kind === 'fit' && session.coachStep === 2)
    ) {
      session.coachStep++;
      session.coachBegan = performance.now();
      if (session.coachStep > 2) {
        session.coachStep = -1;
        session.save.coachSeen = true;
        actions.persist();
      }
      coach();
    }
  }
  function labels() {
    const host = el('labels');
    if (!mapUIVisible()) {
      patch(host, '');
      return;
    }
    const step = (session.previewResult ?? session.result).steps[
        session.cursor
      ],
      all = session.previewState ?? session.state;
    const unpowered = all.nodes.filter((n) => step.served[n.id] === false);
    const suppressed = new Set([
      session.hoveredNode,
      session.lineStart,
      session.pending?.type === 'connect' ? session.pending.b : undefined,
    ]);
    const clusters: { x: number; y: number; nodes: typeof unpowered }[] = [];
    for (const node of unpowered) {
      const p = world.project(node.x, node.z, 1.9);
      const cluster = clusters.find(
        (q) => Math.hypot(q.x - p.x, q.y - p.y) < 48,
      );
      if (cluster) cluster.nodes.push(node);
      else clusters.push({ ...p, nodes: [node] });
    }
    const badges = clusters
      .map((cluster) => {
        const label = `${cluster.nodes.map(name).join(', ')} · ${copy.unpowered}`;
        return `<span class="map-badge" style="left:${cluster.x}px;top:${cluster.y}px" aria-label="${label}" title="${label}">${icon('plug')}${cluster.nodes.length > 1 ? `<small>×${cluster.nodes.length}</small>` : ''}</span>`;
      })
      .join('');
    const failed = all.nodes.filter(
      (n) => n.kind === 'transformer' && step.trips.includes('tx:' + n.id),
    );
    const problem = unpowered.find((n) => !suppressed.has(n.id)),
      nodes = [
        ...failed,
        ...all.nodes.filter(
          (n) => n.id === session.selected && !failed.includes(n),
        ),
        ...(problem ? [problem] : []),
      ];
    if (session.save.settings.numbers && session.state.stage >= 3)
      nodes.push(
        ...all.nodes.filter(
          (n) =>
            n.kind !== 'site' && !nodes.includes(n) && !unpowered.includes(n),
        ),
      );
    const placed: { x: number; y: number }[] = [];
    const text = nodes
      .map((n) => {
        if (suppressed.has(n.id)) return '';
        const p = world.project(n.x, n.z, failed.includes(n) ? 3 : 1.9);
        if (placed.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 90))
          return '';
        placed.push(p);
        const value = failed.includes(n)
          ? copy.overloadTransformer
          : n.kind === 'transformer' && session.state.stage >= 3
            ? power(step.requested['tx:' + n.id] ?? 0)
            : n.kind === 'solar'
              ? power(step.solarKW)
              : step.served[n.id] === false
                ? `${name(n)} · ${copy.unpowered}`
                : name(n);
        return `<span class="map-label ${failed.includes(n) || step.served[n.id] === false ? 'error' : ''}" style="left:${p.x}px;top:${p.y}px">${value}</span>`;
      })
      .join('');
    patch(host, badges + text);
  }
  function measureLayout() {
    cancelAnimationFrame(session.layoutFrame);
    session.layoutFrame = requestAnimationFrame(() => {
      const heading = el('goal').getBoundingClientRect(),
        bottom = el('bottom-area').getBoundingClientRect(),
        camera = el('camera-buttons').getBoundingClientRect(),
        landscape = innerHeight < 481 && innerWidth > 600,
        desktop = innerWidth >= 850 && !landscape,
        top = session.hidden ? 12 : heading.bottom + 12,
        left = desktop ? 36 : 12,
        right = session.hidden
          ? innerWidth - 12
          : desktop
            ? innerWidth - 344
            : landscape
              ? bottom.left - 16
              : innerWidth - 12,
        end = session.hidden
          ? innerHeight - 12
          : landscape
            ? camera.top - 12
            : desktop
              ? bottom.top - 12
              : bottom.top - 64;
      if (!desktop && !landscape)
        el('camera-buttons').style.setProperty(
          '--camera-bottom',
          `${innerHeight - bottom.top + 8}px`,
        );
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
      if (session.fitRequested) {
        session.fitRequested = false;
        world.fit();
      }
    });
  }
  return { header, goal, menu, coach, advanceCoach, labels, measureLayout };
}
