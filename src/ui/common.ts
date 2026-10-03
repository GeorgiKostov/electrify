import type { State, Node, Line } from '../game/types';
import { type Command } from '../game/commands';

import {
  goalMet as evaluateGoal,
  stars as evaluateStars,
} from '../content/goals';
import type { World } from '../render/scene';

import { copy, tr, clock } from '../content/copy/en';
import type { Session, Tool } from '../game/session';
export interface GameView {
  app: HTMLElement;
  canvas: HTMLCanvasElement;
  dialog: HTMLDialogElement;
  world: World;
  el: (id: string) => HTMLElement;
}
export interface Actions {
  clearCandidate: () => void;
  clearPreview: () => void;
  stopRun: () => void;
  clearStageInteraction: () => void;
  persist: () => boolean;
  saveNow: () => void;
  setState: (next: State, push?: boolean) => void;
  commit: (command: Command) => void;
  commandGhost: (command: Command, error: string) => void;
  preview: (command: Command) => void;
  context: () => void;
  hover: (point: {
    clientX: number;
    clientY: number;
    pointerType?: string | undefined;
  }) => void;
  closeOverlay: () => void;
  showOverlay: (view: string, remember?: boolean) => void;
  backOverlay: () => void;
  nextStage: () => void;
  enterStage: (stage: number) => void;
  finishCheck: (watched?: boolean) => void;
  startRun: () => void;
  runFrame: (nowMs: number) => void;
  header: () => void;
  goal: () => void;
  tray: () => void;
  refreshPlacement: () => void;
  updateLineConfirm: () => void;
  inspector: () => void;
  timeline: () => void;
  refreshTimelineTime: () => void;
  menu: () => void;
  coach: () => void;
  advanceCoach: (kind: 'fit' | 'pan' | 'zoom') => void;
  refreshWorld: () => void;
  labels: () => void;
  measureLayout: () => void;
  refresh: () => void;
  refreshOverlay: () => void;
  cancelGesture: () => void;
}
export const icon = (name: string) =>
  `<i class="ph ph-${name}" aria-hidden="true"></i>`;
export const coinValue = (value: number | string, suffix = '') =>
  `<span class="coin-value">${icon('coins')}<span>${value}${suffix ? ` <span class="cost-unit">${suffix}</span>` : ''}</span></span>`;
export const button = (
  action: string,
  label: string,
  glyph: string,
  cls = 'icon-btn',
) =>
  `<button class="${cls}" data-action="${action}" aria-label="${label}" title="${label}">${icon(glyph)}${cls.startsWith('icon-btn') ? '' : ` ${label}`}</button>`;
export const toolInfo: Record<Tool, [string, string, number]> = {
  select: [copy.select, 'cursor', 0],
  LV: [copy.lineLV, 'line-segment', 1],
  MV: [copy.lineMV, 'path', 2],
  transformerS: [copy.transformerS, 'arrows-left-right', 3],
  transformerL: [copy.transformerL, 'arrows-horizontal', 5],
  solar: [copy.solar, 'sun', 8],
  batteryQuick: [copy.quick, 'battery-charging', 3],
  batteryLong: [copy.long, 'battery-full', 4],
  move: [copy.move, 'arrows-out-cardinal', 0],
};
export function helpers(session: Session) {
  const time = (v: number) => clock(v, session.save.settings.twelve);
  const now = () =>
    (session.previewResult ?? session.result).steps[session.cursor];
  const lesson = () => (session.save.lessons[session.state.stage] ??= []);
  function mapUIVisible() {
    return !session.overlay && !session.menuOpen && !session.hidden;
  }
  function name(n: Node) {
    const kindNames: Record<Node['kind'], keyof typeof copy> = {
      grid: 'grid',
      site: 'depot',
      transformer: 'transformerS',
      home: 'house',
      cafe: 'cafe',
      workshop: 'workshop',
      solar: 'solar',
      batteryQuick: 'quick',
      batteryLong: 'long',
      ev: 'robotaxi',
    };
    let key = kindNames[n.kind];
    if (n.id === 'farm') key = 'farm';
    if (n.id === 'daycab') key = 'dayRobotaxi';
    if (n.kind === 'transformer' && n.size === 'L') key = 'transformerL';
    let index: string | number | undefined;
    if (n.id.startsWith('street')) index = Number(n.id.slice(6)) + 2;
    else if (n.id.startsWith('hill')) index = Number(n.id.slice(4)) + 14;
    else if (n.id.startsWith('p'))
      index =
        session.state.nodes
          .filter((other) => other.id.startsWith('p') && other.kind === n.kind)
          .findIndex((other) => other.id === n.id) + 1;
    else if (n.id !== 'daycab' && /\d/.test(n.id))
      index = n.id.replace(/\D/g, '');
    return (tr(key) + ' ' + (index ?? '')).trim();
  }
  function lineName(l: Line) {
    return `${l.tier === 'LV' ? copy.lineLV : copy.lineMV} ${l.id.replace(/\D/g, '')}`.trim();
  }
  function selectedObject() {
    return (
      session.state.nodes.find((n) => n.id === session.selected) ||
      session.state.lines.find((l) => l.id === session.selected)
    );
  }
  function goalMet(r = session.previewResult ?? session.result) {
    return evaluateGoal(session.state.stage, r);
  }
  function starList(r = session.previewResult ?? session.result) {
    const names = {
      'Lights on': copy.lights,
      Thrifty: copy.thrifty,
      Clean: copy.clean,
      'No waste': copy.noWaste,
    };
    return evaluateStars(session.state.stage, r).map((star) => names[star]);
  }
  function cover(stage: number) {
    return session.covers.get(stage) ?? '';
  }
  return {
    time,
    now,
    lesson,
    mapUIVisible,
    name,
    lineName,
    selectedObject,
    goalMet,
    starList,
    cover,
  };
}
