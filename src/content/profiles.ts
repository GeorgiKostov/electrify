export const hourly = {
  household:[.25,.22,.2,.19,.2,.28,.48,.55,.55,.42,.36,.34,.33,.34,.36,.42,.50,.60,.715,1,.93,.90,.46,.32],
  cafe:[.05,.04,.04,.04,.05,.12,.55,.9,1,.78,.65,.82,.95,.82,.65,.55,.4,.25,.15,.1,.08,.06,.05,.05],
  workshop:[0,0,0,0,0,0,.02,.55,.9,1,1,.8,.7,.9,1,1,.8,.35,.05,0,0,0,0,0],
  solar:[0,0,0,0,0,0,.03,.12,.3,.52,.72,.88,1,.95,.82,.62,.38,.16,.04,0,0,0,0,0]
};
export type Profile = keyof typeof hourly;
export function expand(hour:number[]):number[]{ const out:number[]=[]; for(let i=0;i<96;i++){const h=(i/4)|0, f=(i%4)/4; out.push(hour[h]*(1-f)+hour[(h+1)%24]*f)} return out }
export const profiles:Record<Profile,number[]>=Object.fromEntries(Object.entries(hourly).map(([k,v])=>[k,expand(v)])) as Record<Profile,number[]>;
