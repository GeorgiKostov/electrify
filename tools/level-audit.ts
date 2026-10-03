import {witnesses} from '../src/content/witnesses';
import {simulate} from '../src/sim/simulate';
import {addGrowth,budgets,initialState,stageTitles} from '../src/game/levels';
import {goalMet,stars,starTargets} from '../src/content/goals';
const states=witnesses();
let report='# Level audit\n\nSix sequential witnesses start from the previous witness state. Stage entries retain the actual player network. The simulator evaluates two identical days and scores day 2.\n\n| Stage | Cost / budget | Unserved kWh | EV short kWh | Grid import kWh | Lost as heat kWh | Unused solar kWh | Stars | Entry requires action |\n|---|---:|---:|---:|---:|---:|---:|---|---|\n';
for(let i=0;i<states.length;i++){
 const entry=i===0?initialState():addGrowth(states[i-1],i+1),before=simulate(entry),after=simulate(states[i]),m=after.metrics,t:Record<string,number>=starTargets[i];
 const checks=[!before.placementErrors.length,!goalMet(i+1,before),goalMet(i+1,after),!after.firstFailure,m.buildCost<=budgets[i],stars(i+1,after).length===(i===0||i===2?2:3)];
 if(t.thrifty!==undefined)checks.push(Math.abs(t.thrifty-Math.ceil(m.buildCost*1.1))<=1);
 if(t.cleanGrid!==undefined)checks.push(Math.abs(t.cleanGrid-m.gridImportKWh*1.1)<.02);
 if(t.cleanHeat!==undefined)checks.push(Math.abs(t.cleanHeat-m.lostAsHeatKWh*1.1)<.001);
 if(t.noWaste!==undefined)checks.push(m.unusedSolarKWh<=t.noWaste);
 if(i===2)checks.push(before.firstFailure?.step===74&&before.firstFailure.code==='OVERLOAD');
 const pass=checks.every(Boolean);if(!pass)process.exitCode=1;
 console.log(`${pass?'PASS':'FAIL'} stage ${i+1} ${stageTitles[i]}: cost ${m.buildCost}/${budgets[i]}, unserved ${m.unservedKWh.toFixed(2)}, EV short ${m.evShortKWh.toFixed(2)}, import ${m.gridImportKWh.toFixed(2)}, stars ${stars(i+1,after).join(', ')}, entry ${before.firstFailure?.code??(i===3?'Clean goal unmet':'none')}`);
 report+=`| ${i+1} ${stageTitles[i]} | ${m.buildCost} / ${budgets[i]} | ${m.unservedKWh.toFixed(2)} | ${m.evShortKWh.toFixed(2)} | ${m.gridImportKWh.toFixed(2)} | ${m.lostAsHeatKWh.toFixed(3)} | ${m.unusedSolarKWh.toFixed(2)} | ${stars(i+1,after).join(', ')} | ${!goalMet(i+1,before)?'yes':'NO'} |\n`;
}
report+='\nTargets use witness metrics with about 10 % slack. Stage 4 also requires its Clean target for completion. Stage 3 entry first trips at step 74 (18:30). Stage 6 passes with staggered overnight sessions and a prewired depot LV fanout. Negative cases for shade, curtailment, battery power and energy limits, wrong section, simultaneous chargers, and grid trip are covered in `tests/core.test.ts`.\n';
if(process.argv.includes('--write')){const fs=await import('node:fs');fs.writeFileSync('docs/LEVEL_AUDIT.md',report)}
