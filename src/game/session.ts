import type { State, DayResult } from './types';
import { apply, type Command } from './commands';
import type { Save } from './save';
import { stageFocus } from './levels';
import { learnFromState, type Tool as BuildTool } from './progression';
import { simulate } from '../sim/simulate';
import { MapGesture } from './pointer';
export type Tool = BuildTool | 'select' | 'move';
export interface Session {
  campaignExists: boolean;
  save: Save;
  state: State;
  result: DayResult;
  previewState: State | undefined;
  previewResult: DayResult | undefined;
  cursor: number;
  selected: string | undefined;
  tool: Tool;
  pending: Command | undefined;
  pendingError: string;
  lineStart: string | undefined;
  overlay: string;
  menuOpen: boolean;
  panel: string;
  hidden: boolean;
  expanded: boolean;
  running: boolean;
  speed: number;
  runLast: number;
  runFraction: number;
  coachStep: number;
  coachBegan: number;
  panTotal: number;
  showEarlierTools: boolean;
  layoutFrame: number;
  introStarted: boolean;
  restoreIndex: number | undefined;
  fitRequested: boolean;
  candidate: Command | undefined;
  candidateKey: string;
  candidateError: string;
  candidateCost: number;
  portsState: State | undefined;
  portsTier: string | undefined;
  portsSource: string | undefined;
  menuHistory: string[];
  undo: State[];
  covers: Map<number, string>;
  hoveredNode: string | undefined;
  returnFocus: { action?: string; id?: string } | null;
  gesture: MapGesture;
  spaceHeld: boolean;
  spaceDragged: boolean;
  spaceTarget: HTMLElement | undefined;
  grabOrigin:
    | { node: { x: number; z: number }; point: { x: number; z: number } }
    | undefined;
}
export function createSession(saved: Save, campaign: boolean): Session {
  return {
    campaignExists: campaign,
    save: saved,
    state: saved.state,
    result: simulate(saved.state),
    previewState: undefined,
    previewResult: undefined,
    cursor: stageFocus[saved.state.stage - 1],
    selected: undefined,
    tool: 'select',
    pending: undefined,
    pendingError: '',
    lineStart: undefined,
    overlay: 'home',
    menuOpen: false,
    panel: '',
    hidden: false,
    expanded: false,
    running: false,
    speed: 1,
    runLast: 0,
    runFraction: 0,
    coachStep: -1,
    coachBegan: performance.now(),
    panTotal: 0,
    showEarlierTools: false,
    layoutFrame: 0,
    introStarted: false,
    restoreIndex: undefined,
    fitRequested: true,
    candidate: undefined,
    candidateKey: '',
    candidateError: '',
    candidateCost: 0,
    portsState: undefined,
    portsTier: undefined,
    portsSource: undefined,
    menuHistory: [],
    undo: [],
    covers: new Map<number, string>(),
    hoveredNode: undefined,
    returnFocus: null,
    gesture: new MapGesture(),
    spaceHeld: false,
    spaceDragged: false,
    spaceTarget: undefined,
    grabOrigin: undefined,
  };
}
export function clearHeldPreview(s: Session) {
  s.pending = undefined;
  s.pendingError = '';
  s.previewState = undefined;
  s.previewResult = undefined;
}
export function holdPreview(s: Session, command: Command) {
  s.pending = command;
  const applied = apply(s.state, command, s.save.lessons[s.state.stage] ?? []);
  s.pendingError = applied.error ?? '';
  s.previewState = applied.error ? undefined : applied.state;
  s.previewResult = s.previewState ? simulate(s.previewState) : undefined;
}
export function updateState(s: Session, next: State, push = true) {
  if (push) {
    s.undo.push(structuredClone(s.state));
    if (s.undo.length > 50) s.undo.shift();
  }
  s.state = next;
  s.result = simulate(next);
  clearHeldPreview(s);
  s.save.lessons[next.stage] = learnFromState(
    s.save.lessons[next.stage] ?? [],
    next,
  );
}
