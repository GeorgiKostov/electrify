import { patch } from '../ui/dom';
import {
  timelineChart,
  laneRange,
  scheduleTime,
  chartCursor,
} from '../ui/chart';

import { canRun } from '../game/progression';

import { copy, energy } from '../content/copy/en';
import type { Session } from '../game/session';

import { helpers, button, type GameView, type Actions } from '../ui/common';

export function createTimeline(
  session: Session,
  view: GameView,
  actions: Pick<Actions, 'measureLayout'>,
) {
  const { time, lesson, name } = helpers(session);
  const { app, el } = view;
  function timeline() {
    const view = session.previewResult ?? session.result,
      advanced = session.state.stage >= 3,
      expand = session.expanded && advanced;
    app.classList.toggle('timeline-expanded', expand);
    const chart = expand
      ? timelineChart(
          view,
          session.cursor,
          session.save.settings.twelve,
          session.state.stage >= 4,
        )
      : '';
    const schedule =
      expand && session.state.stage >= 5
        ? `<div class="lanes">${session.state.nodes
            .filter(
              (n) =>
                (n.kind === 'ev' && session.state.stage >= 6) ||
                n.kind.startsWith('battery'),
            )
            .map((n) => {
              const range = laneRange(session.state, n),
                start =
                  n.kind === 'ev'
                    ? (session.state.evStarts[n.id] ?? n.window![0])
                    : (session.state.batteries[n.id]?.discharge[0] ?? 68);
              return `<div class="lane compact-lane"><strong>${name(n)}</strong><span class="lane-value">${scheduleTime(start, session.save.settings.twelve)}</span><div class="lane-slider"><input type="range" min="${range.min}" max="${range.max}" step="1" value="${start}" data-lane="${n.id}" aria-label="${copy.start} ${name(n)}" aria-valuetext="${scheduleTime(start, session.save.settings.twelve)}" title="${scheduleTime(range.min, session.save.settings.twelve)} – ${scheduleTime(range.max, session.save.settings.twelve)}"><div class="lane-endpoints"><span>${scheduleTime(range.min, session.save.settings.twelve)}</span><span>${scheduleTime(range.max, session.save.settings.twelve)}</span></div></div></div>`;
            })
            .join('')}</div>`
        : '';
    patch(
      el('timeline'),
      `<div class="timeline-row">${button('run', session.running ? copy.pause : copy.run, session.running ? 'pause' : 'play', session.running ? 'secondary' : 'run')}<span id="clock" class="clock">${time(session.cursor)}</span>${advanced ? `<input id="scrub" type="range" min="0" max="95" value="${session.cursor}" aria-label="${copy.step}"><button class="secondary small" data-action="speed" aria-label="${copy.speed}">${session.speed}×</button>` : ''}${session.state.stage >= 2 ? button('check', copy.check, 'magnifying-glass', 'secondary small') : ''}${advanced ? button('expand', expand ? copy.collapse : copy.expand, expand ? 'caret-down' : 'caret-up', 'icon-btn') : ''}</div>${expand ? `<div class="timeline-detail" data-scroll-key="timeline-detail"><div class="phone-time"><span>${copy.step}</span><input id="phone-scrub" type="range" min="0" max="95" value="${session.cursor}" aria-label="${copy.step}"><button class="secondary small" data-action="speed" aria-label="${copy.speed}">${session.speed}×</button></div>${chart}${schedule}<p class="status">${energy(view.metrics.gridImportKWh)} ${copy.gridImport}</p></div>` : ''}`,
    );
    (
      el('timeline').querySelector('[data-action=run]') as HTMLButtonElement
    ).disabled = !canRun(session.state, lesson());
    actions.measureLayout();
  }
  function refreshTimelineTime() {
    el('clock').textContent = time(session.cursor);
    chartCursor(el('timeline'), session.cursor);
    for (const id of ['scrub', 'phone-scrub']) {
      const scrub = el(id) as HTMLInputElement | null;
      if (scrub) scrub.value = String(session.cursor);
    }
  }
  return { timeline, refreshTimelineTime };
}
