'use strict';
// Deterministic combination of pre-run published test evidence. No model fitting.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),R=require('./bridge_report.js');
const dir=__dirname;
const seedFiles=R.CHALLENGE_SEEDS.map(s=>JSON.parse(fs.readFileSync(path.join(dir,`bridge-challenge-${s}.json`),'utf8')));
const calendar=JSON.parse(fs.readFileSync(path.join(dir,`bridge-calendar-${R.SHIFT_SEEDS[0]}.json`),'utf8'));
const mean=a=>Math.round(a.reduce((s,x)=>s+x,0)/a.length*100)/100;
const business=seedFiles[0].businesses.map((original,i)=>{
 const perSeed=seedFiles.map(f=>f.businesses[i]);
 const summary={};for(const h of [7,30]){
  const v=perSeed.map(b=>b.outcomes[h]);
  summary[h]={oldWape:mean(v.map(x=>x.v13)),unfilteredBridgeWape:mean(v.map(x=>x.v14)),gatedWape:mean(v.map(x=>x.hybrid)),staticWape:mean(v.map(x=>x.simple)),
    winningSeeds:v.filter(x=>x.hybrid<x.v13).length,losingSeeds:v.filter(x=>x.hybrid>x.v13).length,
    perSeed:v.map((x,j)=>({seed:R.CHALLENGE_SEEDS[j],old:x.v13,gated:x.hybrid}))};
 }
 const cal=calendar.businesses[i];
 return {type:original.type,name:original.name,meanSwitchesV13:mean(perSeed.map(b=>b.meanSwitchesV13)),meanSwitchesV14:mean(perSeed.map(b=>b.meanSwitchesV14)),
  scenariosDuringTest:perSeed.map(b=>({seed:b.trials[0].seed,final:b.trials[0].eventsV14.at(-1)?.to||'stable',events:b.trials[0].eventsV14})),
  horizons:summary,calendar:{seed:R.SHIFT_SEEDS[0],asOf:R.SHIFT_DATE,seven:{old:cal.outcomes[7].v13,gated:cal.outcomes[7].hybrid},thirty:{old:cal.outcomes[30].v13,gated:cal.outcomes[30].hybrid}}};
});
const hash=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex');
const report={version:'F2 Transition Bridge 1.4',phase:'FROZEN RESEARCH SHADOW — HOLD',at:'2026-10-13',synthetic:true,authority:'HOLD',
 seedGroups:{development:[...R.DESIGN_SEEDS],challenge:[...R.CHALLENGE_SEEDS],calendarShift:[...R.SHIFT_SEEDS],shiftedAsOf:R.SHIFT_DATE},
 provenance:{v13Hash:hash('transition_engine.js'),bridgeHash:hash('bridge_engine.js'),syntheticGeneratorHash:hash('synthetic.js')},
 algorithm:'Causal indicator + hysteresis/dwell + selective, horizon-specific exposure/refund bridge. Original v1.3 forecast remains frozen as fallback.',
 permission:'NO production routing, credentials, Shopify reads, or model promotion.',
 significance:'Unseen seeds from the SAME synthetic generator family; results do not demonstrate external statistical generalization.',
 businesses:business};
fs.writeFileSync(path.join(dir,'bridge-summary.json'),JSON.stringify(report,null,2)+'\n');
const l=['# Learning Lab v1.4 — Adversarial bridge evaluation','','**SYNTHETIC-ONLY. Production decisions HOLD.**', '',
'Frozen v1.3 dynamic router is the primary comparator. New v1.4 research uses a causal promotion/refund bridge for 7d and observed stockout exposure bridge for 30d. All other horizons are identical to the frozen v1.3 forecast.',
'','| Condition | V1.3 switches | V1.4 switches | 7d v1.3 WAPE | 7d v1.4 WAPE | 30d v1.3 WAPE | 30d v1.4 WAPE |', '|---|---:|---:|---:|---:|---:|---:|',
 ...business.map(b=>`| ${b.name} | ${b.meanSwitchesV13} | ${b.meanSwitchesV14} | ${b.horizons[7].oldWape}% | ${b.horizons[7].gatedWape}% | ${b.horizons[30].oldWape}% | ${b.horizons[30].gatedWape}% |`),'', '## Shifted-calendar challenge','',
 ...business.filter(b=>['promotion','supply','volatile'].includes(b.type)).map(b=>`- ${b.name}: 7d ${b.calendar.seven.old}% → ${b.calendar.seven.gated}%; 30d ${b.calendar.thirty.old}% → ${b.calendar.thirty.gated}%.`),'',
'## Research controls','- Selection: retrospective development seeds 242424/353535; untouched challenge seeds 731111/842222/953333; shifted calendar 365365.','- The previously frozen v1.3 router is never rewritten. A per-horizon gated overlay uses only inferred regime signals and dates, not hidden simulator scenario IDs.','- All output is simulated, always HOLD; no live merchant data or financial decisions are accessed or modified.','- Switching counts are indicator state transitions, not proof of better consumer outcomes.','- A zero change in WAPE is by design: that regime/horizon reuses the prior router.','- The repeated test generator family does NOT establish performance on real sales data.','- Browser-loaded files and downloads are not an immutable audit store.'];
fs.writeFileSync(path.join(dir,'bridge-results.md'),l.join('\n')+'\n');
console.log(JSON.stringify({businesses:business.length,challenges:R.CHALLENGE_SEEDS,calendar:R.SHIFT_DATE,artifact:'bridge-summary.json'}));
