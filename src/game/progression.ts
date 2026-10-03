import type { State, DayResult } from './types';
import type { Command } from './commands';
export type Tool =
  | 'LV'
  | 'MV'
  | 'transformerS'
  | 'transformerL'
  | 'solar'
  | 'batteryQuick'
  | 'batteryLong';
export type Milestone =
  | 'line-connected'
  | 'transformer-placed'
  | 'mv-connected'
  | 'quick-placed'
  | 'quick-connected'
  | 'quick-observed';
export type Lesson = Milestone[];
export function inferLesson(state: State): Lesson {
  const lesson: Lesson = [];
  if (state.lines.some((l) => !l.locked && l.tier === 'LV'))
    lesson.push('line-connected');
  if (state.nodes.some((n) => !n.locked && n.kind === 'transformer'))
    lesson.push('transformer-placed');
  if (state.lines.some((l) => !l.locked && l.tier === 'MV'))
    lesson.push('mv-connected');
  const quick = state.nodes.filter((n) => n.kind === 'batteryQuick');
  if (quick.length) lesson.push('quick-placed');
  if (quick.some((n) => state.lines.some((l) => l.a === n.id || l.b === n.id)))
    lesson.push('quick-connected');
  return lesson;
}
export function toolsFor(
  state: State,
  lesson: Lesson = inferLesson(state),
): Tool[] {
  const tools: Tool[] = ['LV'];
  if (state.stage >= 2) tools.push('transformerS');
  if (
    state.stage >= 3 ||
    (state.stage === 2 && lesson.includes('transformer-placed'))
  )
    tools.push('MV');
  if (state.stage >= 3) tools.push('transformerL');
  if (state.stage >= 4) tools.push('solar');
  if (state.stage >= 5) tools.push('batteryQuick');
  if (
    state.stage >= 6 ||
    (state.stage === 5 && lesson.includes('quick-observed'))
  )
    tools.push('batteryLong');
  return tools;
}
export function commandAllowed(
  state: State,
  command: Command,
  lesson: Lesson,
): boolean {
  const tools = toolsFor(state, lesson);
  if (command.type === 'connect') return tools.includes(command.tier);
  if (command.type === 'place')
    return tools.includes(
      command.kind === 'transformer'
        ? command.size === 'L'
          ? 'transformerL'
          : 'transformerS'
        : (command.kind as Tool),
    );
  if (command.type === 'upgrade') return tools.includes('transformerL');
  if (command.type === 'battery') return state.stage >= 5;
  if (command.type === 'ev') return state.stage >= 6;
  return true;
}
export function learnFromState(lesson: Lesson, state: State): Lesson {
  return [...new Set([...lesson, ...inferLesson(state)])];
}
export function learnFromDay(
  lesson: Lesson,
  state: State,
  result: DayResult,
): Lesson {
  const connected = state.nodes.some(
    (n) =>
      n.kind === 'batteryQuick' &&
      state.lines.some((l) => l.a === n.id || l.b === n.id),
  );
  return state.stage === 5 &&
    connected &&
    lesson.includes('quick-connected') &&
    result.steps.length === 96
    ? [...new Set([...lesson, 'quick-observed' as Milestone])]
    : lesson;
}
export function canRun(state: State, lesson: Lesson): boolean {
  return state.stage > 1 || lesson.includes('line-connected');
}
export function focusTools(state: State, lesson: Lesson): Tool[] {
  if (state.stage === 1) return ['LV'];
  if (state.stage === 2) {
    const transformers = state.nodes.filter(
      (n) => !n.locked && n.kind === 'transformer',
    );
    return !transformers.length
      ? ['transformerS']
      : !transformers.some((n) =>
            state.lines.some(
              (l) => l.tier === 'MV' && (l.a === n.id || l.b === n.id),
            ),
          )
        ? ['MV']
        : ['LV'];
  }
  if (state.stage === 3) return ['transformerL'];
  if (state.stage === 4) return ['solar', 'transformerL', 'MV', 'LV'];
  if (state.stage === 5) {
    const quick = state.nodes.find((n) => n.kind === 'batteryQuick');
    return !quick
      ? ['batteryQuick']
      : lesson.includes('quick-observed')
        ? ['batteryLong', 'batteryQuick', 'LV']
        : ['LV', 'batteryQuick'];
  }
  return ['transformerL', 'MV'];
}
