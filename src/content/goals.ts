import type {DayResult} from '../game/types';
import {budgets} from '../game/levels';
export type Star='Lights on'|'Thrifty'|'Clean'|'No waste';
export const starTargets=[
 {thrifty:10},
 {thrifty:42,cleanHeat:.067},
 {thrifty:44},
 {cleanGrid:550.85,noWaste:.001},
 {thrifty:84,cleanGrid:938.9},
 {thrifty:109,cleanGrid:1253.72},
] as const;
export function goalMet(stage:number,r:DayResult){const m=r.metrics;return m.unservedKWh<.001&&m.evShortKWh<.001&&!r.placementErrors.length&&m.buildCost<=budgets[stage-1]&&(stage!==4||m.gridImportKWh<=starTargets[3].cleanGrid)}
export function stars(stage:number,r:DayResult):Star[]{const t:Record<string,number>=starTargets[stage-1],m=r.metrics,out:Star[]=[];if(goalMet(stage,r))out.push('Lights on');if(t.thrifty!==undefined&&m.buildCost<=t.thrifty)out.push('Thrifty');if(t.cleanHeat!==undefined&&m.lostAsHeatKWh<=t.cleanHeat||t.cleanGrid!==undefined&&m.gridImportKWh<=t.cleanGrid)out.push('Clean');if(t.noWaste!==undefined&&m.unusedSolarKWh<=t.noWaste)out.push('No waste');return out}
