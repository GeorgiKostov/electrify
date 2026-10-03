import { patch } from '../ui/dom';

import { archivedCampaign, archivedCampaigns } from '../game/save';

import { stars, starTargets } from '../content/goals';

import {
  copy,
  stageGoal,
  stageTitle,
  fieldNote,
  stageHints,
  power,
  diagnosticPower,
  energy,
  voltage,
} from '../content/copy/en';
import type { Session } from '../game/session';

import {
  helpers,
  icon,
  button,
  type GameView,
  type Actions,
} from '../ui/common';

export function createOverlays(
  session: Session,
  view: GameView,
  actions: Pick<
    Actions,
    'refresh' | 'stopRun' | 'cancelGesture' | 'clearPreview'
  >,
) {
  const { time, lesson, name, cover } = helpers(session);
  const { app, dialog, world, el } = view;
  function closeOverlay() {
    const starting = session.overlay === 'home';
    session.overlay = '';
    if (starting && !session.save.coachSeen && !session.introStarted) {
      session.introStarted = true;
      session.coachStep = 0;
      session.coachBegan = performance.now();
      session.panTotal = 0;
    }
    session.menuHistory.length = 0;
    if (dialog.open) dialog.close();
    actions.refresh();
    const focus = session.returnFocus?.action
      ? app.querySelector<HTMLElement>(
          `[data-action="${session.returnFocus.action}"]`,
        )
      : session.returnFocus?.id
        ? document.getElementById(session.returnFocus.id)
        : el('world');
    (focus?.getClientRects().length
      ? focus
      : app.querySelector<HTMLElement>('[data-action="menu"]')?.getClientRects()
            .length
        ? app.querySelector<HTMLElement>('[data-action="menu"]')
        : el('world')
    )?.focus();
    session.returnFocus = null;
  }
  function showOverlay(view: string, remember = true) {
    actions.stopRun();
    session.spaceHeld = false;
    actions.cancelGesture();
    if (!dialog.open) {
      const focused = document.activeElement as HTMLElement;
      session.returnFocus = {
        action: focused.closest('#menu')
          ? session.panel === 'resources'
            ? 'resources'
            : 'tasks'
          : focused.dataset.action,
        id: focused.id,
      };
    } else if (remember && view !== session.overlay)
      session.menuHistory.push(session.overlay);
    session.overlay = view;
    session.menuOpen = false;
    session.panel = '';
    actions.clearPreview();
    actions.refresh();
  }
  function backOverlay() {
    const view = session.menuHistory.pop();
    if (view) {
      session.overlay = view;
      refreshOverlay();
    } else closeOverlay();
  }
  function refreshOverlay() {
    if (!session.overlay) {
      if (dialog.open) dialog.close();
      return;
    }
    let body = '',
      utility = true;
    const archive = archivedCampaign();
    const chrome = `<header class="menu-top"><button class="menu-back" data-action="back" ${session.menuHistory.length ? '' : 'hidden'}>${icon('caret-left')} ${copy.back}</button><span class="menu-wordmark">${copy.title}<span class="wordmark-dot"></span></span>${session.overlay === 'home' ? '' : button('overlay-close', copy.keepPlaying, 'x', 'icon-btn menu-close')}</header>`;

    if (session.overlay === 'home') {
      utility = false;
      body = `<section class="home-view"><p class="menu-eyebrow">${copy.introEyebrow}</p><h1 id="menu-title">${copy.heroFirst}<br>${copy.heroLast}</h1><div class="home-art"><img data-cover="${session.state.stage}" ${cover(session.state.stage) ? `src="${cover(session.state.stage)}" class="cover-ready"` : `hidden`} alt="${stageTitle(session.state.stage)}"></div><div class="home-bottom"><button class="menu-primary" data-action="continue">${icon('play')} ${session.campaignExists ? copy.continuePlaying : copy.startPlaying} ${icon('caret-right')}</button><p class="resume-caption">${copy.savedStage} ${session.state.stage} · ${stageTitle(session.state.stage)}</p><button class="browse-chapters" data-action="stages">${copy.exploreStages} ${icon('squares-four')}</button><footer class="home-footer"><button data-action="guide">${icon('question')} ${copy.howToPlay}</button><button data-action="settings">${copy.settings}</button>${session.campaignExists ? `<button class="campaign-link" data-action="new-campaign">${copy.startOver}</button>` : ''}${archive ? `<button data-action="restore-campaign">${copy.restorePrevious}</button>` : ''}<span>${copy.introHomeFoot}</span></footer></div></section>`;
    } else if (session.overlay === 'stages') {
      utility = false;
      body = `<section class="chapters-view"><p class="menu-eyebrow">${copy.title}</p><h1 id="menu-title">${copy.introStageHero}</h1><p class="menu-subtitle">${copy.introStages}</p><div class="chapter-cards">${Array.from(
        { length: 6 },
        (_, i) => {
          const stage = i + 1,
            done = !!session.save.stars[stage]?.length,
            locked = stage > session.save.unlocked,
            tint = ['peach', 'rose', 'sage', 'sky', 'sand', 'lavender'][i];
          return `<button class="chapter-card" data-stage="${stage}" ${locked ? 'disabled' : ''} style="--chapter-tint:var(--pp-${tint})"><div class="chapter-card-art"><span class="chapter-number">${String(stage).padStart(2, '0')}</span><img data-cover="${stage}" ${cover(stage) ? `src="${cover(stage)}" class="cover-ready"` : `hidden`} alt="">${done ? `<span class="chapter-complete">${icon('check-circle')} ${copy.complete}</span>` : ''}</div><div class="chapter-card-copy"><h2>${stageTitle(stage)}</h2><p>${stageGoal(stage)}</p><div class="chapter-card-progress"><span>${locked ? `${copy.locked} · ${copy.stageLabel} ${stage - 1}` : done ? `${icon('star')} ${session.save.stars[stage].length}` : session.save.states[stage]?.lines.some((l) => !l.locked) ? copy.inProgress : copy.notStarted}</span>${icon(locked ? 'lock-key' : 'caret-right')}</div><div class="chapter-track"><span style="width:${done ? 100 : 0}%"></span></div></div></button>`;
        },
      ).join('')}</div></section>`;
    } else if (session.overlay === 'pause')
      body = `<h1 id="menu-title">${stageTitle(session.state.stage)}</h1><p class="menu-subtitle">${copy.stageLabel} ${session.state.stage} · ${stageGoal(session.state.stage)}</p><div class="menu-options">${button('continue', copy.keepPlaying, 'play', 'secondary')}${button('stages', copy.stages, 'squares-four', 'secondary')}${button('restart', copy.restart, 'arrow-counter-clockwise', 'secondary')}${button('guide', copy.howToPlay, 'question', 'secondary')}${button('settings', copy.settings, 'gear', 'secondary')}${button('hide', copy.hide, 'eye-slash', 'secondary')}${button('home', copy.home, 'door-open', 'secondary')}</div>`;
    else if (session.overlay === 'settings')
      body = `<h1 id="menu-title">${copy.settings}</h1><p class="menu-subtitle">${copy.introSettings}</p><div class="layer-options"><label>${copy.reducedMotion}<input type="checkbox" data-setting="reduced" ${session.save.settings.reduced ? 'checked' : ''}></label>${session.state.stage >= 3 ? `<label>${copy.numbers}<input type="checkbox" data-setting="numbers" ${session.save.settings.numbers ? 'checked' : ''}></label>` : ''}<label>${copy.tipsToggle}<input type="checkbox" data-setting="tips" ${session.save.settings.tips ? 'checked' : ''}></label><label>${copy.settingsRegion}<select data-setting="region"><option value="eu" ${session.save.settings.region === 'eu' ? 'selected' : ''}>${copy.regionEurope}</option><option value="na" ${session.save.settings.region === 'na' ? 'selected' : ''}>${copy.regionAmerica}</option></select></label><label>${copy.clock12}<input type="checkbox" data-setting="twelve" ${session.save.settings.twelve ? 'checked' : ''}></label></div><p>${copy.introSaved}</p><details><summary>${copy.settingsRegion}</summary><p>${voltage('LV', session.save.settings.region)} · ${voltage('MV', session.save.settings.region)}</p></details>`;
    else if (session.overlay === 'restore-campaign')
      body = `<h1 id="menu-title">${copy.restoreCampaign}</h1><p>${copy.introRestore}</p><div class="menu-options">${archivedCampaigns()
        .map(
          (campaign, index) =>
            `<button class="secondary" data-restore="${index}">${copy.savedStage} ${campaign.state.stage} · ${stageTitle(campaign.state.stage)} ${icon('caret-right')}</button>`,
        )
        .join('')}</div>`;
    else if (
      session.overlay === 'new-campaign' ||
      session.overlay === 'confirm-restore'
    )
      body = `<h1 id="menu-title">${session.overlay === 'new-campaign' ? copy.newCampaign : copy.restoreCampaign}</h1><p>${session.overlay === 'new-campaign' ? copy.introNewCampaign : copy.introRestore}</p><div class="completion-actions">${button(session.overlay === 'new-campaign' ? 'confirm-new' : 'confirm-restore', session.overlay === 'new-campaign' ? copy.startOver : copy.restorePrevious, 'arrow-counter-clockwise', 'menu-primary')}${button('back', copy.back, 'caret-left', 'browse-chapters')}</div>`;
    else if (session.overlay === 'complete') {
      const earned = stars(session.state.stage, session.result);
      const targets: Record<string, number> =
        starTargets[session.state.stage - 1];
      const all = [
        { key: 'Lights on', label: copy.lights, available: true },
        {
          key: 'Thrifty',
          label: copy.thrifty,
          available: targets.thrifty !== undefined,
        },
        {
          key: 'Clean',
          label: copy.clean,
          available:
            targets.cleanHeat !== undefined || targets.cleanGrid !== undefined,
        },
        {
          key: 'No waste',
          label: copy.noWaste,
          available: targets.noWaste !== undefined,
        },
      ];
      body = `<p class="menu-eyebrow">${stageTitle(session.state.stage)}</p><h1 id="menu-title">${copy.checkGood}</h1><div class="completion-stars">${all
        .map((star, i) => {
          const won = earned.includes(star.key as (typeof earned)[number]);
          return `<div class="completion-star ${won ? 'earned' : ''} ${star.available ? '' : 'unavailable'}" style="--star-delay:${i * 100}ms"><i class="${won ? 'ph-fill' : 'ph'} ph-star" aria-hidden="true"></i><span>${star.label}</span><small>${won ? copy.earnedStar : star.available ? copy.missedStar : copy.otherStageStar}</small></div>`;
        })
        .join(
          '',
        )}</div><div class="help-tools"><p>${fieldNote(session.state.stage)}</p></div><div class="completion-actions">${button('next', session.state.stage === 6 ? copy.home : copy.next, 'caret-right', 'menu-primary')}${button('restart', copy.replay, 'clock-counter-clockwise', 'browse-chapters')}</div>`;
    } else if (session.overlay === 'diagnosis') {
      const d = session.result.firstFailure,
        solarGoal =
          session.state.stage === 4 &&
          !d &&
          session.result.metrics.gridImportKWh > starTargets[3].cleanGrid,
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
        object = session.state.nodes.find((n) => n.id === component),
        detail = solarGoal
          ? `${energy(session.result.metrics.gridImportKWh)} ${copy.gridImport} / ${energy(starTargets[3].cleanGrid)}`
          : d?.code === 'UNCONNECTED'
            ? `${object ? name(object) : component} · ${copy.notConnected}`
            : d?.code === 'OVERLOAD' || d?.code === 'GRID_LIMIT'
              ? `${time(d.step)} · ${diagnosticPower(d.flowKW ?? 0)} / ${power(d.capacityKW ?? 0)}`
              : copy.checkBad,
        ideas =
          session.state.stage === 5 &&
          lesson().includes('quick-observed') &&
          !session.state.nodes.some((n) => n.kind === 'batteryLong')
            ? [copy.lesson5Long]
            : solarGoal
              ? [copy.trySolar]
              : d?.code === 'UNCONNECTED'
                ? [copy.tryLine]
                : session.state.stage === 6
                  ? [copy.tryCab, copy.tryLate]
                  : session.state.stage === 5
                    ? [copy.tryBattery, copy.trySchedule]
                    : [copy.tryBigger, copy.trySplit];
      body = `<h1 id="menu-title">${title}</h1><p>${detail}</p><div class="help-tools">${ideas.map((idea) => `<p>${idea}</p>`).join('')}</div><div class="completion-actions">${button('fix', copy.fix, 'wrench', 'menu-primary')}</div>`;
    } else if (session.overlay === 'guide' || session.overlay === 'tips')
      body = `<h1 id="menu-title">${copy.howToPlay}</h1><p>${copy.navigationHelp}</p><div class="help-tools"><p>${copy.helpFit}</p><p>${copy.helpConnection}</p><p>${copy.helpPlacement}</p><p>${copy.helpKeys}</p>${session.state.stage >= 3 ? `<p>${copy.helpTiming}</p>` : ''}</div><details><summary>${copy.fieldNotes}</summary>${Object.keys(
        session.save.stars,
      )
        .map(Number)
        .sort()
        .map(
          (stage) => `<h2>${stageTitle(stage)}</h2><p>${fieldNote(stage)}</p>`,
        )
        .join(
          '',
        )}</details>${button('practice', copy.practice, 'hand-pointing', 'browse-chapters')}`;
    else if (session.overlay === 'hint')
      body = `<h1 id="menu-title">${copy.hint}</h1><p>${stageHints[session.state.stage - 1]}</p>`;
    else if (session.overlay === 'watch')
      body = `<h1 id="menu-title">${copy.watchFirst}</h1><div class="completion-actions">${button('run', copy.run, 'play', 'menu-primary')}</div>`;

    const previousFocus = document.activeElement as HTMLInputElement,
      focusKey = previousFocus?.dataset.setting,
      opening = !dialog.open,
      changing = dialog.dataset.view !== session.overlay;
    dialog.dataset.view = session.overlay;
    patch(
      dialog,
      chrome +
        (utility ? `<section class="utility-view">${body}</section>` : body),
    );
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
  return { closeOverlay, showOverlay, backOverlay, refreshOverlay };
}
